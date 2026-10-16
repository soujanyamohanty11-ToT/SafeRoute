import React, { useState } from 'react';

export default function RiskAnalysisPanel({ edges, onRunRiskAnalysis, riskData }) {
  const [selectedBlockages, setSelectedBlockages] = useState([]);

  const toggleEdgeBlockage = (edge) => {
    const pair = [edge.source, edge.target];
    const exists = selectedBlockages.some(([u, v]) => 
      (u === pair[0] && v === pair[1]) || (u === pair[1] && v === pair[0])
    );
    if (exists) {
      setSelectedBlockages(selectedBlockages.filter(([u, v]) => !(u === pair[0] && v === pair[1])));
    } else {
      setSelectedBlockages([...selectedBlockages, pair]);
    }
  };

  return (
    <div className="panel-container">
      <h3>Simulated Risk Analysis</h3>
      <p className="text-muted">Select corridors to temporarily block and test network resilience:</p>
      
      <div className="edge-selector-list">
        {edges.map((e, idx) => (
          <label key={idx} className="checkbox-label">
            <input 
              type="checkbox" 
              onChange={() => toggleEdgeBlockage(e)}
            />
            {e.source} ↔ {e.target}
          </label>
        ))}
      </div>

      <button 
        onClick={() => onRunRiskAnalysis(selectedBlockages)} 
        className="btn-warning"
      >
        Run Failure Simulation
      </button>

      {riskData && (
        <div className="risk-results-card">
          <div className="score-badge">
            <h4>Simulated Graph Risk Score</h4>
            <span className="score-value">{riskData.risk_score} / 100</span>
            <small className="disclaimer">*Simulated graph-based risk score, not a prediction of actual injuries or deaths.</small>
          </div>

          <div className="metric">
            <strong>Disconnected Rooms:</strong> {riskData.unreachable_rooms.join(', ') || 'None'}
          </div>
          <div className="metric">
            <strong>Affected Occupants:</strong> {riskData.affected_occupants} / {riskData.total_occupants}
          </div>

          <h4>Restoration & Reassignment Suggestions:</h4>
          <ul>
            {riskData.suggestions.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}