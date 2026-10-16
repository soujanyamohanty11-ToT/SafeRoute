import React, { useState } from "react";
import {
  IconCpu,
  IconRoute,
  IconUsers,
  IconAlertTriangle,
  IconInfo,
  IconArrowRight
} from "./Icons";

export default function ControlPanel({
  building,
  emergencies,
  start,
  setStart,
  emergency,
  setEmergency,
  people,
  setPeople,
  loading,
  onCalculate,
  result
}) {
  const [showTheory, setShowTheory] = useState(true);

  if (!building) return null;

  // Filter out exit nodes for starting location
  const nonExitNodes = building.nodes.filter(n => !n.id.startsWith("exit"));

  // Calculate quick capacity estimate
  const totalCapacity = Object.values(building.exits || {}).reduce(
    (sum, ex) => sum + (ex.capacity || 0),
    0
  );

  const currentReachableCap = result?.total_reachable_capacity || totalCapacity;
  const isCapacityBreached = people > currentReachableCap;

  return (
    <section className="control-panel-card">
      <div className="panel-header">
        <div className="panel-title-group">
          <span className="panel-icon-badge">
            <IconCpu size={16} />
          </span>
          <div>
            <h2>Evacuation Parameters</h2>
            <p className="panel-subtitle">Configure model variables & graph constraints</p>
          </div>
        </div>
      </div>

      <div className="panel-body">
        {/* Origin Node Select */}
        <div className="form-field-group">
          <div className="field-label-row">
            <label htmlFor="start-location-select">Starting Location (Origin $v_0$)</label>
            <span className="field-math-tag">Source Vertex</span>
          </div>

          <div className="select-wrapper">
            <select
              id="start-location-select"
              value={start}
              onChange={e => setStart(e.target.value)}
              className="custom-select"
            >
              {nonExitNodes.map(n => (
                <option key={n.id} value={n.id}>
                  {n.label} ({n.id})
                </option>
              ))}
            </select>
          </div>
          <span className="field-hint">
            Or click directly on any room inside the network map.
          </span>
        </div>

        {/* Hazard Scenario Select */}
        <div className="form-field-group">
          <div className="field-label-row">
            <label htmlFor="emergency-scenario-select">Emergency Scenario</label>
            <span className="field-math-tag">Edge Cut Set</span>
          </div>

          <div className="select-wrapper">
            <select
              id="emergency-scenario-select"
              value={emergency}
              onChange={e => setEmergency(e.target.value)}
              className="custom-select"
            >
              {Object.entries(emergencies || {}).map(([key, data]) => (
                <option key={key} value={key}>
                  {data.label} ({data.blocked_edges?.length || 0} blocked)
                </option>
              ))}
            </select>
          </div>
          <span className="field-hint">
            Corridors compromised by the hazard are dynamically excluded from $G$.
          </span>
        </div>

        {/* People Count Slider & Input */}
        <div className="form-field-group">
          <div className="field-label-row">
            <label htmlFor="people-count-input">People to Evacuate ($N$)</label>
            <span className={`capacity-status-chip ${isCapacityBreached ? "chip-breached" : "chip-ok"}`}>
              {isCapacityBreached ? "Capacity Warning" : "Within Capacity"}
            </span>
          </div>

          <div className="people-input-row">
            <div className="people-number-wrap">
              <IconUsers size={16} className="people-icon" />
              <input
                id="people-count-input"
                type="number"
                min="1"
                max="500"
                value={people}
                onChange={e => setPeople(Math.max(1, parseInt(e.target.value) || 1))}
                className="custom-number-input"
              />
            </div>
            <div className="quick-people-presets">
              {[50, 100, 150, 220].map(val => (
                <button
                  key={val}
                  type="button"
                  className={`preset-btn ${people === val ? "preset-active" : ""}`}
                  onClick={() => setPeople(val)}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          <input
            type="range"
            min="10"
            max="300"
            step="5"
            value={people}
            onChange={e => setPeople(parseInt(e.target.value))}
            className="custom-range-slider"
          />

          <div className="slider-limits">
            <span>10 evacuees</span>
            <span className="slider-total-cap">
              Reachable Cap: <strong>{currentReachableCap}</strong>
            </span>
            <span>300</span>
          </div>
        </div>

        {/* Compute Route Primary Button */}
        <button
          type="button"
          className="btn-compute-route"
          onClick={onCalculate}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="btn-spinner"></span>
              <span>Running BFS & Capacity Allocation...</span>
            </>
          ) : (
            <>
              <IconRoute size={18} />
              <span>Calculate Safe Route</span>
              <IconArrowRight size={16} className="btn-arrow" />
            </>
          )}
        </button>

        {/* Discrete Mathematics Concepts Collapsible */}
        <div className="dm-theory-accordion">
          <button
            type="button"
            className="theory-toggle-header"
            onClick={() => setShowTheory(!showTheory)}
          >
            <span className="theory-title">
              <IconCpu size={14} />
              <span>Discrete Mathematics Principles</span>
            </span>
            <span className="theory-toggle-icon">{showTheory ? "−" : "+"}</span>
          </button>

          {showTheory && (
            <div className="theory-grid">
              <div className="theory-card">
                <span className="theory-term">Graph Modeling</span>
                <p>Rooms form vertex set $V$, hallways form edge set $E \subseteq V \times V$.</p>
              </div>

              <div className="theory-card">
                <span className="theory-term">BFS Algorithm</span>
                <p>Level-order traversal computes shortest path $\delta(v_0, \text{Exit})$.</p>
              </div>

              <div className="theory-card">
                <span className="theory-term">Warshall's Closure</span>
                <p>Computes transitive reachability $W = R^+$ under active hazard edge cuts.</p>
              </div>

              <div className="theory-card">
                <span className="theory-term">Pigeonhole Allocation</span>
                <p>If $N &gt; \sum c_i$, $\exists \text{ exit } e$ where load exceeds safe threshold.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
