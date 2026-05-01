import { create } from "zustand";
import { nanoid } from "nanoid";
import { persist, createJSONStorage } from "zustand/middleware";
import { validateFlow as validateFlowUtil } from "@project/utils";

// ✅ 核心修复：使用 import type 解决 verbatimModuleSyntax 报错
import type {
  FlowNode,
  FlowEdge,
  ProcessDefinition,
  AnchorType,
  CreateFlowNode,
  ConditionExpr,
} from "../types/flow";

// =======================================================
// 工具函数 & 常量
// =======================================================
export const NODE_WIDTH = 120;
export const NODE_HEIGHT = 60;

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

export function getAnchorCoordinate(
  position: { x: number; y: number },
  anchor: AnchorType
) {
  const { x, y } = position;
  switch (anchor) {
    case "top":
      return { x: x + NODE_WIDTH / 2, y: y };
    case "right":
      return { x: x + NODE_WIDTH, y: y + NODE_HEIGHT / 2 };
    case "bottom":
      return { x: x + NODE_WIDTH / 2, y: y + NODE_HEIGHT };
    case "left":
      return { x: x, y: y + NODE_HEIGHT / 2 };
    default:
      return { x, y };
  }
}

export type Point = { x: number; y: number };

export type ConnectState =
  | { mode: "idle" }
  | {
      mode: "connecting";
      fromNodeId: string;
      fromAnchor: AnchorType;
      cursorPosition?: { x: number; y: number };
    };

function ensureEditable(get: () => FlowStore) {
  if (get().editingMode === "readonly") {
    // 这里不直接 import antd，避免 store 依赖 UI
    console.warn("当前为已发布流程，只读模式，禁止修改");
    return false;
  }
  return true;
}

type FlowStore = {
  processId: string;
  processName: string;
  setProcessName: (name: string) => void;
  nodes: FlowNode[];
  edges: FlowEdge[];
  canvasSize: { width: number; height: number };
  worldSize: { width: number; height: number };
  setCanvasSize: (size: { width: number; height: number }) => void;
  viewportOffset: Point;
  setViewportOffset: (offset: Point) => void;

  /** 当前选中的节点 */
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;

  /** 当前选中的连线（Edge） */
  selectedEdgeId: string | null;
  setSelectedEdgeId: (id: string | null) => void;

  /** 当前选中的 Edge 实体（便于属性面板使用） */
  getSelectedEdge: () => FlowEdge | undefined;

  addNode: (node: CreateFlowNode) => void;
  updateNode: (id: string, data: Partial<FlowNode>) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  deleteSelected: () => void;
  connectState: ConnectState;
  startConnect: (nodeId: string, anchor: AnchorType) => void;
  updateConnectCursor: (position: { x: number; y: number }) => void;
  finishConnect: (toNodeId: string, anchor: AnchorType) => void;
  cancelConnect: () => void;
  getProcessDefinition: () => ProcessDefinition;
  validateFlow: () => { success: boolean; error?: string };
  publishedFlows: ProcessDefinition[];
  publishFlow: () => void;
  resetFlow: () => void;
  loadFlow: (flow: ProcessDefinition) => void;

  /** 设置某条边的条件表达式（XOR 网关使用） */
  setEdgeCondition: (edgeId: string, condition: ConditionExpr | null) => void;

  /** 设置 gateway 的默认出边（会自动清除同一 fromNode 下其他 default） */
  setDefaultEdge: (fromNodeId: string, edgeId: string) => void;

  /** 编辑模式：草稿 / 只读（已发布） */
  editingMode: "draft" | "readonly";

  /** 当前草稿基于的发布版本号（可选） */
  basePublishedVersion?: number;

  /** 基于已发布版本创建草稿 */
  duplicatePublishedAsDraft: (definitionId: string) => void;
};

export const useFlowStore = create<FlowStore>()(
  persist(
    (set, get) => ({
      processId: nanoid(),
      processName: "未命名流程",
      editingMode: "draft",
      basePublishedVersion: undefined,
      setProcessName: (name) => set({ processName: name }),
      nodes: [],
      edges: [],
      canvasSize: { width: 0, height: 0 },
      worldSize: { width: 0, height: 0 },
      setCanvasSize: (size) =>
        set(() => ({
          canvasSize: size,
          worldSize: {
            width: Math.max(size.width, 2000),
            height: Math.max(size.height, 1200),
          },
        })),
      viewportOffset: { x: 0, y: 0 },
      setViewportOffset: (offset) => set({ viewportOffset: offset }),

      selectedNodeId: null,
      setSelectedNodeId: (id) =>
        set({ selectedNodeId: id, selectedEdgeId: null }),

      selectedEdgeId: null,
      setSelectedEdgeId: (id) =>
        set({ selectedEdgeId: id, selectedNodeId: null }),

      getSelectedEdge: () => {
        const { selectedEdgeId, edges } = get();
        return edges.find((e) => e.id === selectedEdgeId);
      },

      addNode: (node) =>
        set((state) => {
          if (!ensureEditable(get)) return state;
          const newNode: FlowNode = {
            ...node,
            config: {
              // 旧字段兼容（如果是老流程）
              approverRole: node.config?.approverRole,

              // 新字段：多审批角色（定义态）
              approverRoles:
                node.config?.approverRoles ??
                (node.config?.approverRole
                  ? [node.config.approverRole]
                  : ["hr"]),

              // 审批模式：默认或签
              approvalMode: node.config?.approvalMode ?? "MATCH_ANY",

              // 运行态字段（此阶段仅初始化）
              //processedUsers: [],
            },
          };
          return { nodes: [...state.nodes, newNode] };
        }),

      updateNode: (id, data) =>
        set((state) => {
          if (!ensureEditable(get)) return state;
          return {
            nodes: state.nodes.map((n) =>
              n.id === id ? { ...n, ...data } : n
            ),
          };
        }),

      updateNodePosition: (id, position) =>
        set((state) => {
          if (!ensureEditable(get)) return state;
          const { width, height } = state.worldSize;
          return {
            nodes: state.nodes.map((n) => {
              if (n.id !== id) return n;
              const x = clamp(position.x, 0, Math.max(0, width - NODE_WIDTH));
              const y = clamp(position.y, 0, Math.max(0, height - NODE_HEIGHT));
              return { ...n, position: { x, y } };
            }),
          };
        }),

      setEdgeCondition: (edgeId, condition) =>
        set((state) => {
          if (!ensureEditable(get)) return state;
          return {
            edges: state.edges.map((edge) =>
              edge.id === edgeId
                ? {
                    ...edge,
                    condition: condition ?? undefined,
                    // 如果设置了条件，自动取消 default 标记
                    isDefault: condition ? false : edge.isDefault,
                  }
                : edge
            ),
          };
        }),

      setDefaultEdge: (fromNodeId, edgeId) =>
        set((state) => {
          if (!ensureEditable(get)) return state;
          return {
            edges: state.edges.map((edge) => {
              // 同一 fromNode 下，只允许一个 default
              if (edge.from.nodeId !== fromNodeId) return edge;

              if (edge.id === edgeId) {
                return {
                  ...edge,
                  isDefault: true,
                  condition: undefined, // default 边不允许有条件
                };
              }

              // 其他边清除 default
              return {
                ...edge,
                isDefault: false,
              };
            }),
          };
        }),

      deleteSelected: () => {
        if (!ensureEditable(get)) return;
        const { selectedNodeId, selectedEdgeId, nodes, edges } = get();
        if (selectedNodeId) {
          const newNodes = nodes.filter((n) => n.id !== selectedNodeId);
          const newEdges = edges.filter(
            (edge) =>
              edge.from.nodeId !== selectedNodeId &&
              edge.to.nodeId !== selectedNodeId
          );
          set({ nodes: newNodes, edges: newEdges, selectedNodeId: null });
          return;
        }
        if (selectedEdgeId) {
          set({
            edges: edges.filter((edge) => edge.id !== selectedEdgeId),
            selectedEdgeId: null,
          });
        }
      },

      connectState: { mode: "idle" },
      startConnect: (nodeId, anchor) =>
        set({
          connectState: {
            mode: "connecting",
            fromNodeId: nodeId,
            fromAnchor: anchor,
            cursorPosition: undefined,
          },
        }),
      updateConnectCursor: (position) => {
        const { connectState } = get();
        if (connectState.mode === "connecting")
          set({ connectState: { ...connectState, cursorPosition: position } });
      },
      finishConnect: (toNodeId, anchor) => {
        if (!ensureEditable(get)) return;
        const { connectState, nodes, edges } = get();
        if (connectState.mode !== "connecting") return;
        const fromNodeId = connectState.fromNodeId;
        if (
          fromNodeId === toNodeId ||
          edges.some(
            (e) => e.from.nodeId === fromNodeId && e.to.nodeId === toNodeId
          )
        ) {
          set({ connectState: { mode: "idle" } });
          return;
        }
        const fromNode = nodes.find((n) => n.id === fromNodeId);
        const toNode = nodes.find((n) => n.id === toNodeId);
        if (fromNode?.type === "end" || toNode?.type === "start") {
          set({ connectState: { mode: "idle" } });
          return;
        }

        const newEdge: FlowEdge = {
          id: nanoid(),
          from: { nodeId: fromNodeId, anchor: connectState.fromAnchor },
          to: { nodeId: toNodeId, anchor },
        };
        set((state) => ({
          edges: [...state.edges, newEdge],
          connectState: { mode: "idle" },
          selectedNodeId: null,
          selectedEdgeId: null,
        }));
      },
      cancelConnect: () => set({ connectState: { mode: "idle" } }),
      getProcessDefinition: () => {
        const { processId, processName, nodes, edges } = get();
        return { id: processId, name: processName, nodes, edges };
      },

      validateFlow: () => {
        const def = get().getProcessDefinition();
        return validateFlowUtil(def);
      },

      publishedFlows: [],
      publishFlow: () => {
        const def = get().getProcessDefinition();
        const { publishedFlows, basePublishedVersion } = get();

        // 校验（复用你已有的）
        const result = validateFlowUtil(def);
        if (!result.success) {
          console.warn(result.error);
          return;
        }

        // definitionKey：新流程默认用 processId
        const definitionKey = def.definitionKey ?? def.id;

        // 找同 key 的历史版本
        const sameKeyVersions = publishedFlows.filter(
          (f) => f.definitionKey === definitionKey
        );

        const nextVersion =
          typeof basePublishedVersion === "number"
            ? basePublishedVersion + 1
            : sameKeyVersions.length > 0
            ? Math.max(...sameKeyVersions.map((v) => v.version ?? 0)) + 1
            : 1;

        const publishedDef: ProcessDefinition = {
          ...def,
          id: nanoid(), // ⭐ 每个发布版本一个新 id
          definitionKey,
          version: nextVersion,
          status: "published",
          publishedAt: Date.now(),
        };

        set((state) => ({
          publishedFlows: [...state.publishedFlows, publishedDef],
          editingMode: "readonly",
          basePublishedVersion: undefined,
        }));
      },
      resetFlow: () =>
        set({
          processId: nanoid(),
          processName: "新业务流程",
          nodes: [],
          edges: [],
          selectedNodeId: null,
          selectedEdgeId: null,

          editingMode: "draft",
          basePublishedVersion: undefined,
        }),

      duplicatePublishedAsDraft: (definitionId) => {
        const { publishedFlows } = get();
        const published = publishedFlows.find(
          (f) => f.id === definitionId && f.status === "published"
        );
        if (!published) {
          console.warn("未找到已发布流程，无法创建草稿");
          return;
        }

        const newProcessId = nanoid();

        set({
          processId: newProcessId,
          processName: published.name,
          nodes: JSON.parse(JSON.stringify(published.nodes)),
          edges: JSON.parse(JSON.stringify(published.edges)),
          editingMode: "draft",
          basePublishedVersion: published.version,
          selectedNodeId: null,
          selectedEdgeId: null,
        });
      },

      loadFlow: (flow) =>
        set({
          processId: flow.id,
          processName: flow.name,
          nodes: JSON.parse(JSON.stringify(flow.nodes)),
          edges: JSON.parse(JSON.stringify(flow.edges)),
          editingMode: flow.status === "published" ? "readonly" : "draft",
          basePublishedVersion:
            flow.status === "published" ? flow.version : undefined,
          selectedNodeId: null,
          selectedEdgeId: null,
        }),
    }),
    {
      name: "campus-flow-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        processId: state.processId,
        processName: state.processName,
        nodes: state.nodes,
        edges: state.edges,
        publishedFlows: state.publishedFlows,
        editingMode: state.editingMode,
        basePublishedVersion: state.basePublishedVersion,
      }),
    }
  )
);
