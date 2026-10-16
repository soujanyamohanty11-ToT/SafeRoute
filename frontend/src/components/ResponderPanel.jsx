import React, { useState } from 'react';

export default function ResponderPanel({ nodes, onCalculateRoute, routeData }) {
  const [entryPoint, setEntryPoint] = useState('');
  const [incidentLoc, setIncidentLoc] = useState('');

  const handleSearch = () => {
    if (!entryPoint || !incidentLoc) return;
    onCalculateRoute(entryPoint, incidentLoc);
  };

  return (
    <div className="panel-container">
      <h3>First Responder Path</h3>
      <div className="form-group">
        <label>Entry Point:</label>
        <select value={entryPoint} onChange={(e) => setEntryPoint(e.target.value)}>
          <option value="">Select Entry Node</option>
          {nodes.map(n => <option key={n.id} value={n.id}>{n.label || n.id}</option>)}
        </select>
      </div>

      <div className="form-group">
        <label>Incident Location:</label>
        <select value={incidentLoc} onChange={(e) => setIncidentLoc(e.target.value)}>
          <option value="">Select Incident Room</option>
          {nodes.map(n => <option key={n.id} value={n.id}>{n.label || n.id}</option>)}
        </select>
      </div>

      <button onClick={handleSearch} className="btn-primary">Find Entry Path</button>

      {routeData && (
        <div className="results-box">
          {routeData.status === "No route available" ? (
            <div className="alert-danger">No entry route available! Incident location is isolated.</div>
          ) : (
            <>
              <h4>Recommended Route:</h4>
              <p>{routeData.primary_route.join(' ➔ ')}</p>

              {routeData.alternative_route?.length > 0 && (
                <>
                  <h4>Alternative Route:</h4>
                  <p>{routeData.alternative_route.join(' ➔ ')}</p>
                </>
              )}

              <h4>Shared Corridors (Occupants & Responders):</h4>
              <ul>
                {routeData.shared_corridors?.map(([u, v], idx) => (
                  <li key={idx}>{u} ↔ {v}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}