import React from "react";
import { message, Tag } from "antd"; 
import { UserOutlined, TeamOutlined, ForkOutlined } from "@ant-design/icons";
import { useFlowStore, NODE_WIDTH, NODE_HEIGHT } from "../../../store/flowStore";
import type { FlowNode, AnchorType } from "../../../types/flow";
import "./nodeItem.css";

type NodeItemProps = { node: FlowNode; };
const allAnchors: AnchorType[] = ["top", "right", "bottom", "left"];

const NodeItem: React.FC<NodeItemProps> = ({ node }) => {
  const { 
    selectedNodeId, setSelectedNodeId, updateNodePosition, 
    connectState, startConnect, finishConnect 
  } = useFlowStore();
  const isSelected = selectedNodeId === node.id;
  const isGateway = node.type === "gateway";

  // ✅ 核心修复：改写 if-else 消除 no-unused-expressions 报错 
  const handleAnchorMouseDown = (e: React.MouseEvent, anchor: AnchorType) => {
    e.stopPropagation();
    e.preventDefault();
    const isOutputAnchor = anchor === "right" || anchor === "bottom";
    const isInputAnchor = anchor === "top" || anchor === "left";

    if (connectState.mode === "idle") {
      if (isOutputAnchor) {
        startConnect(node.id, anchor);
      } else {
        message.warning("请从 [右] 或 [下] 锚点开始连线");
      }
    } else {
      if (isInputAnchor) {
        finishConnect(node.id, anchor);
      } else {
        message.warning("请连接到 [左] 或 [上] 锚点");
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.button !== 0 || connectState.mode === "connecting") return;
    setSelectedNodeId(node.id);
    const startX = e.clientX, startY = e.clientY, startPos = { ...node.position };
    const onMouseMove = (m: MouseEvent) => {
      updateNodePosition(node.id, { 
        x: startPos.x + (m.clientX - startX), 
        y: startPos.y + (m.clientY - startY) 
      });
    };
    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div
      className={`ef-node ${isSelected ? "is-selected" : ""} ${isGateway ? "is-gateway" : ""}`}
      style={{
        left: node.position.x,
        top: node.position.y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="ef-node-label">
        {isGateway ? (
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <ForkOutlined />
            条件网关
          </span>
        ) : (
          node.name
        )}
      </div>

      {node.type === "approval" && (
        <div style={{ marginTop: 4, display: "flex", justifyContent: "center" }}>
          {node.config?.approvalMode === "MATCH_ALL" ? (
            <Tag color="orange">
              <TeamOutlined /> 会签
            </Tag>
          ) : (
            <Tag color="blue">
              <UserOutlined /> 或签
            </Tag>
          )}
        </div>
      )}

      {allAnchors.map((anchor) => (
        <div 
          key={anchor} 
          className={`ef-anchor ${anchor}`} 
          onMouseDown={(e) => handleAnchorMouseDown(e, anchor as AnchorType)} 
        />
      ))}
    </div>
  );
};

export default NodeItem;