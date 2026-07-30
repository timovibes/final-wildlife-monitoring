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
import numpy as np
from dotenv import load_dotenv
from sklearn.cluster import DBSCAN

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
#   This fits the problem well because:
#     - We have no idea in advance how many real hotspots exist in the park
#     - Hotspots can be irregular shapes (a river bank, a valley), not
#       forced into circles like k-means would
#     - Isolated one-off sightings are automatically excluded instead of
#       dragging cluster centers toward outliers
#
# Coordinate note (important for presenting this):
#   `eps` here is in degrees of latitude/longitude, not meters — at
#   Nairobi's latitude, roughly 1 degree ≈ 111km, so eps=0.01 ≈ ~1.1km.
#   This is a reasonable approximation for a single park-sized area. A
#   system covering a much larger area (spanning many degrees of latitude)
#   would need to convert to true great-circle (haversine) distance first,
#   since degrees of longitude compress toward the poles.
# ═══════════════════════════════════════════════════════════════════════════

@app.route('/cluster-hotspots', methods=['POST'])
def cluster_hotspots():
    body = request.get_json(force=True)
    sightings = body.get('sightings', [])

    # eps: how close (in degrees) two sightings need to be to count as
    #      "neighbors". min_samples: how many neighbors are needed before
    #      a point is considered part of a dense region (a hotspot) rather
    #      than noise. Both are tunable — smaller eps / higher min_samples
    #      = stricter, fewer but more confident hotspots.
    eps = float(body.get('eps', 0.01))
    min_samples = int(body.get('minSamples', 3))

    if not sightings:
        return jsonify({'success': True, 'data': {'clusters': [], 'noiseCount': 0}})

    # DBSCAN expects a 2D array of coordinates: [[lat, lng], [lat, lng], ...]
    coords = np.array([[s['latitude'], s['longitude']] for s in sightings])

    # fit_predict returns a cluster label for every input point:
    #   0, 1, 2, ... = which cluster it belongs to
    #   -1           = noise (not part of any cluster)
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

    # Turn each raw cluster into a summary a frontend map can actually use:
    # a center point (centroid), how big it is, and what's being seen there.
    result_clusters = []
    for label, cluster in clusters.items():
        pts = np.array([[p['latitude'], p['longitude']] for p in cluster['points']])
        center_lat, center_lng = pts.mean(axis=0)

        # Rough radius: furthest point in the cluster from its centroid,
        # converted from degrees to meters (~111,000m per degree) so the
        # frontend can draw an actual circle on the map.
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

    # Biggest/busiest hotspots first — most actionable for a researcher
    result_clusters.sort(key=lambda c: c['pointCount'], reverse=True)

    return jsonify({
        'success': True,
        'data': {
            'clusters': result_clusters,
            'noiseCount': noise_count,  # isolated sightings, not part of any hotspot
        },
    })


if __name__ == '__main__':
    is_dev = os.environ.get('FLASK_ENV', 'production') == 'development'
    print(f'Conservation Risk Score ML service running on port {PORT}')
    app.run(host='0.0.0.0', port=PORT, debug=is_dev)