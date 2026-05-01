import React, { useMemo } from "react";
import { useFlowStore, getAnchorCoordinate } from "../../../store/flowStore";
import type{ FlowNode }from "../../../types/flow"

// 🆕 新增 props 定义，区分渲染层级
type EdgesLayerProps = {
  layer: 'bottom' | 'top'; // bottom=已完成连线, top=正在拖拽的虚线
};

const EdgesLayer: React.FC<EdgesLayerProps> = ({ layer }) => {
  const edges = useFlowStore((s) => s.edges);
  const nodes = useFlowStore((s) => s.nodes);
  const selectedEdgeId = useFlowStore((s) => s.selectedEdgeId);
  const setSelectedEdgeId = useFlowStore((s) => s.setSelectedEdgeId);
  const connectState = useFlowStore((s) => s.connectState);

  const nodeMap = useMemo(() => {
    return nodes.reduce((acc, node) => {
      acc[node.id] = node;
      return acc;
    }, {} as Record<string, FlowNode>);
  }, [nodes]);

  const getBezierPath = (start: {x:number, y:number}, end: {x:number, y:number}) => {
    const dist = Math.abs(end.x - start.x) * 0.5;
    const control1 = { x: start.x + dist, y: start.y };
    const control2 = { x: end.x - dist, y: end.y };
    return `M ${start.x} ${start.y} C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${end.x} ${end.y}`;
  };

  return (
    <svg
      width="100%"
      height="100%"
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        pointerEvents: "none", // 让事件穿透
        overflow: "visible",
        zIndex: layer === 'top' ? 999 : 0, // 🆕 顶层给高 z-index
      }}
    >
      <defs>
        <marker id="arrow-default" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,10 L10,5 z" fill="#b1b1b7" />
        </marker>
        <marker id="arrow-selected" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,10 L10,5 z" fill="#ff4d4f" />
        </marker>
        <marker id="arrow-connecting" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,10 L10,5 z" fill="#1677ff" />
        </marker>
      </defs>

      {/* 🟢 渲染层 1 (Bottom): 已存在的实线 */}
      {layer === 'bottom' && edges.map((edge) => {
        const fromNode = nodeMap[edge.from.nodeId];
        const toNode = nodeMap[edge.to.nodeId];
        if (!fromNode || !toNode) return null;

        const start = getAnchorCoordinate(fromNode.position, edge.from.anchor);
        const end = getAnchorCoordinate(toNode.position, edge.to.anchor);
        const isSelected = selectedEdgeId === edge.id;
        const pathData = getBezierPath(start, end);

        return (
          <g
            key={edge.id}
            onMouseDown={(e) => {
              e.stopPropagation();
              setSelectedEdgeId(edge.id);
            }}
          >
             {/* 透明热区，用于点击 */}
             <path
               d={pathData}
               stroke="transparent"
               strokeWidth={15}
               fill="none"
               style={{ cursor: "pointer", pointerEvents: "stroke" }}
             />
             {/* 视觉线 */}
             <path
               d={pathData}
               stroke={isSelected ? "#ff4d4f" : "#b1b1b7"}
               strokeWidth={2}
               fill="none"
               markerEnd={`url(#${isSelected ? 'arrow-selected' : 'arrow-default'})`}
               style={{ pointerEvents: "none" }}
             />
          </g>
        );
      })}

      {/* 🔵 渲染层 2 (Top): 正在拖拽的橡皮筋虚线 */}
      {layer === 'top' && connectState.mode === "connecting" && connectState.cursorPosition && nodeMap[connectState.fromNodeId] && (
        <path
          d={getBezierPath(
            getAnchorCoordinate(nodeMap[connectState.fromNodeId].position, connectState.fromAnchor),
            connectState.cursorPosition
          )}
          stroke="#1677ff"
          strokeWidth={2}
          strokeDasharray="5,5"
          fill="none"
          markerEnd="url(#arrow-connecting)"
          style={{ pointerEvents: "none", opacity: 0.8 }}
        />
      )}
    </svg>
  );
};

export default EdgesLayer;