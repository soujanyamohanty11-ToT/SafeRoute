import React from "react";
import { IconPrinter, IconCheckCircle, IconXCircle, IconShield } from "./Icons";

export default function PrintModal({
  isOpen,
  onClose,
  result,
  building,
  start,
  emergency,
  emergencies,
  people
}) {
  if (!isOpen) return null;

  const nodeMap = {};
  building?.nodes?.forEach(n => {
    nodeMap[n.id] = n;
  });

  const scenario = emergencies?.[emergency];
  const exitLabel = nodeMap[result?.recommended_exit]?.label || result?.recommended_exit || "None";
  const startLabel = nodeMap[start]?.label || start;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container printable-protocol" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <IconShield size={20} className="modal-logo-icon" />
            <div>
              <h3>Campus Emergency Evacuation Directive</h3>
              <p>SafeRoute Operational Action Sheet</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="protocol-summary-grid">
            <div className="p-item">
              <span className="p-label">INCIDENT TYPE</span>
              <strong className="p-val">{scenario?.label || emergency}</strong>
            </div>

            <div className="p-item">
              <span className="p-label">SEVERITY LEVEL</span>
              <strong className="p-val">{scenario?.severity || "Active Alert"}</strong>
            </div>

            <div className="p-item">
              <span className="p-label">ORIGIN ROOM</span>
              <strong className="p-val">{startLabel}</strong>
            </div>

            <div className="p-item">
              <span className="p-label">PRIMARY DISCHARGE EXIT</span>
              <strong className="p-val">{exitLabel}</strong>
            </div>
          </div>

          <div className="protocol-route-section">
            <h4>Mandatory Evacuation Corridor</h4>
            {result?.route ? (
              <div className="protocol-steps-list">
                {result.route.map((nodeId, idx) => (
                  <div key={nodeId} className="protocol-step">
                    <span className="p-step-num">{idx + 1}</span>
                    <span className="p-step-name">{nodeMap[nodeId]?.label || nodeId}</span>
                    {idx < result.route.length - 1 && <span className="p-step-arrow">→</span>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-route-alert">No safe path found under current hazard.</p>
            )}
          </div>

          <div className="protocol-muster-section">
            <h4>Designated Assembly & Muster Point</h4>
            <p>
              Upon exiting through <strong>{exitLabel}</strong>, all personnel must proceed immediately to:
            </p>
            <div className="muster-badge-card">
              {result?.recommended_exit === "exitA" && "NORTH LAWN / ASSEMBLY POINT A"}
              {result?.recommended_exit === "exitB" && "WEST COURTYARD / ASSEMBLY POINT B"}
              {result?.recommended_exit === "exitC" && "SOUTH ATHLETICS FIELD / ASSEMBLY POINT C"}
              {!result?.recommended_exit && "REMAIN IN PLACE & AWAIT CAMPUS FIRST RESPONDERS"}
            </div>
          </div>

          <div className="protocol-contacts-section">
            <h4>Emergency Contact Lines</h4>
            <div className="contacts-grid">
              <div>Campus Security: <strong>+1 (800) 555-0199</strong></div>
              <div>Medical Center: <strong>Ext. 404</strong></div>
              <div>Fire Emergency: <strong>911 / 112</strong></div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn-primary" onClick={handlePrint}>
            <IconPrinter size={15} />
            <span>Print Directive</span>
          </button>
        </div>
      </div>
    </div>
  );
}
