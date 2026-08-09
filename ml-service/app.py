"""
Conservation Risk Score — ML Microservice

Stateless compute service. Receives data from the Node backend and returns
computed ML results. No database access here — Node owns the data layer,
this service only does the math.

Run: python app.py   (defaults to port 5001)
"""

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.linear_model import LinearRegression
from sklearn.cluster import DBSCAN
from sklearn.ensemble import IsolationForest
import numpy as np
from itertools import combinations
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

PORT = int(os.environ.get('PORT', 5001))

STATUS_WEIGHTS = {
    'LC': 0.0, 'NT': 0.2, 'VU': 0.4, 'EN': 0.7, 'CR': 1.0, 'EW': 1.0, 'EX': 1.0,
}

SEVERITY_WEIGHTS = {'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 5}

WEIGHTS = {'status': 0.5, 'trend': 0.3, 'incident': 0.2}


def compute_trend_score(monthly_counts):
    counts = np.array(monthly_counts, dtype=float)
    if np.count_nonzero(counts) < 2:
        return 0.0, None

    X = np.arange(len(counts)).reshape(-1, 1)
    model = LinearRegression()
    model.fit(X, counts)
    slope = model.coef_[0]

    mean_count = counts.mean()
    if mean_count == 0:
        return 0.0, slope

    normalized_slope = slope / (mean_count + 1e-6)
    trend_score = max(0.0, min(1.0, -normalized_slope))
    return trend_score, slope


def compute_incident_score(incident_pressure):
    return max(0.0, min(1.0, incident_pressure / 10.0))


def classify_risk_level(score):
    if score >= 0.7:
        return 'Critical'
    if score >= 0.5:
        return 'High'
    if score >= 0.25:
        return 'Medium'
    return 'Low'


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})


@app.route('/risk-score', methods=['POST'])
def risk_score():
    body = request.get_json(force=True)
    species_list = body.get('species', [])

    if not isinstance(species_list, list):
        return jsonify({'success': False, 'message': 'Expected "species" to be a list.'}), 400

    results = []
    for entry in species_list:
        conservation_status = entry.get('conservationStatus', 'LC')
        monthly_counts = entry.get('monthlySightings', [])
        incident_pressure = entry.get('incidentPressure', 0)

        status_score = STATUS_WEIGHTS.get(conservation_status, 0.0)
        trend_score, slope = compute_trend_score(monthly_counts)
        incident_score = compute_incident_score(incident_pressure)

        composite = (
            WEIGHTS['status'] * status_score
            + WEIGHTS['trend'] * trend_score
            + WEIGHTS['incident'] * incident_score
        )
        composite = max(0.0, min(1.0, composite))

        results.append({
            'speciesId': entry.get('speciesId'),
            'riskScore': round(composite * 100, 1),
            'riskLevel': classify_risk_level(composite),
            'breakdown': {
                'statusScore': round(status_score * 100, 1),
                'trendScore': round(trend_score * 100, 1),
                'incidentScore': round(incident_score * 100, 1),
                'sightingTrendSlope': round(float(slope), 3) if slope is not None else None,
            },
        })

    results.sort(key=lambda r: r['riskScore'], reverse=True)
    return jsonify({'success': True, 'data': {'scores': results}})


@app.route('/cluster-hotspots', methods=['POST'])
def cluster_hotspots():
    body = request.get_json(force=True)
    sightings = body.get('sightings', [])

    eps = float(body.get('eps', 0.01))
    min_samples = int(body.get('minSamples', 3))

    if not sightings:
        return jsonify({'success': True, 'data': {'clusters': [], 'noiseCount': 0}})

    coords = np.array([[s['latitude'], s['longitude']] for s in sightings])
    labels = DBSCAN(eps=eps, min_samples=min_samples, metric='euclidean').fit_predict(coords)

    clusters = {}
    noise_count = 0

    for sighting, label in zip(sightings, labels):
        if label == -1:
            noise_count += 1
            continue
        if label not in clusters:
            clusters[label] = {'points': [], 'species_counts': {}}
        clusters[label]['points'].append(sighting)
        species_name = sighting.get('commonName', 'Unknown')
        clusters[label]['species_counts'][species_name] = (
            clusters[label]['species_counts'].get(species_name, 0) + 1
        )

    result_clusters = []
    for label, cluster in clusters.items():
        pts = np.array([[p['latitude'], p['longitude']] for p in cluster['points']])
        center_lat, center_lng = pts.mean(axis=0)
        distances_deg = np.sqrt(((pts - [center_lat, center_lng]) ** 2).sum(axis=1))
        radius_meters = float(distances_deg.max() * 111000) if len(pts) > 1 else 50.0
        top_species = sorted(cluster['species_counts'].items(), key=lambda x: x[1], reverse=True)

        result_clusters.append({
            'clusterId': int(label),
            'centerLat': float(center_lat),
            'centerLng': float(center_lng),
            'pointCount': len(cluster['points']),
            'radiusMeters': round(radius_meters, 1),
            'topSpecies': [{'name': n, 'count': c} for n, c in top_species[:3]],
        })

    result_clusters.sort(key=lambda c: c['pointCount'], reverse=True)
    return jsonify({'success': True, 'data': {'clusters': result_clusters, 'noiseCount': noise_count}})


@app.route('/detect-anomalies', methods=['POST'])
def detect_anomalies():
    body = request.get_json(force=True)
    weekly_data = body.get('weeks', [])

    if len(weekly_data) < 4:
        return jsonify({
            'success': True,
            'data': {'weeks': [], 'message': 'Not enough incident history yet (need at least 4 weeks of data).'},
        })

    features = np.array([[w['count'], w['severityWeight']] for w in weekly_data], dtype=float)
    mean_count = float(features[:, 0].mean())
    mean_severity = float(features[:, 1].mean())

    model = IsolationForest(contamination=0.15, random_state=42)
    labels = model.fit_predict(features)
    scores = model.decision_function(features)

    results = []
    for week, label, score in zip(weekly_data, labels, scores):
        count_vs_avg_pct = round(((week['count'] - mean_count) / mean_count) * 100, 1) if mean_count > 0 else 0.0
        severity_vs_avg_pct = (
            round(((week['severityWeight'] - mean_severity) / mean_severity) * 100, 1)
            if mean_severity > 0 else 0.0
        )
        results.append({
            'weekLabel': week['weekLabel'],
            'weekStart': week.get('weekStart'),
            'weekEnd': week.get('weekEnd'),
            'count': week['count'],
            'severityWeight': week['severityWeight'],
            'isAnomaly': bool(label == -1),
            'anomalyScore': round(float(score), 3),
            'countVsAveragePct': count_vs_avg_pct,
            'severityVsAveragePct': severity_vs_avg_pct,
        })

    return jsonify({
        'success': True,
        'data': {'weeks': results, 'meanCount': round(mean_count, 1), 'meanSeverityWeight': round(mean_severity, 1)},
    })


@app.route('/forecast-trend', methods=['POST'])
def forecast_trend():
    body = request.get_json(force=True)
    monthly_counts = body.get('monthlyCounts', [])
    periods = int(body.get('periods', 3))

    counts = np.array(monthly_counts, dtype=float)

    if np.count_nonzero(counts) < 3:
        return jsonify({
            'success': True,
            'data': {'projected': [], 'message': 'Not enough sighting history yet to forecast a trend.'},
        })

    X = np.arange(len(counts)).reshape(-1, 1)
    model = LinearRegression()
    model.fit(X, counts)

    predictions_on_history = model.predict(X)
    residual_std = float(np.std(counts - predictions_on_history))

    future_X = np.arange(len(counts), len(counts) + periods).reshape(-1, 1)
    future_predictions = model.predict(future_X)

    projected = []
    for i, pred in enumerate(future_predictions):
        pred_clamped = max(0.0, float(pred))
        projected.append({
            'monthsAhead': i + 1,
            'predictedCount': round(pred_clamped, 1),
            'lowerBound': round(max(0.0, pred_clamped - 1.96 * residual_std), 1),
            'upperBound': round(pred_clamped + 1.96 * residual_std, 1),
        })

    return jsonify({
        'success': True,
        'data': {'projected': projected, 'slope': round(float(model.coef_[0]), 3), 'residualStdDev': round(residual_std, 2)},
    })


@app.route('/species-cooccurrence', methods=['POST'])
def species_cooccurrence():
    body = request.get_json(force=True)
    daily_species_lists = body.get('dailySpeciesLists', [])
    min_co_occurrences = int(body.get('minCoOccurrences', 3))

    total_days = len(daily_species_lists)
    if total_days == 0:
        return jsonify({'success': True, 'data': {'pairs': [], 'totalDays': 0}})

    species_day_counts = {}
    pair_day_counts = {}

    for species_on_day in daily_species_lists:
        unique_species = sorted(set(species_on_day))

        for sp in unique_species:
            species_day_counts[sp] = species_day_counts.get(sp, 0) + 1

        for sp_a, sp_b in combinations(unique_species, 2):
            key = (sp_a, sp_b)
            pair_day_counts[key] = pair_day_counts.get(key, 0) + 1

    results = []
    for (sp_a, sp_b), co_days in pair_day_counts.items():
        if co_days < min_co_occurrences:
            continue

        p_a = species_day_counts[sp_a] / total_days
        p_b = species_day_counts[sp_b] / total_days
        p_ab = co_days / total_days

        lift = p_ab / (p_a * p_b) if (p_a > 0 and p_b > 0) else 0.0

        results.append({
            'speciesA': sp_a,
            'speciesB': sp_b,
            'coOccurrenceDays': co_days,
            'daysSeenA': species_day_counts[sp_a],
            'daysSeenB': species_day_counts[sp_b],
            'lift': round(lift, 2),
        })

    results.sort(key=lambda r: r['lift'], reverse=True)
    return jsonify({'success': True, 'data': {'pairs': results[:15], 'totalDays': total_days}})


# ═══════════════════════════════════════════════════════════════════════════
# SIGHTING VERIFICATION PRIORITY SCORING
#
# What this does:
#   Scores each PENDING (unverified) sighting on how much it deserves a
#   close look before an admin approves it — as opposed to treating every
#   pending sighting identically (which is what blind bulk-approval does).
#
# Why this is a weighted composite, NOT a black-box model like Isolation
# Forest (deliberate methodology choice, worth stating explicitly when
# presenting this):
#   The other anomaly-detection features here (incident weeks) are
#   exploratory — a researcher looks at a chart and investigates further.
#   This one gates a real ADMIN DECISION (approve/reject a data record).
#   An admin needs to trust WHY something was flagged before acting on it,
#   not just see a black-box score. A transparent weighted sum, where every
#   component can be shown and explained, is the more honest tool here —
#   same reasoning already applied to the Conservation Risk Score.
#
# Four signals, each 0-1 before weighting:
#   1. Species rarity   — a claimed sighting of a rare/endangered species
#                          deserves more scrutiny than a common one, since
#                          getting it wrong matters more
#   2. Location anomaly — how far this sighting's coordinates are from
#                          where this species has historically, verifiably
#                          been seen (using already-VERIFIED sightings only
#                          as the reference, so unverified noise doesn't
#                          contaminate the baseline)
#   3. Count anomaly    — how far the reported count deviates from that
#                          species' historical average count per sighting
#   4. Reporter risk    — inverse of the reporting ranger's historical
#                          verification rate (if most of their past
#                          sightings never got verified, or were disputed,
#                          weight new ones from them slightly higher)
# ═══════════════════════════════════════════════════════════════════════════

VERIFICATION_WEIGHTS = {'rarity': 0.3, 'location': 0.3, 'count': 0.2, 'reporter': 0.2}


@app.route('/score-verification-priority', methods=['POST'])
def score_verification_priority():
    body = request.get_json(force=True)
    pending = body.get('sightings', [])

    if not pending:
        return jsonify({'success': True, 'data': {'scores': []}})

    results = []
    for s in pending:
        rarity_score = STATUS_WEIGHTS.get(s.get('conservationStatus', 'LC'), 0.0)

        # Location anomaly: distance in km from this species' historical
        # verified-sighting centroid, normalized against a "this is far"
        # reference of 10km (roughly a third of the park's width) — a
        # simple, presentable normalization rather than a learned one.
        distance_km = s.get('distanceFromSpeciesCentroidKm')
        if distance_km is None:
            location_score = 0.0  # no history to compare against yet — not "safe," just no signal
        else:
            location_score = max(0.0, min(1.0, distance_km / 10.0))

        # Count anomaly: relative deviation from this species' historical
        # average count-per-sighting
        historical_avg = s.get('speciesHistoricalAvgCount')
        reported_count = s.get('count', 1)
        if not historical_avg or historical_avg == 0:
            count_score = 0.0
        else:
            count_score = max(0.0, min(1.0, abs(reported_count - historical_avg) / historical_avg))

        # Reporter risk: inverse of their historical verification rate.
        # A brand-new reporter with no history yet gets a neutral 0.5 —
        # not flagged as risky, but not given a clean pass either.
        verification_rate = s.get('reporterVerificationRate')
        reporter_score = 0.5 if verification_rate is None else max(0.0, min(1.0, 1.0 - verification_rate))

        composite = (
            VERIFICATION_WEIGHTS['rarity'] * rarity_score
            + VERIFICATION_WEIGHTS['location'] * location_score
            + VERIFICATION_WEIGHTS['count'] * count_score
            + VERIFICATION_WEIGHTS['reporter'] * reporter_score
        )
        composite = max(0.0, min(1.0, composite))

        results.append({
            'sightingId': s.get('sightingId'),
            'priorityScore': round(composite * 100, 1),
            'priorityLevel': classify_risk_level(composite),  # reuses Low/Medium/High/Critical bands
            'breakdown': {
                'raritySignal': round(rarity_score * 100, 1),
                'locationSignal': round(location_score * 100, 1),
                'countSignal': round(count_score * 100, 1),
                'reporterSignal': round(reporter_score * 100, 1),
                'distanceFromSpeciesCentroidKm': round(distance_km, 2) if distance_km is not None else None,
            },
        })

    results.sort(key=lambda r: r['priorityScore'], reverse=True)
    return jsonify({'success': True, 'data': {'scores': results}})


# ═══════════════════════════════════════════════════════════════════════════
# USER ACTIVITY ANOMALY DETECTION
#
# What this does:
#   For each ranger/researcher, checks whether their MOST RECENT week of
#   activity looks unusual COMPARED TO THEIR OWN HISTORY — not compared to
#   other users. This distinction matters: different rangers naturally
#   submit very different volumes, so comparing raw counts across users
#   would just flag "whoever submits the most" as anomalous, which is
#   meaningless. Comparing each person only to their OWN baseline is the
#   correct framing for "did something change for this person."
#
# Why plain z-scores here, not another sklearn model (worth saying this
# out loud — it demonstrates knowing when NOT to reach for a heavier tool):
#   With only a handful of weeks of history per user, there isn't enough
#   data for a model like Isolation Forest to learn anything meaningful
#   per-person. A z-score — how many standard deviations the latest week
#   is from that person's own mean — is simple, fully interpretable
#   ("this week was 2.4 standard deviations above their usual"), and is
#   the statistically appropriate tool for this specific, smaller-data
#   situation. Not every "AI feature" needs to be a trained model.
# ═══════════════════════════════════════════════════════════════════════════

@app.route('/detect-user-activity-anomalies', methods=['POST'])
def detect_user_activity_anomalies():
    body = request.get_json(force=True)
    users = body.get('users', [])

    results = []
    for u in users:
        weekly_counts = np.array(u.get('weeklyCounts', []), dtype=float)

        if len(weekly_counts) < 3:
            results.append({
                'userId': u.get('userId'),
                'latestWeekCount': int(weekly_counts[-1]) if len(weekly_counts) else 0,
                'zScore': None,
                'isAnomaly': False,
                'message': 'Not enough history yet',
            })
            continue

        # Baseline = all weeks EXCEPT the most recent one, so the most
        # recent week is being compared against what came before it, not
        # partly against itself
        history = weekly_counts[:-1]
        latest = weekly_counts[-1]

        mean = float(history.mean())
        std = float(history.std())

        if std == 0:
            # Perfectly consistent history (e.g. always exactly 3/week) —
            # any deviation at all is meaningful, but a z-score would
            # divide by zero, so flag directly instead
            z_score = None
            is_anomaly = latest != mean
        else:
            z_score = (latest - mean) / std
            is_anomaly = abs(z_score) >= 2.0  # ~95% threshold under a normal-distribution assumption

        results.append({
            'userId': u.get('userId'),
            'latestWeekCount': int(latest),
            'historicalMean': round(mean, 1),
            'zScore': round(float(z_score), 2) if z_score is not None else None,
            'isAnomaly': bool(is_anomaly),
            'direction': 'spike' if (z_score or 0) > 0 else 'drop' if (z_score or 0) < 0 else None,
        })

    results.sort(key=lambda r: abs(r['zScore']) if r['zScore'] is not None else -1, reverse=True)
    return jsonify({'success': True, 'data': {'users': results}})


if __name__ == '__main__':
    is_dev = os.environ.get('FLASK_ENV', 'production') == 'development'
    print(f'Conservation ML service running on port {PORT}')
    app.run(host='0.0.0.0', port=PORT, debug=is_dev)