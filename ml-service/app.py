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
# What changed from the first version: this now returns WHY a week was
# flagged, not just a yes/no. For each week we compute how far its count
# and severity-weighted score sit from the average of all weeks in the
# window (as a percentage), so the frontend can build a real explanation
# like "11 incidents, 72% above the 16-week average of 6.4" instead of just
# coloring a bar red with no justification.
# ═══════════════════════════════════════════════════════════════════════════

@app.route('/detect-anomalies', methods=['POST'])
def detect_anomalies():
    body = request.get_json(force=True)
    weekly_data = body.get('weeks', [])

    if len(weekly_data) < 4:
        return jsonify({
            'success': True,
            'data': {
                'weeks': [],
                'message': 'Not enough incident history yet (need at least 4 weeks of data).',
            },
        })

    features = np.array([
        [w['count'], w['severityWeight']] for w in weekly_data
    ], dtype=float)

    mean_count = float(features[:, 0].mean())
    mean_severity = float(features[:, 1].mean())

    model = IsolationForest(contamination=0.15, random_state=42)
    labels = model.fit_predict(features)
    scores = model.decision_function(features)

    results = []
    for week, label, score in zip(weekly_data, labels, scores):
        count_vs_avg_pct = (
            round(((week['count'] - mean_count) / mean_count) * 100, 1) if mean_count > 0 else 0.0
        )
        severity_vs_avg_pct = (
            round(((week['severityWeight'] - mean_severity) / mean_severity) * 100, 1)
            if mean_severity > 0 else 0.0
        )

        results.append({
            # Echo back whatever identifying fields Node sent (weekStart/
            # weekEnd), so the frontend can use them to query the actual
            # incidents for a flagged week without this service needing
            # any database access of its own.
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
        'data': {
            'weeks': results,
            'meanCount': round(mean_count, 1),
            'meanSeverityWeight': round(mean_severity, 1),
        },
    })


if __name__ == '__main__':
    is_dev = os.environ.get('FLASK_ENV', 'production') == 'development'
    print(f'Conservation ML service running on port {PORT}')
    app.run(host='0.0.0.0', port=PORT, debug=is_dev)