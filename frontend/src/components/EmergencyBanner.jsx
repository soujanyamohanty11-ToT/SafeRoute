import React, { useState } from "react";
import { IconFlame, IconAlertTriangle, IconCheckCircle, IconInfo } from "./Icons";

export default function EmergencyBanner({ emergency, emergencyData, blockedCount = 0 }) {
  const [collapsed, setCollapsed] = useState(false);

  if (!emergencyData) return null;

  const isDrill = emergency === "drill";
  const severity = emergencyData.severity || (isDrill ? "Normal" : "High");
  const severityClass = severity.toLowerCase();

  return (
    <div className={`hazard-banner severity-${severityClass} ${collapsed ? "banner-collapsed" : ""}`}>
      <div className="banner-left">
        <div className="banner-badge-icon">
          {isDrill ? (
            <IconCheckCircle size={18} />
          ) : severityClass === "critical" ? (
            <IconAlertTriangle size={18} />
          ) : (
            <IconFlame size={18} />
          )}
        </div>
        <div className="banner-info">
          <div className="banner-headline">
            <span className="banner-title">{emergencyData.label || emergency}</span>
            <span className={`severity-pill pill-${severityClass}`}>
              {severity} Priority
            </span>
            {blockedCount > 0 && (
              <span className="hazard-corridors-count">
                {blockedCount} Corridor{blockedCount > 1 ? "s" : ""} Compromised
              </span>
            )}
          </div>
          {!collapsed && (
            <div className="banner-details">
              <span className="banner-desc">{emergencyData.description}</span>
              {emergencyData.advisory && (
                <span className="banner-advisory">
                  <strong>Protocol:</strong> {emergencyData.advisory}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="banner-right">
        <button
          type="button"
          className="banner-toggle-btn"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? "Expand Details" : "Collapse"}
        </button>
      </div>
    </div>
  );
}
