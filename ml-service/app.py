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


# ═══════════════════════════════════════════════════════════════════════════
# POPULATION TREND FORECASTING
#
# What this does:
#   Takes the last 12 months of total sighting counts and projects forward
#   a few months using linear regression — the same technique used for the
#   trend component of the risk score, but here the OUTPUT is the actual
#   forecast itself (a number for future months), not just a direction.
#
# Why a confidence band, and why it's naive (say this out loud when
# presenting — it's honest, and honesty about a model's limits is itself
# a sign of understanding it, not a weakness):
#   The band here is built from the standard deviation of the regression's
#   RESIDUALS (how far actual points were from the fitted line) on the
#   historical data, projected forward as a constant ±1.96 std-dev range
#   (~95% under a normal-distribution assumption). This is a simple,
#   defensible approach for a small dataset, but it assumes:
#     - The trend stays linear (a real population could plateau, spike
#       seasonally, or reverse — this model has no way to know that)
#     - Variance stays constant over time (uncertainty doesn't actually
#       grow the further out you forecast, which is unrealistic — a real
#       production system would widen the band the further into the
#       future it projects)
#   With only 12 months of data, this is a reasonable first pass, not a
#   claim of precise future population numbers.
# ═══════════════════════════════════════════════════════════════════════════

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

    # Residual std dev — how much actual points deviated from the fitted
    # line historically — used as a (constant, simplified) uncertainty band
    predictions_on_history = model.predict(X)
    residual_std = float(np.std(counts - predictions_on_history))

    future_X = np.arange(len(counts), len(counts) + periods).reshape(-1, 1)
    future_predictions = model.predict(future_X)

    projected = []
    for i, pred in enumerate(future_predictions):
        pred_clamped = max(0.0, float(pred))  # sightings can't be negative
        projected.append({
            'monthsAhead': i + 1,
            'predictedCount': round(pred_clamped, 1),
            'lowerBound': round(max(0.0, pred_clamped - 1.96 * residual_std), 1),
            'upperBound': round(pred_clamped + 1.96 * residual_std, 1),
        })

    return jsonify({
        'success': True,
        'data': {
            'projected': projected,
            'slope': round(float(model.coef_[0]), 3),
            'residualStdDev': round(residual_std, 2),
        },
    })


# ═══════════════════════════════════════════════════════════════════════════
# SPECIES CO-OCCURRENCE ANALYSIS
#
# What this does:
#   Finds pairs of species that tend to be sighted together (same day,
#   somewhere in the park) more often than you'd expect by pure chance.
#
# Why "lift" and not just a raw co-occurrence count:
#   A naive count is misleading. Two very COMMON species (say, seen most
#   days regardless of anything) will rack up a high raw co-occurrence
#   count simply because they're both around all the time — not because
#   there's any real relationship between them. This is the same
#   confounding problem as the hotspot clustering with uniform random
#   data: raw numbers can look meaningful when they're really just an
#   artifact of frequency.
#
#   "Lift" (a standard concept from association rule mining — the same
#   math behind "customers who bought X also bought Y" engines) corrects
#   for this:
#
#       lift(A, B) = P(A and B together) / (P(A) * P(B))
#
#   lift = 1   → A and B co-occur exactly as often as random chance predicts
#   lift > 1   → they co-occur MORE than chance — a real association
#   lift < 1   → they co-occur LESS than chance — they may avoid each other
#
#   A lift of 3.0 means "these two species are seen together 3x more
#   often than you'd expect if their sightings were independent of each
#   other" — a much more honest signal than a raw count.
# ═══════════════════════════════════════════════════════════════════════════

@app.route('/species-cooccurrence', methods=['POST'])
def species_cooccurrence():
    body = request.get_json(force=True)
    daily_species_lists = body.get('dailySpeciesLists', [])
    min_co_occurrences = int(body.get('minCoOccurrences', 3))

    total_days = len(daily_species_lists)
    if total_days == 0:
        return jsonify({'success': True, 'data': {'pairs': [], 'totalDays': 0}})

    # How many days did each species appear on at all (its "marginal" count)
    species_day_counts = {}
    # How many days did each PAIR of species both appear on
    pair_day_counts = {}

    for species_on_day in daily_species_lists:
        unique_species = sorted(set(species_on_day))  # de-dupe multiple sightings same day

        for sp in unique_species:
            species_day_counts[sp] = species_day_counts.get(sp, 0) + 1

        for sp_a, sp_b in combinations(unique_species, 2):
            key = (sp_a, sp_b)
            pair_day_counts[key] = pair_day_counts.get(key, 0) + 1

    results = []
    for (sp_a, sp_b), co_days in pair_day_counts.items():
        if co_days < min_co_occurrences:
            continue  # too few joint sightings to trust the signal

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


if __name__ == '__main__':
    is_dev = os.environ.get('FLASK_ENV', 'production') == 'development'
    print(f'Conservation ML service running on port {PORT}')
    app.run(host='0.0.0.0', port=PORT, debug=is_dev)