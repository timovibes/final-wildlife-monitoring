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


if __name__ == '__main__':
    is_dev = os.environ.get('FLASK_ENV', 'production') == 'development'
    print(f'Conservation Risk Score ML service running on port {PORT}')
    app.run(host='0.0.0.0', port=PORT, debug=is_dev)