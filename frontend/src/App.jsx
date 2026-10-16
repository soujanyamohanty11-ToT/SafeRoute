import React, { useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath
} from "reactflow";

import "reactflow/dist/style.css";
import "./style.css";

const API = "http://127.0.0.1:8000";

function BlockedEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd
}) {
  const [hovered, setHovered] = useState(false);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  });

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: "#ef4444",
          strokeWidth: 3,
          strokeDasharray: "6 4"
        }}
      />

      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={22}
        style={{
          pointerEvents: "stroke",
          cursor: "help"
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

      {hovered && (
        <EdgeLabelRenderer>
          <div
            className="blocked-edge-tooltip"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`
            }}
          >
            <span className="blocked-icon">!</span>
            <div className="tooltip-content">
              <strong>Path Blocked</strong>
              <span>{data?.reason || "Route unavailable"}</span>
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const edgeTypes = {
  blocked: BlockedEdge
};

export default function App() {
  // Navigation & Base State
  const [activeTab, setActiveTab] = useState("evacuation"); // 'evacuation' | 'responder'
  const [building, setBuilding] = useState(null);
  const [emergencies, setEmergencies] = useState({});

  // Unified Evacuation & Risk State
  const [start, setStart] = useState("lab1");
  const [emergency, setEmergency] = useState("fire");
  const [people, setPeople] = useState(100);
  const [simulatedBlockages, setSimulatedBlockages] = useState([]);
  
  const [evacResult, setEvacResult] = useState(null);
  const [riskResult, setRiskResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // First Responder State
  const [entryPoint, setEntryPoint] = useState("exit1");
  const [incidentLoc, setIncidentLoc] = useState("lab1");
  const [responderData, setResponderData] = useState(null);
  const [responderLoading, setResponderLoading] = useState(false);

  /* =========================
     LOAD INITIAL DATA
  ========================= */
  useEffect(() => {
    Promise.all([
      fetch(`${API}/building`).then(r => r.json()),
      fetch(`${API}/emergencies`).then(r => r.json())
    ])
      .then(([b, e]) => {
        setBuilding(b);
        setEmergencies(e);
      })
      .catch(error => {
        console.error("Backend connection error:", error);
      });
  }, []);

  /* =========================
     NODE MAP
  ========================= */
  const nodeMap = useMemo(() => {
    const map = {};
    building?.nodes.forEach(n => {
      map[n.id] = n;
    });
    return map;
  }, [building]);

  /* =========================
     MAP NODES
  ========================= */
  const nodes = useMemo(() => {
    if (!building) return [];

    const reachableExits = new Set(evacResult?.reachable_exits || []);
    const unreachableRooms = new Set(riskResult?.unreachable_rooms || []);
    const responderPrimary = new Set(responderData?.primary_route || []);

    return building.nodes.map(n => {
      const isExit = n.id.startsWith("exit");
      const isUnavailableExit = isExit && evacResult && !reachableExits.has(n.id);
      const isEvacRouteNode = evacResult?.route?.includes(n.id);
      const isUnreachableRoom = unreachableRooms.has(n.id);
      const isResponderNode = activeTab === "responder" && responderPrimary.has(n.id);

      let borderStyle = "1px solid #cbd5e1";
      let bgStyle = "#fff";
      let textColor = "#0f172a";

      if (isUnreachableRoom) {
        borderStyle = "3px solid #dc2626";
        bgStyle = "#fee2e2";
        textColor = "#991b1b";
      } else if (isResponderNode) {
        borderStyle = "3px solid #2563eb";
        bgStyle = "#dbeafe";
        textColor = "#1e40af";
      } else if (isUnavailableExit) {
        borderStyle = "2px solid #f87171";
        bgStyle = "#fee2e2";
        textColor = "#991b1b";
      } else if (isEvacRouteNode && activeTab === "evacuation") {
        borderStyle = "3px solid #16a34a";
        bgStyle = "#dcfce7";
      } else if (isExit) {
        borderStyle = "2px solid #22c55e";
        bgStyle = "#dcfce7";
      }

      return {
        id: n.id,
        position: { x: n.x, y: n.y },
        data: { label: n.label },
        style: {
          padding: 12,
          borderRadius: 12,
          border: borderStyle,
          background: bgStyle,
          color: textColor,
          fontWeight: 600,
          boxShadow: isEvacRouteNode || isResponderNode
            ? "0 4px 14px rgba(0,0,0,0.15)"
            : "0 2px 8px rgba(15,23,42,0.06)"
        }
      };
    });
  }, [building, evacResult, riskResult, activeTab, responderData]);

  /* =========================
     MAP EDGES
  ========================= */
  const edges = useMemo(() => {
    if (!building) return [];

    const baseBlocked = new Set(
      (evacResult?.blocked_edges || []).map(e => [...e].sort().join("-"))
    );

    const simBlockedSet = new Set(
      simulatedBlockages.map(([u, v]) => [u, v].sort().join("-"))
    );

    const responderEdges = new Set();
    if (responderData?.primary_route) {
      const p = responderData.primary_route;
      for (let i = 0; i < p.length - 1; i++) {
        responderEdges.add([p[i], p[i + 1]].sort().join("-"));
      }
    }

    const emergencyLabel =
      emergencies?.[emergency]?.label?.toLowerCase() || emergency.toLowerCase();

    let blockedReason = "This corridor is unavailable during the selected emergency.";
    if (emergencyLabel.includes("flood")) blockedReason = "Flooding has made this corridor inaccessible.";
    else if (emergencyLabel.includes("earthquake")) blockedReason = "Structural damage has blocked this corridor.";
    else if (emergencyLabel.includes("fire")) blockedReason = "Fire or smoke has made this corridor unsafe.";

    return building.edges.map(([a, b], i) => {
      const key = [a, b].sort().join("-");
      const isBaseBlocked = baseBlocked.has(key);
      const isSimBlocked = simBlockedSet.has(key);
      const isBlocked = isBaseBlocked || isSimBlocked;

      const inEvacRoute =
        activeTab === "evacuation" &&
        evacResult?.route?.includes(a) &&
        evacResult?.route?.includes(b) &&
        Math.abs(evacResult.route.indexOf(a) - evacResult.route.indexOf(b)) === 1;

      const inResponderRoute = activeTab === "responder" && responderEdges.has(key);

      let edgeColor = "#cbd5e1";
      if (isBlocked) edgeColor = "#ef4444";
      else if (inResponderRoute) edgeColor = "#2563eb";
      else if (inEvacRoute) edgeColor = "#16a34a";

      return {
        id: `e${i}`,
        source: a,
        target: b,
        type: isBlocked ? "blocked" : "default",
        data: {
          reason: isSimBlocked
            ? "Simulated corridor blockage."
            : isBlocked
            ? blockedReason
            : null
        },
        style: {
          stroke: edgeColor,
          strokeWidth: inEvacRoute || inResponderRoute ? 4 : 2
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edgeColor
        }
      };
    });
  }, [building, evacResult, emergency, emergencies, activeTab, simulatedBlockages, responderData]);

  /* =========================
     COMBINED CALCULATIONS
  ========================= */
  async function calculateCombinedEvacuationAndRisk() {
    setLoading(true);
    try {
      // Run Evacuation Path Request
      const evacRes = await fetch(`${API}/evacuation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start,
          emergency,
          people: Number(people),
          simulated_blockages: simulatedBlockages
        })
      });
      const evacData = await evacRes.json();
      setEvacResult(evacData);

      // Run Risk Analysis Simulation Request
      const riskRes = await fetch(`${API}/risk-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          simulated_blocked_corridors: simulatedBlockages
        })
      });
      const riskData = await riskRes.json();
      setRiskResult(riskData);

    } catch (error) {
      console.error("Combined Evacuation & Risk calculation error:", error);
    }
    setLoading(false);
  }

  async function calculateResponderPath() {
    setResponderLoading(true);
    try {
      const response = await fetch(`${API}/responder-path`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entry_point: entryPoint,
          incident_location: incidentLoc,
          simulated_blockages: simulatedBlockages
        })
      });
      const data = await response.json();
      setResponderData(data);
    } catch (error) {
      console.error("First responder path calculation error:", error);
    }
    setResponderLoading(false);
  }

  const toggleSimulatedBlockage = ([u, v]) => {
    const pairKey = [u, v].sort().join("-");
    const exists = simulatedBlockages.some(
      ([x, y]) => [x, y].sort().join("-") === pairKey
    );
    if (exists) {
      setSimulatedBlockages(
        simulatedBlockages.filter(([x, y]) => [x, y].sort().join("-") !== pairKey)
      );
    } else {
      setSimulatedBlockages([...simulatedBlockages, [u, v]]);
    }
  };

  const selectAllBlockages = () => {
    if (!building) return;
    const allEdges = building.edges.map(([u, v]) => [u, v]);
    setSimulatedBlockages(allEdges);
  };

  const clearAllBlockages = () => {
    setSimulatedBlockages([]);
  };

  if (!building) {
    return (
      <div className="loading-screen">
        <div className="loading-card">
          <div className="loading-icon">⌁</div>
          <h2>Loading SafeRoute</h2>
          <p>Preparing the building evacuation network...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* HEADER */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">⌂</div>
          <div>
            <h1>SafeRoute</h1>
            <p>Smart Emergency Evacuation & Risk System</p>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="module-tabs" style={{ display: "flex", gap: "10px" }}>
          <button
            className={`calculate-button ${activeTab === "evacuation" ? "active-tab" : ""}`}
            onClick={() => setActiveTab("evacuation")}
            style={{ padding: "8px 16px" }}
          >
            Evacuation & Risk Analysis
          </button>
          <button
            className={`calculate-button ${activeTab === "responder" ? "active-tab" : ""}`}
            onClick={() => setActiveTab("responder")}
            style={{ padding: "8px 16px" }}
          >
            First Responder Path
          </button>
        </div>

        <div className="header-right">
          <div className="system-status">
            <span className="status-dot"></span>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main>
        <div className="page-intro">
          <div>
            <p className="eyebrow">EMERGENCY RESPONSE DASHBOARD</p>
            <h2>
              {activeTab === "evacuation" && "Evacuation Route & Risk Analysis"}
              {activeTab === "responder" && "First Responder Entry Route"}
            </h2>
            <p>
              {activeTab === "evacuation" && "Calculates optimal evacuation routes, checks exit capacity, and evaluates network risk scores under simulated corridor failure scenarios."}
              {activeTab === "responder" && "Calculates optimal entry routes for incoming emergency responders while monitoring shared corridor traffic."}
            </p>
          </div>

          <div className="quick-info">
            <div>
              <strong>{building.nodes.length}</strong>
              <span>Locations</span>
            </div>
            <div>
              <strong>{building.edges.length}</strong>
              <span>Connections</span>
            </div>
          </div>
        </div>

        {/* DASHBOARD GRID */}
        <div className="dashboard-grid">
          {/* CONTROL PANEL */}
          <section className="panel controls">
            {activeTab === "evacuation" && (
              <>
                <div className="panel-heading">
                  <div className="panel-icon">⚙</div>
                  <div>
                    <h2>Emergency & Risk Controls</h2>
                    <p>Configure evacuation settings and test corridor failures.</p>
                  </div>
                </div>

                <div className="form-group">
                  <label>Starting Location</label>
                  <select value={start} onChange={e => setStart(e.target.value)}>
                    {building.nodes
                      .filter(n => !n.id.startsWith("exit"))
                      .map(n => (
                        <option key={n.id} value={n.id}>{n.label}</option>
                      ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Emergency Type</label>
                  <select value={emergency} onChange={e => setEmergency(e.target.value)}>
                    {Object.entries(emergencies).map(([id, e]) => (
                      <option key={id} value={id}>{e.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>People to Evacuate</label>
                  <input
                    type="number"
                    min="1"
                    value={people}
                    onChange={e => setPeople(e.target.value)}
                  />
                </div>

                {/* SIMULATED CORRIDOR BLOCKAGES */}
                <div className="form-group" style={{ marginTop: "14px" }}>
                  <div className="corridor-header">
                    <label style={{ margin: 0 }}>Simulate Blocked Corridors:</label>
                    <div className="corridor-actions">
                      <button 
                        type="button" 
                        className="text-btn" 
                        onClick={selectAllBlockages}
                        title="Block all corridors"
                      >
                        Select All
                      </button>
                      <span>•</span>
                      <button 
                        type="button" 
                        className="text-btn" 
                        onClick={clearAllBlockages}
                        title="Unblock all corridors"
                      >
                        Unselect All
                      </button>
                    </div>
                  </div>

                  <div className="corridor-list-container">
                    {building.edges.map(([u, v], idx) => {
                      const pairKey = [u, v].sort().join("-");
                      const checked = simulatedBlockages.some(
                        ([x, y]) => [x, y].sort().join("-") === pairKey
                      );
                      return (
                        <label key={idx} className="corridor-checkbox-card">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSimulatedBlockage([u, v])}
                          />
                          <span className="corridor-label">
                            {nodeMap[u]?.label || u} ↔ {nodeMap[v]?.label || v}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <button className="calculate-button" onClick={calculateCombinedEvacuationAndRisk} disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Calculating Route & Risk...
                    </>
                  ) : (
                    <>
                      Calculate Route & Analyze Risk <span>→</span>
                    </>
                  )}
                </button>

                {/* DISCRETE MATH CONCEPTS */}
                <div className="concept-box" style={{ marginTop: "16px" }}>
                  <div className="concept-title">
                    <span>◇</span>
                    Discrete Mathematics Behind It
                  </div>

                  <div className="concept-grid">
                    <div className="concept">
                      <strong>Graphs</strong>
                      <span>Rooms become vertices and corridors become edges.</span>
                    </div>

                    <div className="concept">
                      <strong>BFS</strong>
                      <span>Finds shortest paths from start locations to exits.</span>
                    </div>

                    <div className="concept">
                      <strong>Warshall</strong>
                      <span>Checks reachability across all graph node pairs.</span>
                    </div>

                    <div className="concept">
                      <strong>Logic & Risk</strong>
                      <span>Applies Boolean blockage constraints and risk scoring.</span>
                    </div>

                    <div className="concept">
                      <strong>Pigeonhole</strong>
                      <span>Identifies when people exceed exit capacities.</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === "responder" && (
              <>
                <div className="panel-heading">
                  <div className="panel-icon">🚒</div>
                  <div>
                    <h2>Responder Dispatch</h2>
                    <p>Plan entry path into building incident zone.</p>
                  </div>
                </div>

                <div className="form-group">
                  <label>Entry Point (Exit/Access Door)</label>
                  <select value={entryPoint} onChange={e => setEntryPoint(e.target.value)}>
                    {building.nodes.map(n => (
                      <option key={n.id} value={n.id}>{n.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Incident Location</label>
                  <select value={incidentLoc} onChange={e => setIncidentLoc(e.target.value)}>
                    {building.nodes
                      .filter(n => !n.id.startsWith("exit"))
                      .map(n => (
                        <option key={n.id} value={n.id}>{n.label}</option>
                      ))}
                  </select>
                </div>

                <button className="calculate-button" onClick={calculateResponderPath} disabled={responderLoading}>
                  {responderLoading ? "Routing Responders..." : "Find Entry Path →"}
                </button>
              </>
            )}
          </section>

          {/* BUILDING MAP */}
          <section className="panel map">
            <div className="panel-heading">
              <div className="panel-icon">⌖</div>
              <div>
                <h2>Building Map</h2>
                <p>Live visualization of the building graph.</p>
              </div>

              <div className="legend">
                <span><i className="legend-green"></i> Safe Route</span>
                <span><i className="legend-red"></i> Blocked</span>
              </div>
            </div>

            <div className="flow">
              <ReactFlow nodes={nodes} edges={edges} edgeTypes={edgeTypes} fitView fitViewOptions={{ padding: 0.2 }}>
                <Background />
                <Controls />
              </ReactFlow>
            </div>

            <div className="map-tip">
              <span>ⓘ</span>
              Green paths indicate recommended routes. Hover over red dashed corridors to view blockage reasons. Red rooms indicate disconnected zones during risk analysis.
            </div>
          </section>

          {/* COMBINED ANALYSIS PANEL */}
          <section className="panel analysis">
            <div className="panel-heading">
              <div className="panel-icon">↗</div>
              <div>
                <h2>Evacuation & Risk Analysis</h2>
                <p>Results from routing algorithms and resilience tests.</p>
              </div>
            </div>

            {activeTab === "evacuation" && (
              !evacResult ? (
                <div className="empty-state">
                  <div className="empty-icon">⌁</div>
                  <h3>Ready to calculate</h3>
                  <p>Configure parameters and click <b>Calculate Route & Analyze Risk</b>.</p>
                </div>
              ) : (
                <div className="results">
                  {/* EVACUATION STATUS */}
                  <div className={`result-status ${evacResult.reachable ? "success" : "danger"}`}>
                    <span>●</span>
                    <div>
                      <strong>{evacResult.reachable ? "Safe route found" : "No reachable exit"}</strong>
                      <small>{evacResult.recommendation_reason}</small>
                    </div>
                  </div>

                  {/* SIMULATED RISK SCORE BANNER */}
                  {riskResult && (
                    <div className="result-status success" style={{ background: "#fef3c7", borderColor: "#f59e0b", marginTop: "10px" }}>
                      <span>●</span>
                      <div>
                        <strong style={{ color: "#b45309" }}>Simulated Risk Score: {riskResult.risk_score} / 100</strong>
                        <small style={{ display: "block", fontSize: "0.75rem", color: "#78350f" }}>
                          *Simulated graph-based risk score, not a prediction of actual injuries or deaths.
                        </small>
                      </div>
                    </div>
                  )}

                  {/* METRICS */}
                  <div className="metrics" style={{ marginTop: "12px" }}>
                    <div className="metric-card">
                      <small>RECOMMENDED EXIT</small>
                      <strong>{nodeMap[evacResult.recommended_exit]?.label || "None"}</strong>
                    </div>

                    <div className="metric-card">
                      <small>DISCONNECTED ROOMS</small>
                      <strong>{riskResult?.unreachable_rooms?.length || 0}</strong>
                    </div>
                  </div>

                  {/* RECOMMENDED ROUTE */}
                  <div className="route-card" style={{ marginTop: "12px" }}>
                    <small>RECOMMENDED ROUTE</small>
                    <div className="route">
                      {evacResult.route.map((id, index) => (
                        <React.Fragment key={id}>
                          <span className="route-node">{nodeMap[id]?.label}</span>
                          {index < evacResult.route.length - 1 && <span className="route-arrow">→</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  {/* EXIT CAPACITY */}
                  {evacResult.allocation && (
                    <div className="capacity-section" style={{ marginTop: "12px" }}>
                      <div className="section-title">Exit Capacity Allocation</div>
                      {Object.entries(evacResult.allocation).map(([id, x]) => (
                        <div className="capacity" key={id}>
                          <div className="capacity-name">
                            <span className="capacity-icon">⇥</span>
                            {nodeMap[id]?.label}
                          </div>

                          <div className="capacity-bar">
                            <div style={{ width: `${Math.min((x.assigned / x.capacity) * 100, 100)}%` }}></div>
                          </div>

                          <strong>{x.assigned}/{x.capacity}</strong>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* RISK RESTORATION SUGGESTIONS */}
                  {riskResult?.suggestions?.length > 0 && (
                    <div className="route-card" style={{ marginTop: "12px" }}>
                      <small>RESTORATION SUGGESTIONS</small>
                      <ul style={{ paddingLeft: "18px", marginTop: "6px", fontSize: "0.85rem" }}>
                        {riskResult.suggestions.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )
            )}

            {activeTab === "responder" && (
              !responderData ? (
                <div className="empty-state">
                  <div className="empty-icon">🚒</div>
                  <h3>Ready for dispatch</h3>
                  <p>Select entry point and incident location to route responders.</p>
                </div>
              ) : (
                <div className="results">
                  {responderData.status === "No route available" ? (
                    <div className="result-status danger">
                      <span>●</span>
                      <div>
                        <strong>No Route Available</strong>
                        <small>Incident location is isolated by blocked corridors.</small>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="result-status success">
                        <span>●</span>
                        <div>
                          <strong>Responder Path Secured</strong>
                          <small>Clear entry route found to incident location.</small>
                        </div>
                      </div>

                      <div className="route-card" style={{ marginTop: "12px" }}>
                        <small>PRIMARY ENTRY PATH</small>
                        <div className="route">
                          {responderData.primary_route.map(id => nodeMap[id]?.label || id).join(" ➔ ")}
                        </div>

                        {responderData.alternative_route?.length > 0 && (
                          <>
                            <small style={{ marginTop: "12px", display: "block" }}>ALTERNATIVE PATH</small>
                            <div className="route">
                              {responderData.alternative_route.map(id => nodeMap[id]?.label || id).join(" ➔ ")}
                            </div>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            )}
          </section>
        </div>
      </main>

      {/* FOOTER */}
      <footer>
        <div>
          <strong>SafeRoute</strong>
          <span>Graph-based emergency evacuation using BFS, Warshall's algorithm, relations, logical constraints and capacity allocation.</span>
        </div>
        <span className="footer-tag">Built on a foundation of safety</span>
      </footer>
    </div>
  );
}