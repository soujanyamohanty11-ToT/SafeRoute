import React from "react";
import {
  IconShield,
  IconSun,
  IconMoon,
  IconFileText,
  IconAlertTriangle,
  IconCheckCircle
} from "./Icons";

export default function Header({
  isDark,
  toggleTheme,
  emergencies,
  selectedEmergency,
  onSelectEmergency,
  onOpenProtocol,
  backendConnected,
  activeTab,
  setActiveTab
}) {
  const currentScenario = emergencies?.[selectedEmergency];

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-logo">
          <IconShield size={22} className="logo-icon" />
          <span className="logo-pulse"></span>
        </div>
        <div className="brand-text">
          <div className="brand-title-wrap">
            <h1>SafeRoute</h1>
            <span className="app-version-tag">DM Core v2.0</span>
          </div>
          <p>Discrete Mathematics Smart Evacuation System</p>
        </div>
      </div>

      <div className="header-center">
        {/* Module Navigation Tabs */}
        <div className="navigation-tabs" style={{ display: "flex", gap: "8px", marginRight: "16px" }}>
          <button
            type="button"
            className={`tab-btn ${activeTab === "evacuation" ? "active" : ""}`}
            onClick={() => setActiveTab("evacuation")}
          >
            Evacuation
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "responder" ? "active" : ""}`}
            onClick={() => setActiveTab("responder")}
          >
            First Responder Path
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "risk" ? "active" : ""}`}
            onClick={() => setActiveTab("risk")}
          >
            Risk Analysis
          </button>
        </div>

        <div className="scenario-selector-pill">
          <span className="scenario-pill-label">Scenario:</span>
          <div className="scenario-tabs">
            {Object.entries(emergencies || {}).map(([key, data]) => {
              const active = selectedEmergency === key;
              const isDrill = key === "drill";
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelectEmergency(key)}
                  className={`scenario-chip ${active ? "active" : ""} ${isDrill ? "chip-drill" : ""}`}
                  title={data.description}
                >
                  {isDrill ? (
                    <IconCheckCircle size={13} className="chip-icon" />
                  ) : (
                    <IconAlertTriangle size={13} className="chip-icon" />
                  )}
                  <span>{data.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="header-actions">
        <div className={`conn-status ${backendConnected ? "status-online" : "status-offline"}`}>
          <span className="conn-dot"></span>
          <span className="conn-text">{backendConnected ? "System Online" : "Connecting..."}</span>
        </div>

        <button
          type="button"
          className="header-action-btn"
          onClick={onOpenProtocol}
          title="View & Export Emergency Action Directive"
        >
          <IconFileText size={15} />
          <span>Directive</span>
        </button>

        <button
          type="button"
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle theme"
        >
          {isDark ? <IconSun size={17} /> : <IconMoon size={17} />}
        </button>
      </div>
    </header>
  );
}