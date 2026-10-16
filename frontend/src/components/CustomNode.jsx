import React, { memo } from "react";
import { Handle, Position } from "reactflow";

function getNodeEmoji(id) {
  if (id.startsWith("exit")) return "🚪";
  if (id.startsWith("lab")) return "🔬";
  if (id.startsWith("class")) return "🎓";
  if (id.includes("library")) return "📚";
  if (id.includes("canteen")) return "🍽️";
  if (id.includes("hall")) return "🏛️";
  if (id.includes("lobby")) return "🏢";
  return "📍";
}

function CustomNode({ id, data }) {
  const {
    label,
    isExit,
    isStart,
    isRouteNode,
    stepNumber,
    isSimulatingCurrent,
    isReachableExit,
    isUnavailableExit,
    capacity,
    onClickNode
  } = data;

  const emoji = getNodeEmoji(id);

  let stateClass = "node-normal";
  if (isUnavailableExit) {
    stateClass = "node-unavailable-exit";
  } else if (isStart) {
    stateClass = "node-start";
  } else if (isSimulatingCurrent) {
    stateClass = "node-simulating";
  } else if (isRouteNode && isExit) {
    stateClass = "node-target-exit";
  } else if (isRouteNode) {
    stateClass = "node-in-route";
  } else if (isExit && isReachableExit) {
    stateClass = "node-reachable-exit";
  } else if (isExit) {
    stateClass = "node-exit";
  }

  return (
    <div
      className={`custom-graph-node ${stateClass}`}
      onClick={() => onClickNode && onClickNode(id)}
      title={isExit ? `${label} (Capacity: ${capacity || "N/A"})` : `Click to set ${label} as Starting Location`}
    >
      {/* ReactFlow Handles on all 4 sides for clean auto-routing */}
      <Handle type="target" position={Position.Top} id="top-t" className="rf-handle" />
      <Handle type="source" position={Position.Top} id="top-s" className="rf-handle" />
      <Handle type="target" position={Position.Bottom} id="bottom-t" className="rf-handle" />
      <Handle type="source" position={Position.Bottom} id="bottom-s" className="rf-handle" />
      <Handle type="target" position={Position.Left} id="left-t" className="rf-handle" />
      <Handle type="source" position={Position.Left} id="left-s" className="rf-handle" />
      <Handle type="target" position={Position.Right} id="right-t" className="rf-handle" />
      <Handle type="source" position={Position.Right} id="right-s" className="rf-handle" />

      {/* Start indicator badge */}
      {isStart && (
        <div className="node-badge start-badge">
          <span className="pulse-ring"></span>
          START
        </div>
      )}

      {/* Current simulation walker position */}
      {isSimulatingCurrent && (
        <div className="node-badge walker-badge">
          🏃 YOU ARE HERE
        </div>
      )}

      {/* Route step badge */}
      {stepNumber !== undefined && stepNumber !== null && !isStart && !isExit && (
        <div className="node-badge step-badge">
          #{stepNumber}
        </div>
      )}

      {/* Target Exit badge */}
      {isExit && isRouteNode && (
        <div className="node-badge exit-badge">
          ★ RECOMMENDED EXIT
        </div>
      )}

      {/* Blocked Exit badge */}
      {isUnavailableExit && (
        <div className="node-badge blocked-exit-badge">
          ✕ BLOCKED EXIT
        </div>
      )}

      <div className="node-inner">
        <span className="node-icon">{emoji}</span>
        <div className="node-text">
          <span className="node-title">{label}</span>
          {isExit && capacity && (
            <span className="node-capacity">Cap: {capacity}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(CustomNode);
