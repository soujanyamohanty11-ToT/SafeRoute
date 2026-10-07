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
      {/* Visible red blocked path */}

      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: "#ef4444",
          strokeWidth: 3,
          strokeDasharray: "6 4"
        }}
      />

      {/* Invisible wider hover area */}

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

      {/* Tooltip */}

      {hovered && (
        <EdgeLabelRenderer>

          <div
            className="blocked-edge-tooltip"
            style={{
              transform:
                `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`
            }}
          >

            <span className="blocked-icon">
              !
            </span>

            <div className="tooltip-content">

              <strong>
                Path Blocked
              </strong>

              <span>
                {data?.reason || "Route unavailable"}
              </span>

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

  const [building, setBuilding] = useState(null);

  const [emergencies, setEmergencies] = useState({});

  const [start, setStart] = useState("lab1");

  const [emergency, setEmergency] = useState("fire");

  const [people, setPeople] = useState(100);

  const [result, setResult] = useState(null);

  const [loading, setLoading] = useState(false);


  /* =========================
     LOAD BACKEND DATA
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

        console.error(
          "Backend connection error:",
          error
        );

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


  /* NODES */

  /* NODES */

const nodes = useMemo(() => {
  if (!building) return [];

  const reachableExits = new Set(
    result?.reachable_exits || []
  );

  return building.nodes.map(n => {
    const isExit = n.id.startsWith("exit");
    const isUnavailableExit =
      isExit &&
      result &&
      !reachableExits.has(n.id);

    const isRouteNode =
      result?.route?.includes(n.id);

    return {
      id: n.id,

      position: {
        x: n.x,
        y: n.y
      },

      data: {
        label: n.label
      },

      style: {
        padding: 12,
        borderRadius: 12,

        border: isUnavailableExit
          ? "2px solid #f87171"
          : isRouteNode
          ? "3px solid #16a34a"
          : isExit
          ? "2px solid #22c55e"
          : "1px solid #cbd5e1",

        background: isUnavailableExit
          ? "#fee2e2"
          : isExit
          ? "#dcfce7"
          : "#fff",

        opacity: isUnavailableExit
          ? 0.98
          : 1,

        fontWeight: 600,

        color: isUnavailableExit
          ? "#991b1b"
          : "#0f172a",

        boxShadow: isRouteNode
          ? "0 4px 14px rgba(22,163,74,0.18)"
          : "0 2px 8px rgba(15,23,42,0.06)"
      }
    };
  });

}, [building, result]);


  /* =========================
     EDGES
  ========================= */

  const edges = useMemo(() => {

    if (!building) return [];

    const blocked = new Set(
      (result?.blocked_edges || []).map(e =>
        [...e].sort().join("-")
      )
    );


    /*
      Get the selected emergency label.

      This makes the reason work even if the
      backend ID is slightly different from
      "flood", "earthquake" or "fire".
    */

    const emergencyLabel =
      emergencies?.[emergency]?.label?.toLowerCase() ||
      emergency.toLowerCase();


    let blockedReason =
      "This corridor is unavailable during the selected emergency.";


    if (emergencyLabel.includes("flood")) {

      blockedReason =
        "Flooding has made this corridor inaccessible.";

    }

    else if (emergencyLabel.includes("earthquake")) {

      blockedReason =
        "Structural damage has blocked this corridor.";

    }

    else if (emergencyLabel.includes("fire")) {

      blockedReason =
        "Fire or smoke has made this corridor unsafe.";

    }


    return building.edges.map(([a, b], i) => {

      const key =
        [a, b].sort().join("-");


      const isBlocked =
        blocked.has(key);


      const inRoute =
        result?.route?.includes(a) &&
        result?.route?.includes(b) &&
        result.route.indexOf(b) ===
          result.route.indexOf(a) + 1;


      const edgeColor =
        isBlocked
          ? "#ef4444"
          : inRoute
          ? "#16a34a"
          : "#cbd5e1";


      return {

        id: `e${i}`,

        source: a,

        target: b,


        /*
          This is what tells React Flow to use
          our custom BlockedEdge component.
        */

        type:
          isBlocked
            ? "blocked"
            : "default",


        /*
          The reason is passed to BlockedEdge.
        */

        data: {

          reason:
            isBlocked
              ? blockedReason
              : null

        },


        style: {

          stroke: edgeColor,

          strokeWidth:
            inRoute
              ? 4
              : 2

        },


        markerEnd: {

          type:
            MarkerType.ArrowClosed,

          color: edgeColor

        }

      };

    });

  }, [
    building,
    result,
    emergency,
    emergencies
  ]);


  /* =========================
     CALCULATE ROUTE
  ========================= */

  async function calculate() {

    setLoading(true);

    try {

      const response =
        await fetch(
          `${API}/evacuation`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              start,
              emergency,
              people: Number(people)
            })
          }
        );


      const data =
        await response.json();


      setResult(data);

    }

    catch (error) {

      console.error(
        "Evacuation calculation error:",
        error
      );

    }

    setLoading(false);

  }


  /* =========================
     LOADING
  ========================= */

  if (!building) {

    return (

      <div className="loading-screen">

        <div className="loading-card">

          <div className="loading-icon">
            ⌁
          </div>

          <h2>
            Loading SafeRoute
          </h2>

          <p>
            Preparing the building evacuation network...
          </p>

        </div>

      </div>

    );

  }


  /* =========================
     MAIN UI
  ========================= */

  return (

    <div className="app">


      {/* HEADER */}

      <header className="topbar">

        <div className="brand">

          <div className="brand-icon">
            ⌂
          </div>

          <div>

            <h1>
              SafeRoute
            </h1>

            <p>
              Smart Emergency Evacuation System
            </p>

          </div>

        </div>


        <div className="header-right">

          <div className="system-status">

            <span className="status-dot"></span>

          </div>


          <div className="dm-badge">

          </div>

        </div>

      </header>


      {/* MAIN */}

      <main>


        {/* INTRO */}

        <div className="page-intro">

          <div>

            <p className="eyebrow">
              EMERGENCY RESPONSE DASHBOARD
            </p>

            <h2>
              Find the safest way out
            </h2>

            <p>
              Assumes the building as a graph and calculates a reachable, capacity-aware evacuation route.
            </p>

          </div>


          <div className="quick-info">

            <div>

              <strong>
                {building.nodes.length}
              </strong>

              <span>
                Locations
              </span>

            </div>


            <div>

              <strong>
                {building.edges.length}
              </strong>

              <span>
                Connections
              </span>

            </div>

          </div>

        </div>


        {/* DASHBOARD */}

        <div className="dashboard-grid">


          {/* CONTROL PANEL */}

          <section className="panel controls">

            <div className="panel-heading">

              <div className="panel-icon">
                ⚙
              </div>

              <div>

                <h2>
                  Emergency Simulation
                </h2>

                <p>
                  Configure the evacuation scenario.
                </p>

              </div>

            </div>


            {/* START LOCATION */}

            <div className="form-group">

              <label>
                Starting Location
              </label>

              <select
                value={start}
                onChange={e =>
                  setStart(e.target.value)
                }
              >

                {building.nodes
                  .filter(
                    n => !n.id.startsWith("exit")
                  )
                  .map(n => (

                    <option
                      key={n.id}
                      value={n.id}
                    >
                      {n.label}
                    </option>

                  ))}

              </select>

              <small>
                This becomes the
                <b> starting vertex </b>
                of the evacuation graph.
              </small>

            </div>


            {/* EMERGENCY */}

            <div className="form-group">

              <label>
                Emergency Type
              </label>

              <select
                value={emergency}
                onChange={e =>
                  setEmergency(e.target.value)
                }
              >

                {Object.entries(emergencies).map(
                  ([id, e]) => (

                    <option
                      key={id}
                      value={id}
                    >
                      {e.label}
                    </option>

                  )
                )}

              </select>

              <small>
                Different emergencies can make
                certain connections unavailable.
              </small>

            </div>


            {/* PEOPLE */}

            <div className="form-group">

              <label>
                People to Evacuate
              </label>

              <input
                type="number"
                min="1"
                value={people}
                onChange={e =>
                  setPeople(e.target.value)
                }
              />

              <small>
                Used to check whether available
                exit capacity is sufficient.
              </small>

            </div>


            {/* BUTTON */}

            <button
              className="calculate-button"
              onClick={calculate}
              disabled={loading}
            >

              {loading ? (

                <>

                  <span className="spinner"></span>

                  Calculating Route...

                </>

              ) : (

                <>

                  Find Safe Route

                  <span>
                    →
                  </span>

                </>

              )}

            </button>


            {/* CONCEPTS */}

            <div className="concept-box">

              <div className="concept-title">

                <span>
                  ◇
                </span>

                Discrete Mathematics Behind It

              </div>


              <div className="concept-grid">


                <div className="concept">

                  <strong>
                    Graphs
                  </strong>

                  <span>
                    Rooms become vertices
                    and corridors become edges.
                  </span>

                </div>


                <div className="concept">

                  <strong>
                    BFS
                  </strong>

                  <span>
                    Finds a path from the
                    starting location to an exit.
                  </span>

                </div>


                <div className="concept">

                  <strong>
                    Warshall
                  </strong>

                  <span>
                    Checks which locations
                    are reachable from others.
                  </span>

                </div>


                <div className="concept">

                  <strong>
                    Relations
                  </strong>

                  <span>
                    Represent connections
                    between rooms and exits.
                  </span>

                </div>


                <div className="concept">

                  <strong>
                    Logic
                  </strong>

                  <span>
                    Applies conditions such
                    as blocked routes.
                  </span>

                </div>


                <div className="concept">

                  <strong>
                    Pigeonhole
                  </strong>

                  <span>
                    Helps identify when people
                    exceed exit capacity.
                  </span>

                </div>


              </div>

            </div>

          </section>


          {/* MAP */}

          <section className="panel map">

            <div className="panel-heading">

              <div className="panel-icon">
                ⌖
              </div>

              <div>

                <h2>
                  Building Map
                </h2>

                <p>
                  Live visualization of the evacuation graph.
                </p>

              </div>


              <div className="legend">

                <span>

                  <i className="legend-green"></i>

                  Safe Route

                </span>


                <span>

                  <i className="legend-red"></i>

                  Blocked

                </span>

              </div>

            </div>


            <div className="flow">

              <ReactFlow
                nodes={nodes}
                edges={edges}
                edgeTypes={edgeTypes}
                fitView
              >

                <Background />

                <Controls />

              </ReactFlow>

            </div>


            <div className="map-tip">

              <span>
                ⓘ
              </span>

              Green paths indicate the recommended
              route. Hover over a red path to see
              why the connection is blocked.

            </div>

          </section>


          {/* ANALYSIS */}

          <section className="panel analysis">

            <div className="panel-heading">

              <div className="panel-icon">
                ↗
              </div>

              <div>

                <h2>
                  Route Analysis
                </h2>

                <p>
                  Results from the evacuation algorithm.
                </p>

              </div>

            </div>


            {!result ? (

              <div className="empty-state">

                <div className="empty-icon">
                  ⌁
                </div>

                <h3>
                  Ready to calculate
                </h3>

                <p>
                  Select an emergency scenario
                  and click
                  <b> Find Safe Route </b>
                  to analyze the building.
                </p>

              </div>

            ) : (

              <div className="results">


                {/* STATUS */}

                <div
                  className={`result-status ${
                    result.reachable
                      ? "success"
                      : "danger"
                  }`}
                >

                  <span>
                    ●
                  </span>

                  <div>

                    <strong>
                      {result.reachable
                        ? "Safe route found"
                        : "No reachable exit"}
                    </strong>

                    <small>
                      {result.reachable
                        ? "A valid evacuation path is available."
                        : "The current scenario has no accessible exit."}
                    </small>

                  </div>

                </div>


                {/* METRICS */}

                <div className="metrics">

                  <div className="metric-card">

                    <small>
                      RECOMMENDED EXIT
                    </small>

                    <strong>
                      {
                        nodeMap[
                          result.recommended_exit
                        ]?.label || "None"
                      }
                    </strong>

                  </div>


                  <div className="metric-card">

                    <small>
                      REACHABLE EXITS
                    </small>

                    <strong>
                      {result.reachable_exits.length}
                    </strong>

                  </div>

                </div>


                {/* ROUTE */}

                <div className="route-card">

                  <small>
                    RECOMMENDED ROUTE
                  </small>


                  <div className="route">

                    {result.route.map(
                      (id, index) => (

                        <React.Fragment key={id}>

                          <span className="route-node">
                            {nodeMap[id]?.label}
                          </span>


                          {index <
                            result.route.length - 1 && (

                            <span className="route-arrow">
                              →
                            </span>

                          )}

                        </React.Fragment>

                      )
                    )}

                  </div>


                  <p>
                    BFS explores the graph
                    level-by-level to identify
                    a suitable path from the
                    starting location.
                  </p>

                </div>


                {/* REACHABLE EXITS */}

                <div className="reachable-box">

                  <div className="section-title">
                    Reachable Exits
                  </div>


                  <div className="exit-list">

                    {result.reachable_exits.map(
                      id => (

                        <span key={id}>
                          ✓ {nodeMap[id]?.label}
                        </span>

                      )
                    )}

                  </div>

                </div>


                {/* CAPACITY */}

                <div className="capacity-section">

                  <div className="section-title">
                    Exit Capacity
                  </div>


                  {Object.entries(
                    result.allocation
                  ).map(([id, x]) => (

                    <div
                      className="capacity"
                      key={id}
                    >

                      <div className="capacity-name">

                        <span className="capacity-icon">
                          ⇥
                        </span>

                        {nodeMap[id]?.label}

                      </div>


                      <div className="capacity-bar">

                        <div
                          style={{
                            width: `${Math.min(
                              (x.assigned /
                                x.capacity) *
                                100,
                              100
                            )}%`
                          }}
                        ></div>

                      </div>


                      <strong>
                        {x.assigned}/{x.capacity}
                      </strong>

                    </div>

                  ))}

                </div>


                {/* WARNING */}

                {result.unallocated > 0 && (

                  <div className="warning">

                    <span>
                      ⚠
                    </span>

                    <div>

                      <strong>
                        Capacity exceeded
                      </strong>

                      <p>
                        {result.unallocated}
                        {" "}people cannot currently
                        be assigned to an available exit.
                      </p>

                    </div>

                  </div>

                )}

              </div>

            )}

          </section>

        </div>

      </main>


      {/* FOOTER */}

      <footer>

        <div>

          <strong>
            SafeRoute
          </strong>

          <span>
            Graph-based emergency evacuation using
            BFS, Warshall's algorithm, relations,
            logical constraints and capacity allocation.
          </span>

        </div>


        <span className="footer-tag">
          Built on a foundation of safety
        </span>

      </footer>

    </div>

  );
}

