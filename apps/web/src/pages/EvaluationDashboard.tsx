import { useEffect, useState } from "react";
import { api, EvaluationMetrics } from "../api";

export function EvaluationDashboard() {
    const [metrics, setMetrics] = useState<EvaluationMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [calibrating, setCalibrating] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    async function loadMetrics() {
        try {
            setError("");
            const data = await api.getEvalMetrics();
            setMetrics(data);
        } catch {
            setError("Could not load evaluation metrics.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadMetrics();
    }, []);

    async function handleTriggerCalibration() {
        try {
            setCalibrating(true);
            setMessage("");
            setError("");
            const res = await api.triggerCalibration();
            setMessage(
                `New calibration snapshot generated! ECE: ${(res.ece * 100).toFixed(1)}% across ${res.totalReviewed} reviews.`
            );
            await loadMetrics();
        } catch {
            setError("Failed to run calibration snapshot.");
        } finally {
            setCalibrating(false);
        }
    }

    if (loading) return <main className="page">Loading evaluation metrics…</main>;

    return (
        <main className="page">
            <div className="page-heading">
                <div>
                    <p className="eyebrow">AI Quality & Calibration</p>
                    <h1>Evaluation Dashboard</h1>
                </div>
                <button
                    className="btn-primary"
                    onClick={handleTriggerCalibration}
                    disabled={calibrating}
                >
                    {calibrating ? "Computing…" : "Run Calibration Snapshot"}
                </button>
            </div>

            {message && <p className="success-message">{message}</p>}
            {error && <p className="error-message">{error}</p>}

            {/* Metric Cards */}
            <section className="metrics-grid">
                <div className="card metric-card">
                    <span className="label">Overall Accuracy</span>
                    <strong>
                        {metrics ? (metrics.overallAccuracy * 100).toFixed(1) : 0}%
                    </strong>
                </div>
                <div className="card metric-card">
                    <span className="label">Total Reviewed Tickets</span>
                    <strong>{metrics?.totalReviewed ?? 0}</strong>
                </div>
                <div className="card metric-card">
                    <span className="label">Latest Snapshots</span>
                    <strong>{metrics?.snapshots.length ?? 0} buckets</strong>
                </div>
            </section>

            {/* Calibration Reliability Diagram */}
            <section className="card">
                <h2>Confidence Calibration (Reliability Diagram)</h2>
                <p className="muted">
                    Compares AI predicted confidence against actual human agreement in each confidence bucket.
                </p>

                {!metrics || metrics.snapshots.length === 0 ? (
                    <p className="empty-state">
                        No calibration snapshot found. Click "Run Calibration Snapshot" above.
                    </p>
                ) : (
                    <div className="calibration-chart">
                        {metrics.snapshots.map((s) => {
                            const pred = Number(s.predictedAccuracy) * 100;
                            const act = Number(s.actualAccuracy) * 100;
                            return (
                                <div key={s.id || s.confidenceBucket} className="bucket-row">
                                    <div className="bucket-label">
                                        <strong>{s.confidenceBucket}</strong>
                                        <span className="muted">({s.sampleSize} samples)</span>
                                    </div>
                                    <div className="bar-container">
                                        <div className="bar-wrapper">
                                            <div
                                                className="bar bar-predicted"
                                                style={{ width: `${pred}%` }}
                                                title={`Predicted: ${pred.toFixed(1)}%`}
                                            />
                                            <span className="bar-text">Predicted: {pred.toFixed(1)}%</span>
                                        </div>
                                        <div className="bar-wrapper">
                                            <div
                                                className="bar bar-actual"
                                                style={{ width: `${act}%` }}
                                                title={`Actual: ${act.toFixed(1)}%`}
                                            />
                                            <span className="bar-text">Actual: {act.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Category Drift */}
            <section className="card">
                <h2>Category Drift</h2>
                <p className="muted">
                    Shows how AI category distribution compares with human ground truth corrections.
                </p>
                {!metrics || metrics.categoryDrift.length === 0 ? (
                    <p className="empty-state">No category drift data available yet.</p>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>AI Predictions</th>
                                <th>Human Ground Truth</th>
                                <th>Difference</th>
                            </tr>
                        </thead>
                        <tbody>
                            {metrics.categoryDrift.map((item) => {
                                const diff = item.humanCount - item.aiCount;
                                return (
                                    <tr key={item.category}>
                                        <td>
                                            <strong>{item.category.replace("_", " ")}</strong>
                                        </td>
                                        <td>{item.aiCount}</td>
                                        <td>{item.humanCount}</td>
                                        <td>
                                            <span
                                                className={`badge ${diff === 0
                                                        ? "badge-equal"
                                                        : diff > 0
                                                            ? "badge-up"
                                                            : "badge-down"
                                                    }`}
                                            >
                                                {diff > 0 ? `+${diff}` : diff}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </section>
        </main>
    );
}
