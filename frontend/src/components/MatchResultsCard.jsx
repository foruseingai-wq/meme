import { useState } from 'react';
import { apiCall } from '../data/api';
import { useToast } from './Toast';

export default function MatchResultsCard() {
  const showToast = useToast();
  const [formData, setFormData] = useState({
    patientName: '',
    bloodGroup: 'A Positive',
    urgency: 'high'
  });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const bloodGroups = [
    'A Positive', 'A Negative', 'B Positive', 'B Negative',
    'AB Positive', 'AB Negative', 'O Positive', 'O Negative'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.patientName.trim()) {
      showToast('Please enter a patient name', 'warning');
      return;
    }
    setLoading(true);
    try {
      const data = await apiCall('/request-blood', 'POST', {
        patient_id: 'p-' + Date.now().toString(36),
        blood_group: formData.bloodGroup,
        urgency: formData.urgency
      });
      setResults(data);
      showToast(`Found ${data.matched_donors?.length || 0} matching donors`, 'success');
    } catch (err) {
      showToast('Failed to search donors', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleNotifyAll = () => {
    showToast(`Notifying all ${results?.matched_donors?.length || 0} matched donors via SMS & WhatsApp`, 'success');
  };

  const getScoreColor = (score) => {
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'medium';
    return 'low';
  };

  const getScoreColorText = (score) => {
    if (score >= 0.8) return 'text-emerald';
    if (score >= 0.6) return 'text-amber';
    return 'text-rose';
  };

  return (
    <div className="card">
      <h3>🔍 Blood Request — Donor Matching</h3>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label>Patient Name</label>
            <input
              type="text"
              placeholder="Enter patient name..."
              value={formData.patientName}
              onChange={e => setFormData(prev => ({ ...prev, patientName: e.target.value }))}
            />
          </div>
          <div>
            <label>Blood Group Required</label>
            <select
              value={formData.bloodGroup}
              onChange={e => setFormData(prev => ({ ...prev, bloodGroup: e.target.value }))}
            >
              {bloodGroups.map(bg => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginTop: '8px' }}>
          <label>Urgency Level</label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            {['high', 'medium', 'low'].map(level => (
              <button
                key={level}
                type="button"
                className={`btn btn-sm ${formData.urgency === level
                  ? (level === 'high' ? 'btn-primary' : level === 'medium' ? 'btn-secondary' : 'btn-ghost')
                  : 'btn-outline'
                }`}
                onClick={() => setFormData(prev => ({ ...prev, urgency: level }))}
              >
                {level === 'high' ? '🔴' : level === 'medium' ? '🟡' : '🟢'} {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-md"
          style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }}
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
              Searching donors...
            </>
          ) : (
            <>🩸 Find Matching Donors</>
          )}
        </button>
      </form>

      {/* Results */}
      {loading && !results && (
        <div className="spinner-overlay">
          <div className="spinner"></div>
        </div>
      )}

      {results && results.matched_donors && (
        <div style={{ marginTop: '20px' }}>
          <div className="flex-between mb-3">
            <span className="text-sm text-secondary">
              Found <strong className="text-primary" style={{ color: 'var(--text-primary)' }}>{results.matched_donors.length}</strong> compatible donors
            </span>
            <span className="badge badge-info">
              Request #{results.request_id}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="match-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Donor Name</th>
                  <th>Blood Group</th>
                  <th>Match Score</th>
                  <th>Distance</th>
                  <th>Donations</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {results.matched_donors.map((donor, idx) => (
                  <tr key={donor.donor_id}>
                    <td>
                      <span style={{
                        fontWeight: 700,
                        color: idx < 3 ? 'var(--accent-amber)' : 'var(--text-muted)'
                      }}>
                        {idx + 1}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{donor.name}</div>
                      <div className="text-xs text-muted">{donor.role}</div>
                    </td>
                    <td>
                      <span className="badge badge-purple">{donor.blood_group}</span>
                    </td>
                    <td style={{ minWidth: '160px' }}>
                      <div className="score-bar-container">
                        <div className="score-bar">
                          <div
                            className={`score-bar-fill ${getScoreColor(donor.score)}`}
                            style={{ width: `${donor.score * 100}%` }}
                          ></div>
                        </div>
                        <span className={`score-text ${getScoreColorText(donor.score)}`}>
                          {Math.round(donor.score * 100)}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="text-sm">{donor.distance_km} km</span>
                    </td>
                    <td>
                      <span className="text-sm font-semibold">{donor.total_donations}</span>
                    </td>
                    <td>
                      {donor.eligible ? (
                        <span className="badge badge-success">Eligible</span>
                      ) : (
                        <span className="badge badge-warning">Cooldown</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => {
              showToast('Simulating no-response from top donor — escalation triggered', 'warning');
            }}>
              ⚡ Simulate No Response
            </button>
            <button className="btn btn-primary btn-md" onClick={handleNotifyAll}>
              📢 Notify All Matched Donors
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
