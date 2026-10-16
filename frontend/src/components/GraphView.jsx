import React, { useState, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath
} from "reactflow";
import "reactflow/dist/style.css";
import CustomNode from "./CustomNode";
import {
  IconPlay,
  IconPause,
  IconRotateCcw,
  IconSkipBack,
  IconSkipForward,
  IconAlertTriangle,
  IconCheckCircle,
  IconCompass
} from "./Icons";

function BlockedEdge({
  id,
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
        className="edge-blocked-line"
      />

      {/* Wider invisible hit area for mouse interaction */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={24}
        className="edge-hover-zone"
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
            <div className="tooltip-icon">!</div>
            <div className="tooltip-content">
              <strong>Corridor Blocked</strong>
              <span>{data?.reason || "Hazard present, route impassable."}</span>
              {data?.isCustom && (
                <span className="tooltip-custom-tag">User Custom Obstacle</span>
              )}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const nodeTypes = {
  custom: CustomNode
};

const edgeTypes = {
  blocked: BlockedEdge
};

export default function GraphView({
  building,
  result,
  emergency,
  emergencies,
  start,
  onSelectStart,
  customBlocked = [],
  onToggleCustomEdge,
  onClearCustomBlocked,
  highlightedExitRoute = null,
  // Simulation playback props
  simulationStep,
  isSimulating,
  onPlaySimulation,
  onPauseSimulation,
  onStepForward,
  onStepBackward,
  onResetSimulation
}) {
  const [obstacleMode, setObstacleMode] = useState(false);

  // Active route is either the user-selected preview route or the overall recommended route
  const activeRoute = highlightedExitRoute || result?.route || [];

  // Build nodes for ReactFlow
  const flowNodes = useMemo(() => {
    if (!building) return [];

    const reachableExits = new Set(result?.reachable_exits || []);
    const routeIndexMap = new Map();
    activeRoute.forEach((nodeId, idx) => {
      routeIndexMap.set(nodeId, idx + 1);
    });

    const currentSimulationNodeId =
      simulationStep !== null && simulationStep < activeRoute.length
        ? activeRoute[simulationStep]
        : null;

    return building.nodes.map(n => {
      const isExit = n.id.startsWith("exit");
      const isUnavailableExit = isExit && result && !reachableExits.has(n.id);
      const isRouteNode = activeRoute.includes(n.id);
      const isStart = n.id === start;
      const stepNumber = routeIndexMap.get(n.id);
      const isSimulatingCurrent = currentSimulationNodeId === n.id;
      const capacity = building.exits?.[n.id]?.capacity;

      return {
        id: n.id,
        type: "custom",
        position: { x: n.x * 1.35 + 20, y: n.y * 1.1 + 10 },
        data: {
          label: n.label,
          isExit,
          isStart,
          isRouteNode,
          stepNumber,
          isSimulatingCurrent,
          isReachableExit: reachableExits.has(n.id),
          isUnavailableExit,
          capacity,
          onClickNode: onSelectStart
        }
      };
    });
  }, [building, result, activeRoute, start, simulationStep, onSelectStart]);

  // Build edges for ReactFlow
  const flowEdges = useMemo(() => {
    if (!building) return [];

    const blockedSet = new Set(
      (result?.blocked_edges || []).map(e => [...e].sort().join("-"))
    );
    const customSet = new Set(
      (customBlocked || []).map(e => [...e].sort().join("-"))
    );

    const scenarioMeta = emergencies?.[emergency];
    const scenarioLabel = scenarioMeta?.label?.toLowerCase() || emergency.toLowerCase();

    let defaultReason = "Corridor is impassable during this active scenario.";
    if (scenarioLabel.includes("fire")) defaultReason = "Fire and smoke hazard blocking passage.";
    else if (scenarioLabel.includes("flood") || scenarioLabel.includes("water"))
      defaultReason = "Water logging and electrical hazard.";
    else if (scenarioLabel.includes("earthquake") || scenarioLabel.includes("debris"))
      defaultReason = "Structural collapse and dangerous debris.";

    return building.edges.map(([a, b], idx) => {
      const edgeKey = [a, b].sort().join("-");
      const isBlocked = blockedSet.has(edgeKey);
      const isCustom = customSet.has(edgeKey);

      // Check if this edge is traversed in the active route
      let inRoute = false;
      let isSimulatedSoFar = false;

      for (let i = 0; i < activeRoute.length - 1; i++) {
        const u = activeRoute[i];
        const v = activeRoute[i + 1];
        if ((u === a && v === b) || (u === b && v === a)) {
          inRoute = true;
          if (simulationStep !== null && i < simulationStep) {
            isSimulatedSoFar = true;
          }
          break;
        }
      }

      const edgeColor = isBlocked
        ? "#ef4444"
        : inRoute
        ? "#10b981"
        : "var(--edge-default, #94a3b8)";

      return {
        id: `e-${a}-${b}`,
        source: a,
        target: b,
        type: isBlocked ? "blocked" : "default",
        animated: inRoute,
        data: {
          reason: isCustom ? "Manual obstacle toggled by operator." : defaultReason,
          isCustom,
          edgeKey: [a, b]
        },
        style: {
          stroke: edgeColor,
          strokeWidth: inRoute ? 4 : isBlocked ? 3 : 2,
          strokeDasharray: isBlocked ? "6 5" : inRoute ? undefined : undefined,
          opacity: isBlocked ? 0.95 : inRoute ? 1 : 0.45,
          cursor: obstacleMode ? "crosshair" : "default"
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edgeColor,
          width: inRoute ? 18 : 12,
          height: inRoute ? 18 : 12
        }
      };
    });
  }, [building, result, emergency, emergencies, activeRoute, simulationStep, customBlocked, obstacleMode]);

  // Handle edge click for custom obstacle toggle
  const handleEdgeClick = (_, edge) => {
    if (obstacleMode && edge?.data?.edgeKey && onToggleCustomEdge) {
      onToggleCustomEdge(edge.data.edgeKey);
    }
  };

  const currentStepName =
    simulationStep !== null && activeRoute[simulationStep]
      ? building?.nodes.find(n => n.id === activeRoute[simulationStep])?.label
      : null;

  return (
    <div className="network-map-panel">
      {/* Top Map Toolbar */}
      <div className="map-toolbar">
        <div className="toolbar-left">
          <div className="toolbar-title-group">
            <span className="toolbar-icon">
              <IconCompass size={16} />
            </span>
            <h3>Building Network Graph</h3>
            <span className="live-dot-pulse">Live</span>
          </div>
          <span className="toolbar-sub">Click room to set Start • Real-time BFS topology</span>
        </div>

        <div className="toolbar-right">
          <button
            type="button"
            className={`btn-obstacle-toggle ${obstacleMode ? "active-obstacle-mode" : ""}`}
            onClick={() => setObstacleMode(!obstacleMode)}
            title="Click corridors to toggle manual hazard blocks"
          >
            <IconAlertTriangle size={14} />
            <span>{obstacleMode ? "Exit Obstacle Tool" : "Hazard Tool"}</span>
          </button>

          {customBlocked.length > 0 && (
            <button
              type="button"
              className="btn-clear-obstacles"
              onClick={onClearCustomBlocked}
              title="Remove manual roadblocks"
            >
              Clear ({customBlocked.length})
            </button>
          )}
        </div>
      </div>

      {/* Obstacle mode helper banner */}
      {obstacleMode && (
        <div className="obstacle-helper-alert">
          <IconAlertTriangle size={15} />
          <span>
            <strong>Hazard Tool Active:</strong> Click any connection line on the graph to simulate a corridor blockage.
          </span>
        </div>
      )}

      {/* Interactive Graph Canvas */}
      <div className="flow-canvas-container">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onEdgeClick={handleEdgeClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.5}
          maxZoom={1.8}
        >
          <Background gap={18} size={1} color="var(--canvas-grid, rgba(148, 163, 184, 0.2))" />
          <Controls position="top-right" showInteractive={false} />
        </ReactFlow>

        {/* Floating Simulation Playback Overlay */}
        {activeRoute.length > 0 && (
          <div className="simulation-playback-bar">
            <div className="sim-status">
              <span className="sim-tag">WALKTHROUGH</span>
              <span className="sim-node-indicator">
                {simulationStep !== null ? (
                  <>
                    Step <strong>{simulationStep + 1}</strong> of {activeRoute.length}:{" "}
                    <em>{currentStepName}</em>
                  </>
                ) : (
                  "Ready to simulate path"
                )}
              </span>
            </div>

            <div className="sim-buttons">
              <button
                type="button"
                className="sim-btn"
                onClick={onStepBackward}
                title="Step backward"
                disabled={simulationStep === null || simulationStep <= 0}
              >
                <IconSkipBack size={14} />
              </button>

              {isSimulating ? (
                <button
                  type="button"
                  className="sim-btn sim-btn-primary"
                  onClick={onPauseSimulation}
                  title="Pause simulation"
                >
                  <IconPause size={14} />
                  <span>Pause</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="sim-btn sim-btn-primary"
                  onClick={onPlaySimulation}
                  title="Play evacuation walkthrough"
                >
                  <IconPlay size={14} />
                  <span>{simulationStep !== null ? "Resume" : "Simulate"}</span>
                </button>
              )}

              <button
                type="button"
                className="sim-btn"
                onClick={onStepForward}
                title="Step forward"
                disabled={
                  simulationStep !== null && simulationStep >= activeRoute.length - 1
                }
              >
                <IconSkipForward size={14} />
              </button>

              <button
                type="button"
                className="sim-btn"
                onClick={onResetSimulation}
                title="Reset simulation"
                disabled={simulationStep === null}
              >
                <IconRotateCcw size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Map Bottom Legend */}
      <div className="map-footer-legend">
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-swatch swatch-route"></span>
            <span>Evacuation Route</span>
          </div>
          <div className="legend-item">
            <span className="legend-swatch swatch-blocked"></span>
            <span>Compromised / Blocked</span>
          </div>
          <div className="legend-item">
            <span className="legend-swatch swatch-clear"></span>
            <span>Available Passage</span>
          </div>
          <div className="legend-item">
            <span className="legend-badge-sample sample-start">Start</span>
            <span>Origin</span>
          </div>
          <div className="legend-item">
            <span className="legend-badge-sample sample-exit">Exit</span>
            <span>Safe Discharge</span>
          </div>
        </div>

        <div className="legend-hint">
          <span>Tip: Hover red corridors for blockage diagnosis</span>
        </div>
      </div>
    </div>
    
  );
  // Example node styling function update:
const getNodeStyle = (nodeId) => {
  if (unreachableRooms.includes(nodeId)) {
    return { backgroundColor: '#ff4d4f', border: '2px solid #820014' }; // Disconnected room
  }
  if (responderPath.includes(nodeId)) {
    return { backgroundColor: '#1890ff', color: '#fff' }; // Responder route node
  }
  return defaultStyle;
};
}
