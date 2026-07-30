"""
Conservation Risk Score — ML Microservice

Stateless compute service. Receives per-species data (12-month sighting
history, conservation status, incident pressure) from the Node backend and
returns a computed risk score per species. No database access here — Node
owns the data layer, this service only does the math.

Run: python app.py   (defaults to port 5001)
"""

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.linear_model import LinearRegression
from sklearn.cluster import DBSCAN
from sklearn.ensemble import IsolationForest
import numpy as np
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
    """
    Fits month-index -> sighting-count with linear regression and returns a
    0-1 decline severity score. Flat/rising trend = 0. Needs at least 2
    non-zero months to fit meaningfully; otherwise returns 0 (no signal,
    not "no risk" — a data-availability limitation, not a safety claim).
    """
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


# ═══════════════════════════════════════════════════════════════════════════
# SIGHTING HOTSPOT CLUSTERING
#
# What this does:
#   Groups sightings that happened close together in space into "hotspots" —
#   areas of unusually concentrated wildlife activity — instead of showing
#   hundreds of individual pins with no visible pattern.
#
# Why DBSCAN specifically:
#   DBSCAN (Density-Based Spatial Clustering) does NOT need to be told in
#   advance how many hotspots exist — unlike k-means, which requires you to
#   pick a number of clusters up front. DBSCAN instead asks, for every
#   sighting: "how many other sightings are within `eps` distance of this
#   one?" If there are at least `min_samples` nearby, they all join a
#   cluster together. Sightings with too few neighbors are labelled "noise"
#   (-1) — one-off sightings that aren't part of any hotspot.
#
# Coordinate note (important for presenting this):
#   `eps` here is in degrees of latitude/longitude, not meters — at
#   Nairobi's latitude, roughly 1 degree ≈ 111km, so eps=0.003 ≈ ~330m.
# ═══════════════════════════════════════════════════════════════════════════

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

        top_species = sorted(
            cluster['species_counts'].items(), key=lambda x: x[1], reverse=True
        )

        result_clusters.append({
            'clusterId': int(label),
            'centerLat': float(center_lat),
            'centerLng': float(center_lng),
            'pointCount': len(cluster['points']),
            'radiusMeters': round(radius_meters, 1),
            'topSpecies': [{'name': n, 'count': c} for n, c in top_species[:3]],
        })

    result_clusters.sort(key=lambda c: c['pointCount'], reverse=True)

    return jsonify({
        'success': True,
        'data': {
            'clusters': result_clusters,
            'noiseCount': noise_count,
        },
    })


# ═══════════════════════════════════════════════════════════════════════════
# INCIDENT ANOMALY DETECTION
#
# What this does:
#   Looks at incident activity bucketed by week and flags weeks that look
#   statistically unusual compared to the rest — a spike in incident count,
#   or a spike in how severe those incidents were. This is a PROACTIVE
#   signal ("something unusual is happening right now/recently") rather
#   than a descriptive one (a raw total, which is all the rest of the
#   dashboard shows).
#
# Why Isolation Forest specifically:
#   Isolation Forest works by repeatedly picking a random feature and a
#   random split point, and seeing how many splits it takes to isolate a
#   given data point on its own. Anomalies — points that are unusual — tend
#   to get isolated in FEWER splits than normal points, because they don't
#   need much narrowing down to stand out from everything else. Normal
#   points, sitting in the "crowd," take many more splits before they're
#   alone.
#
#   This is a good fit here because:
#     - It's unsupervised — we don't have labeled examples of "this was
#       definitely an anomalous week" to train on, and realistically never
#       will for a system like this
#     - It doesn't assume the data follows any particular distribution
#       (unlike a simple z-score threshold, which assumes roughly normal/
#       bell-curve behavior — incident counts are bursty and don't
#       necessarily look like that)
#     - It scales naturally to multiple features at once (here: incident
#       COUNT and incident SEVERITY WEIGHT per week), so a week can be
#       flagged either for having unusually many incidents, or unusually
#       severe ones, or both
#
# Caveat worth stating out loud when presenting this:
#   With few data points (a short history), Isolation Forest has very
#   little to compare against, so flags should be treated as suggestive,
#   not authoritative, until more weeks of real data accumulate.
# ═══════════════════════════════════════════════════════════════════════════

@app.route('/detect-anomalies', methods=['POST'])
def detect_anomalies():
    body = request.get_json(force=True)
    weekly_data = body.get('weeks', [])

    if len(weekly_data) < 4:
        # Not enough history for Isolation Forest to have any meaningful
        # basis for comparison — better to say so than return a fake result.
        return jsonify({
            'success': True,
            'data': {
                'weeks': [],
                'message': 'Not enough incident history yet (need at least 4 weeks of data).',
            },
        })

    # Two features per week: raw incident count, and a severity-weighted
    # score (so a week with 3 Critical incidents can be flagged even if a
    # different week technically has more total incidents but they were
    # all Low severity).
    features = np.array([
        [w['count'], w['severityWeight']] for w in weekly_data
    ], dtype=float)

    # contamination: our rough prior guess at what fraction of weeks are
    # "genuinely anomalous" — not a hard rule, just biases how aggressively
    # the model flags things. 0.15 ≈ "expect roughly 1 in 7 weeks to stand
    # out," a reasonable starting assumption for incident data, adjustable
    # later once there's a real sense of what's actually going on with this
    # site.
    model = IsolationForest(contamination=0.15, random_state=42)
    labels = model.fit_predict(features)          # -1 = anomaly, 1 = normal
    scores = model.decision_function(features)    # more negative = more anomalous

    results = []
    for week, label, score in zip(weekly_data, labels, scores):
        results.append({
            'weekLabel': week['weekLabel'],
            'count': week['count'],
            'severityWeight': week['severityWeight'],
            'isAnomaly': bool(label == -1),
            'anomalyScore': round(float(score), 3),
        })

    return jsonify({'success': True, 'data': {'weeks': results}})


if __name__ == '__main__':
    is_dev = os.environ.get('FLASK_ENV', 'production') == 'development'
    print(f'Conservation ML service running on port {PORT}')
    app.run(host='0.0.0.0', port=PORT, debug=is_dev)