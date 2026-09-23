import React, { useEffect, useMemo, useState } from "react";
import ReactFlow, { Background, Controls, MarkerType } from "reactflow";
import "reactflow/dist/style.css";

const API = "http://127.0.0.1:8000";

export default function App() {
  const [building, setBuilding] = useState(null);
  const [emergencies, setEmergencies] = useState({});
  const [start, setStart] = useState("lab1");
  const [emergency, setEmergency] = useState("fire");
  const [people, setPeople] = useState(100);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/building`).then(r => r.json()),
      fetch(`${API}/emergencies`).then(r => r.json())
    ]).then(([b, e]) => {
      setBuilding(b);
      setEmergencies(e);
    });
  }, []);

  const nodeMap = useMemo(() => {
    const map = {};
    building?.nodes.forEach(n => map[n.id] = n);
    return map;
  }, [building]);

  const nodes = useMemo(() => {
    if (!building) return [];
    return building.nodes.map(n => ({
      id: n.id,
      position: { x: n.x, y: n.y },
      data: { label: n.label },
      style: {
        padding: 10,
        borderRadius: 10,
        border: result?.route?.includes(n.id) ? "3px solid #16a34a" : "1px solid #94a3b8",
        background: n.id.startsWith("exit") ? "#dcfce7" : "#fff"
      }
    }));
  }, [building, result]);

  const edges = useMemo(() => {
    if (!building) return [];
    const blocked = new Set((result?.blocked_edges || []).map(e => [...e].sort().join("-")));
    return building.edges.map(([a,b], i) => {
      const key = [a,b].sort().join("-");
      const inRoute = result?.route?.includes(a) && result?.route?.includes(b) &&
        result.route.indexOf(b) === result.route.indexOf(a) + 1;
      return {
        id: `e${i}`,
        source: a,
        target: b,
        style: { stroke: blocked.has(key) ? "#ef4444" : inRoute ? "#16a34a" : "#94a3b8", strokeWidth: inRoute ? 4 : 2 },
        markerEnd: { type: MarkerType.ArrowClosed }
      };
    });
  }, [building, result]);

  async function calculate() {
    setLoading(true);
    const response = await fetch(`${API}/evacuation`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ start, emergency, people: Number(people) })
    });
    setResult(await response.json());
    setLoading(false);
  }

  if (!building) return <div className="loading">Loading SafeRoute...</div>;

  return (
    <div className="app">
      <header>
        <div>
          <h1>🚨 SafeRoute</h1>
          <p>Smart Emergency Evacuation System</p>
        </div>
        <div className="badge">:) DM IA</div>
      </header>

      <main>
        <section className="panel controls">
          <h2>Emergency Simulation</h2>

          <label>Starting Location</label>
          <select value={start} onChange={e => setStart(e.target.value)}>
            {building.nodes.filter(n => !n.id.startsWith("exit")).map(n =>
              <option key={n.id} value={n.id}>{n.label}</option>
            )}
          </select>

          <label>Emergency</label>
          <select value={emergency} onChange={e => setEmergency(e.target.value)}>
            {Object.entries(emergencies).map(([id, e]) =>
              <option key={id} value={id}>{e.label}</option>
            )}
          </select>

          <label>People to Evacuate</label>
          <input type="number" min="1" value={people} onChange={e => setPeople(e.target.value)} />

          <button onClick={calculate}>{loading ? "Calculating..." : "Find Safe Route"}</button>

          <div className="concepts">
            <h3>Concepts Used</h3>
            <span>Graphs</span><span>Relations</span><span>BFS</span>
            <span>Warshall</span><span>Logic</span><span>Pigeonhole</span>
          </div>
        </section>

        <section className="panel map">
          <h2>Building Map</h2>
          <div className="flow">
            <ReactFlow nodes={nodes} edges={edges} fitView>
              <Background />
              <Controls />
            </ReactFlow>
          </div>
        </section>

        <section className="panel analysis">
          <h2>Route Analysis</h2>
          {!result ? (
            <p className="muted">Run an emergency simulation to see the recommended route.</p>
          ) : (
            <>
              <div className="status">{result.reachable ? "🟢 Safe route found" : "🔴 No reachable exit"}</div>
              <div className="metric">
                <small>Recommended Exit</small>
                <strong>{nodeMap[result.recommended_exit]?.label || "None"}</strong>
              </div>
              <div className="metric">
                <small>Route</small>
                <strong>{result.route.map(id => nodeMap[id]?.label).join(" → ") || "No route"}</strong>
              </div>
              <div className="metric">
                <small>Reachable Exits</small>
                <strong>{result.reachable_exits.map(id => nodeMap[id]?.label).join(", ") || "None"}</strong>
              </div>
              <h3>Exit Capacity</h3>
              {Object.entries(result.allocation).map(([id, x]) =>
                <div className="capacity" key={id}>
                  <span>{nodeMap[id]?.label}</span>
                  <span>{x.assigned}/{x.capacity}</span>
                </div>
              )}
              {result.unallocated > 0 && <div className="warning">⚠️ {result.unallocated} people exceed available exit capacity.</div>}
            </>
          )}
        </section>
      </main>

      <footer>
        <strong>SafeRoute</strong> demonstrates graph-based evacuation, reachability using Warshall's algorithm, BFS path finding, logical constraints and basic capacity allocation.
      </footer>
    </div>
  );
}
