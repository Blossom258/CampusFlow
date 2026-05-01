import React, { useEffect, useRef, useState } from "react";
import { Typography } from "antd";
import { nanoid } from "nanoid";
import { useFlowStore } from "../../../store/flowStore";
import type { CreateFlowNode } from "../../../types/flow";
import NodeItem from "./NodeItem";
import EdgesLayer from "./EdgesLayer";

const { Title, Text } = Typography;
type Point = { x: number; y: number };

const NODE_NAME_MAP: Record<string, string> = {
  start: "发起人",
  approval: "审批人",
  end: "结束",
};

const Canvas: React.FC = () => {
  const { 
    nodes, addNode, setSelectedNodeId, setSelectedEdgeId, setCanvasSize,
    viewportOffset, setViewportOffset, deleteSelected, updateConnectCursor,
    cancelConnect, connectState 
  } = useFlowStore();

  const canvasRef = useRef<HTMLDivElement>(null);
  const isSpaceDownRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartMouseRef = useRef<Point>({ x: 0, y: 0 });
  const panStartOffsetRef = useRef<Point>({ x: 0, y: 0 });
  const [isSpaceDown, setIsSpaceDown] = useState(false);

  // 生命周期及事件处理逻辑保持不变...
  useEffect(() => {
    if (!canvasRef.current) return;
    const el = canvasRef.current;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setCanvasSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [setCanvasSize]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.key === "Delete" || e.key === "Backspace") deleteSelected();
      if (e.key === "Escape") {
        if (connectState.mode === "connecting") cancelConnect();
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
      }
      if (e.code === "Space") {
        if (!isSpaceDownRef.current) {
          isSpaceDownRef.current = true;
          setIsSpaceDown(true);
        }
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpaceDownRef.current = false;
        setIsSpaceDown(false);
      }
    };
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [deleteSelected, connectState.mode, cancelConnect, setSelectedNodeId, setSelectedEdgeId]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isPanningRef.current) {
        setViewportOffset({
          x: panStartOffsetRef.current.x + (e.clientX - panStartMouseRef.current.x),
          y: panStartOffsetRef.current.y + (e.clientY - panStartMouseRef.current.y),
        });
        return;
      }
      if (connectState.mode === "connecting" && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        updateConnectCursor({ 
          x: e.clientX - rect.left - viewportOffset.x, 
          y: e.clientY - rect.top - viewportOffset.y 
        });
      }
    };
    const onMouseUp = () => {
      isPanningRef.current = false;
      document.body.style.cursor = "";
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [setViewportOffset, viewportOffset, connectState.mode, updateConnectCursor]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ marginBottom: 12, paddingLeft: 4 }}>
        <Title level={4} style={{ margin: 0 }}>流程设计画布</Title>
        <Text type="secondary" style={{ fontSize: 12 }}>
          空格+左键 / 中键拖动画布，选中按 Delete 删除，右键/ESC 取消连线
        </Text>
      </div>

      <div
        ref={canvasRef}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          const type = e.dataTransfer.getData("node-type");
          if (!type) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left - viewportOffset.x;
          const y = e.clientY - rect.top - viewportOffset.y;
          const defaultName = NODE_NAME_MAP[type] || type;

          // ✅ 核心修复：移除 createDefaultNodeConfig，Store 内部 addNode 已封装初始化逻辑 [cite: 137-141]
          // ✅ 核心修复：明确指定 CreateFlowNode 类型，消除 any 警告 
          addNode({
            id: nanoid(),
            type,
            name: defaultName,
            position: { x, y },
          } as CreateFlowNode);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          if (connectState.mode === "connecting") cancelConnect();
        }}
        onMouseDown={(e) => {
          if (e.button === 1 || (isSpaceDownRef.current && e.button === 0)) {
            isPanningRef.current = true;
            panStartMouseRef.current = { x: e.clientX, y: e.clientY };
            panStartOffsetRef.current = { ...viewportOffset };
            document.body.style.cursor = "grabbing";
            e.preventDefault();
            return;
          }
          if (connectState.mode === "connecting") {
            cancelConnect();
            return;
          }
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
        }}
        style={{
          flex: 1, position: "relative", overflow: "hidden", backgroundColor: "#fff",
          borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0",
          backgroundImage: "radial-gradient(#d9d9d9 1.5px, transparent 1.5px)",
          backgroundSize: "20px 20px", backgroundPosition: `${viewportOffset.x}px ${viewportOffset.y}px`,
          cursor: isSpaceDown ? "grab" : "default",
        }}
      >
        <div style={{ position: "absolute", inset: 0, transform: `translate(${viewportOffset.x}px, ${viewportOffset.y}px)`, pointerEvents: "none" }}>
          <EdgesLayer layer="bottom" />
          <div style={{ pointerEvents: "auto", width: "100%", height: "100%" }}>
            {nodes.map((node) => <NodeItem key={node.id} node={node} />)}
          </div>
          <EdgesLayer layer="top" />
        </div>
      </div>
    </div>
  );
};

export default Canvas;