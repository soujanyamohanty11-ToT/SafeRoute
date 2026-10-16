import React, { useState } from "react";
import {
  IconRoute,
  IconMatrix,
  IconUsers,
  IconFileText,
  IconCheckCircle,
  IconXCircle,
  IconAlertTriangle,
  IconArrowRight,
  IconDoorOpen,
  IconCopy,
  IconPrinter
} from "./Icons";

export default function AnalysisPanel({
  result,
  building,
  start,
  emergency,
  emergencies,
  people,
  onSelectAlternativeRoute,
  highlightedExitRoute,
  onOpenProtocolModal
}) {
  const [activeTab, setActiveTab] = useState("route");
  const [hoveredCell, setHoveredCell] = useState(null);
  const [copied, setCopied] = useState(false);

  const nodeMap = React.useMemo(() => {
    const map = {};
    building?.nodes?.forEach(n => {
      map[n.id] = n;
    });
    return map;
  }, [building]);

  if (!result) {
    return (
      <section className="analysis-panel-card empty-panel">
        <div className="empty-content">
          <div className="empty-badge-circle">
            <IconRoute size={28} />
          </div>
          <h3>System Ready</h3>
          <p>
            Select an origin location and emergency scenario, then click{" "}
            <strong>Calculate Safe Route</strong> to compute graph paths and reachability matrices.
          </p>
        </div>
      </section>
    );
  }

  const {
    route,
    recommended_exit,
    reachable_exits = [],
    allocation = {},
    unallocated = 0,
    reachable,
    routes_by_exit = {},
    total_reachable_capacity = 0,
    congestion_ratio = 1,
    reachability_matrix = [],
    nodes = []
  } = result;

  const currentScenario = emergencies?.[emergency];

  // Helper for copying route directive
  const handleCopyDirective = () => {
    const exitLabel = nodeMap[recommended_exit]?.label || recommended_exit;
    const pathStr = route.map(id => nodeMap[id]?.label || id).join(" → ");
    const text = `SAFEPATH EVACUATION DIRECTIVE\nScenario: ${currentScenario?.label || emergency}\nOrigin: ${nodeMap[start]?.label || start}\nRecommended Exit: ${exitLabel}\nPath: ${pathStr}\nPeople: ${people} (Capacity: ${total_reachable_capacity})`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="analysis-panel-card">
      {/* Tab Navigation */}
      <div className="analysis-tabs-bar">
        <button
          type="button"
          className={`tab-btn ${activeTab === "route" ? "active-tab" : ""}`}
          onClick={() => setActiveTab("route")}
        >
          <IconRoute size={14} />
          <span>Route</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "matrix" ? "active-tab" : ""}`}
          onClick={() => setActiveTab("matrix")}
        >
          <IconMatrix size={14} />
          <span>Warshall</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "capacity" ? "active-tab" : ""}`}
          onClick={() => setActiveTab("capacity")}
        >
          <IconUsers size={14} />
          <span>Pigeonhole</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "directive" ? "active-tab" : ""}`}
          onClick={() => setActiveTab("directive")}
        >
          <IconFileText size={14} />
          <span>Directive</span>
        </button>
      </div>

      <div className="analysis-tab-content">
        {/* ========================================================
            TAB 1: ROUTE ANALYSIS & ALTERNATIVES
           ======================================================== */}
        {activeTab === "route" && (
          <div className="tab-pane tab-route">
            {/* Feasibility Alert Status */}
            <div className={`status-callout ${reachable ? "callout-success" : "callout-danger"}`}>
              <div className="callout-icon">
                {reachable ? <IconCheckCircle size={18} /> : <IconXCircle size={18} />}
              </div>
              <div className="callout-body">
                <strong>{reachable ? "Safe Route Identified" : "No Accessible Route"}</strong>
                <p>
                  {reachable
                    ? `BFS determined an uncompromised path to ${nodeMap[recommended_exit]?.label || recommended_exit}.`
                    : "All paths to building exits are blocked under the current edge cut."}
                </p>
              </div>
            </div>

            {reachable && (
              <>
                {/* Primary Route Walkthrough Pills */}
                <div className="route-flow-box">
                  <div className="box-heading-row">
                    <span className="box-label">RECOMMENDED BFS PATH</span>
                    <span className="box-tag">{route.length - 1} Hops • ~{(route.length - 1) * 15}s</span>
                  </div>

                  <div className="step-pills-row">
                    {route.map((nodeId, idx) => {
                      const isFirst = idx === 0;
                      const isLast = idx === route.length - 1;
                      const nodeLabel = nodeMap[nodeId]?.label || nodeId;

                      return (
                        <React.Fragment key={nodeId}>
                          <div
                            className={`step-pill ${isFirst ? "pill-start" : isLast ? "pill-exit" : "pill-corridor"}`}
                            title={`${nodeLabel} (${nodeId})`}
                          >
                            <span className="step-idx">{idx + 1}</span>
                            <span className="step-name">{nodeLabel}</span>
                          </div>
                          {!isLast && <IconArrowRight size={13} className="step-chevron" />}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* Alternative Routes Comparison */}
                {Object.keys(routes_by_exit).length > 1 && (
                  <div className="alternative-routes-box">
                    <div className="box-heading-row">
                      <span className="box-label">REACHABLE EXITS COMPARISON</span>
                      <span className="box-sub">Click route to inspect on graph</span>
                    </div>

                    <div className="alternatives-list">
                      {Object.entries(routes_by_exit).map(([exitId, data]) => {
                        const isRecommended = exitId === recommended_exit;
                        const isCurrentlyHighlighted =
                          highlightedExitRoute &&
                          highlightedExitRoute[highlightedExitRoute.length - 1] === exitId;

                        return (
                          <div
                            key={exitId}
                            className={`alt-route-card ${isRecommended ? "alt-recommended" : ""} ${isCurrentlyHighlighted ? "alt-active" : ""}`}
                            onClick={() => onSelectAlternativeRoute(data.route)}
                          >
                            <div className="alt-left">
                              <div className="alt-title-row">
                                <span className="alt-exit-name">{data.exit_label}</span>
                                {isRecommended && <span className="alt-star-badge">Best Choice</span>}
                              </div>
                              <span className="alt-path-preview">
                                {data.route.map(id => nodeMap[id]?.label || id).join(" → ")}
                              </span>
                            </div>

                            <div className="alt-metrics">
                              <span className="metric-hops">{data.hops} hops</span>
                              <span className="metric-time">~{data.estimated_seconds}s</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Exit Capacity Allocation Bars */}
                <div className="capacity-breakdown-box">
                  <div className="box-heading-row">
                    <span className="box-label">EXIT CAPACITY DISCHARGE</span>
                    <span className="box-sub">Reachable: {total_reachable_capacity} capacity</span>
                  </div>

                  <div className="capacity-bars-list">
                    {Object.entries(allocation).map(([exitId, allocData]) => {
                      const pct = Math.min(100, Math.round((allocData.assigned / allocData.capacity) * 100));
                      const isFull = allocData.assigned >= allocData.capacity;

                      return (
                        <div key={exitId} className="capacity-row">
                          <div className="capacity-label-wrap">
                            <span className="exit-badge-tag">{nodeMap[exitId]?.label || exitId}</span>
                            <span className="capacity-fraction">
                              {allocData.assigned} / {allocData.capacity} evacuees
                            </span>
                          </div>

                          <div className="capacity-track">
                            <div
                              className={`capacity-fill ${isFull ? "fill-full" : "fill-optimal"}`}
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Unallocated Warning if Pigeonhole overflow occurs */}
                {unallocated > 0 && (
                  <div className="overflow-warning-box">
                    <IconAlertTriangle size={16} />
                    <div className="overflow-text">
                      <strong>Exit Capacity Overflow</strong>
                      <p>
                        {unallocated} evacuees exceed available exit capacity. Stagger evacuation intervals or activate secondary muster paths.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 2: WARSHALL'S ALGORITHM REACHABILITY MATRIX
           ======================================================== */}
        {activeTab === "matrix" && (
          <div className="tab-pane tab-matrix">
            <div className="matrix-explainer">
              <div className="explainer-header">
                <span className="explainer-badge">WARSHALL'S TRANSITIVE CLOSURE</span>
                <span className="explainer-sub">Computes reachability relation $R^+$</span>
              </div>
              <p className="explainer-text">
                Evaluates whether a directed path exists between any pair $(v_i, v_j)$ under the active hazard edge cuts.
              </p>
              <div className="matrix-formula-tag">
                <code>W[i][j] = W[i][j] ∨ (W[i][k] ∧ W[k][j])</code>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="matrix-table-scroll">
              <table className="warshall-table">
                <thead>
                  <tr>
                    <th className="corner-th">From \ To</th>
                    {nodes.map(n => (
                      <th
                        key={n}
                        className={`col-th ${hoveredCell?.to === n ? "th-highlight" : ""}`}
                        title={nodeMap[n]?.label || n}
                      >
                        {nodeMap[n]?.label?.replace(" ", "") || n}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {nodes.map((fromNode, rowIdx) => (
                    <tr key={fromNode}>
                      <th
                        className={`row-th ${hoveredCell?.from === fromNode ? "th-highlight" : ""}`}
                        title={nodeMap[fromNode]?.label || fromNode}
                      >
                        {nodeMap[fromNode]?.label || fromNode}
                      </th>
                      {nodes.map((toNode, colIdx) => {
                        const isReachable = reachability_matrix?.[rowIdx]?.[colIdx];
                        const isSelf = fromNode === toNode;
                        const isHovered =
                          hoveredCell?.from === fromNode && hoveredCell?.to === toNode;

                        return (
                          <td
                            key={toNode}
                            className={`matrix-cell ${isReachable ? "cell-reachable" : "cell-blocked"} ${isSelf ? "cell-self" : ""} ${isHovered ? "cell-hovered" : ""}`}
                            onMouseEnter={() =>
                              setHoveredCell({
                                from: fromNode,
                                to: toNode,
                                fromLabel: nodeMap[fromNode]?.label || fromNode,
                                toLabel: nodeMap[toNode]?.label || toNode,
                                reachable: isReachable
                              })
                            }
                            onMouseLeave={() => setHoveredCell(null)}
                          >
                            {isReachable ? "1" : "0"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Matrix Cell Hover Tooltip / Status */}
            <div className="matrix-hover-inspector">
              {hoveredCell ? (
                <div className="inspector-active">
                  <span className={`inspector-dot ${hoveredCell.reachable ? "dot-success" : "dot-danger"}`}></span>
                  <span>
                    <strong>{hoveredCell.fromLabel}</strong> → <strong>{hoveredCell.toLabel}</strong>:{" "}
                    {hoveredCell.reachable ? "Reachable (Valid Path Exists)" : "Unreachable (Cut by Hazard)"}
                  </span>
                </div>
              ) : (
                <span className="inspector-placeholder">
                  Hover over any matrix cell (row $i$, column $j$) to inspect connectivity.
                </span>
              )}
            </div>

            <div className="matrix-stats-row">
              <div className="m-stat">
                <span className="m-val">{nodes.length}</span>
                <span className="m-lbl">Vertices ($|V|$)</span>
              </div>
              <div className="m-stat">
                <span className="m-val">{reachable_exits.length}</span>
                <span className="m-lbl">Safe Exits</span>
              </div>
              <div className="m-stat">
                <span className="m-val">
                  {Math.round(
                    (reachability_matrix.flat().filter(Boolean).length /
                      (nodes.length * nodes.length || 1)) *
                      100
                  )}
                  %
                </span>
                <span className="m-lbl">Reachability Density</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 3: PIGEONHOLE PRINCIPLE CAPACITY ANALYSIS
           ======================================================== */}
        {activeTab === "capacity" && (
          <div className="tab-pane tab-pigeonhole">
            <div className="pigeonhole-card">
              <div className="pigeonhole-header">
                <span className="dm-badge-small">THEORETICAL ANALYSIS</span>
                <h4>The Generalized Pigeonhole Principle</h4>
              </div>

              <div className="dm-math-formula">
                <p>
                  If <strong>N = {people}</strong> evacuees are assigned across{" "}
                  <strong>k = {reachable_exits.length}</strong> accessible exit channels with combined safe throughput{" "}
                  <strong>C = {total_reachable_capacity}</strong>:
                </p>
                <div className="formula-box">
                  <code>
                    Congestion Index ρ = N / C = {people} / {total_reachable_capacity} = {congestion_ratio}
                  </code>
                </div>
              </div>

              <div className="pigeonhole-verdict">
                {congestion_ratio <= 1.0 ? (
                  <div className="verdict-banner banner-safe">
                    <IconCheckCircle size={18} />
                    <div>
                      <strong>Safe Evacuation Envelope (ρ ≤ 1.0)</strong>
                      <p>
                        Total reachable exit capacity ({total_reachable_capacity}) exceeds or equals evacuee count ({people}). No involuntary overcrowding occurs.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="verdict-banner banner-overflow">
                    <IconAlertTriangle size={18} />
                    <div>
                      <strong>Pigeonhole Capacity Exceeded (ρ &gt; 1.0)</strong>
                      <p>
                        By the generalized Pigeonhole Principle, at least one exit channel must bear traffic exceeding safe hourly throughput by at least{" "}
                        <code>⌈{people} / {total_reachable_capacity}⌉</code> times nominal limit.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="capacity-metric-cards">
                <div className="c-card">
                  <span className="c-label">EVACUEE POPULATION</span>
                  <strong className="c-num">{people}</strong>
                  <span className="c-sub">Total occupants</span>
                </div>

                <div className="c-card">
                  <span className="c-label">TOTAL REACHABLE CAP</span>
                  <strong className="c-num">{total_reachable_capacity}</strong>
                  <span className="c-sub">{reachable_exits.length} available exits</span>
                </div>

                <div className="c-card">
                  <span className="c-label">OVERFLOW COUNT</span>
                  <strong className={`c-num ${unallocated > 0 ? "c-danger" : "c-ok"}`}>
                    {unallocated}
                  </strong>
                  <span className="c-sub">Unassigned occupants</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 4: EMERGENCY DIRECTIVE & ACTION PROTOCOL
           ======================================================== */}
        {activeTab === "directive" && (
          <div className="tab-pane tab-directive">
            <div className="directive-card">
              <div className="directive-header">
                <div>
                  <h4>Campus Evacuation Directive</h4>
                  <span className="directive-date">Automated Operational Protocol</span>
                </div>
                <div className="directive-actions">
                  <button
                    type="button"
                    className="dir-action-btn"
                    onClick={handleCopyDirective}
                    title="Copy Directive to Clipboard"
                  >
                    <IconCopy size={13} />
                    <span>{copied ? "Copied!" : "Copy"}</span>
                  </button>
                  <button
                    type="button"
                    className="dir-action-btn"
                    onClick={onOpenProtocolModal}
                    title="Print Formal Protocol Sheet"
                  >
                    <IconPrinter size={13} />
                    <span>Print</span>
                  </button>
                </div>
              </div>

              <div className="directive-section">
                <span className="dir-sec-label">HAZARD ADVISORY</span>
                <p className="dir-sec-text">
                  <strong>{currentScenario?.label || emergency}:</strong>{" "}
                  {currentScenario?.description || "Compromised corridor safety detected."}
                </p>
                {currentScenario?.advisory && (
                  <p className="dir-sec-notice">{currentScenario.advisory}</p>
                )}
              </div>

              <div className="directive-section">
                <span className="dir-sec-label">DESIGNATED MUSTER ZONE</span>
                <p className="dir-sec-text">
                  Exit via <strong>{nodeMap[recommended_exit]?.label || recommended_exit}</strong>.{" "}
                  {recommended_exit === "exitA" && "Proceed to North Quadrangle Assembly Zone A."}
                  {recommended_exit === "exitB" && "Proceed to West Courtyard Assembly Zone B."}
                  {recommended_exit === "exitC" && "Proceed to South Sports Ground Assembly Zone C."}
                </p>
              </div>

              <div className="directive-section">
                <span className="dir-sec-label">CAMPUS EMERGENCY DISPATCH</span>
                <div className="contacts-list">
                  <div className="contact-item">
                    <span>Central Security Desk:</span>
                    <strong>+1 (800) 555-0199</strong>
                  </div>
                  <div className="contact-item">
                    <span>First Aid Center:</span>
                    <strong>Ext. 404 (Campus Medic)</strong>
                  </div>
                  <div className="contact-item">
                    <span>Fire & Rescue Services:</span>
                    <strong>911 / 112</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
