import { useState, useEffect } from 'react';
import { apiCall } from '../data/api';
import { MOCK_FAILURE_LOG, recentRequests } from '../data/state';
import { useToast } from './Toast';

export default function AdminMetrics() {
  const showToast = useToast();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/admin/metrics');
      setMetrics(data);
    } catch (err) {
      showToast('Failed to load metrics', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <h3>📊 System Metrics</h3>
        <div className="spinner-overlay">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Metric Cards */}
      <div className="card full-width">
        <h3>📊 ARIA System Metrics</h3>

        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon">🩸</div>
            <div className="metric-label">Total Active Donors</div>
            <div className="metric-value">{metrics?.total_active_donors?.toLocaleString() || '—'}</div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">🛡️</div>
            <div className="metric-label">Active Bridges</div>
            <div className="metric-value">{metrics?.active_bridges?.toLocaleString() || '—'}</div>
          </div>

          <div className={`metric-card ${(metrics?.inactive_donors || 0) > 500 ? 'danger' : ''}`}>
            <div className="metric-icon">⚠️</div>
            <div className="metric-label">Inactive Donors</div>
            <div className="metric-value">{metrics?.inactive_donors?.toLocaleString() || '—'}</div>
            {(metrics?.inactive_donors || 0) > 500 && (
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', marginTop: '4px' }}>
                ⚠️ Above threshold — intervention needed
              </div>
            )}
          </div>

          <div className="metric-card">
            <div className="metric-icon">✅</div>
            <div className="metric-label">Eligible Right Now</div>
            <div className="metric-value">{metrics?.eligible_now?.toLocaleString() || '—'}</div>
          </div>
        </div>

        {/* Recent Blood Requests */}
        <div style={{ marginTop: '8px' }}>
          <div className="flex-between mb-3">
            <span className="font-semibold text-sm">Recent Blood Requests</span>
            <span className="badge badge-info">{metrics?.requests_today || 0} today</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="match-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Blood Group</th>
                  <th>Urgency</th>
                  <th>Matched</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.map(req => (
                  <tr key={req.id}>
                    <td className="font-semibold">{req.patientName}</td>
                    <td><span className="badge badge-purple">{req.bloodGroup}</span></td>
                    <td>
                      <span className={`badge ${req.urgency === 'high' ? 'badge-emergency' : req.urgency === 'medium' ? 'badge-warning' : 'badge-info'}`}>
                        {req.urgency}
                      </span>
                    </td>
                    <td className="font-semibold">{req.matchedDonors}</td>
                    <td>
                      <span className={`badge ${req.status === 'matched' ? 'badge-success' : 'badge-warning'}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="text-sm text-muted">{req.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* System Learning Log (Task A6) */}
      <div className="card">
        <h3>🧠 System Learning Log</h3>
        <div className="flex-between mb-3">
          <span className="text-sm text-secondary">AI failure pattern recognition</span>
          <span className="ai-learning-badge">
            <span className="pulse-dot"></span>
            AI Learning Active
          </span>
        </div>

        {MOCK_FAILURE_LOG.map((entry, idx) => (
          <div key={idx} className="list-item">
            <div className="flex-between">
              <div>
                <span className="badge badge-purple" style={{ marginRight: '8px' }}>{entry.donor}</span>
                <span className="text-sm">{entry.event}</span>
              </div>
              <span className="text-xs text-muted">{entry.time}</span>
            </div>
            <div className="text-sm mt-2" style={{ color: 'var(--accent-amber)' }}>
              ↳ Action: {entry.action}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
