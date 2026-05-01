import { create } from "zustand";
import { nanoid } from "nanoid";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ProcessDefinition, FlowNode } from "../types/flow";
import type { Role } from "../types/process";
import { useAuthStore } from "./useAuthStore";
// import type { UserRole } from "./useAuthStore";
import { useTaskStore } from "./taskStore";
import type { FlowEdge } from "../types/flow";
import { evaluateCondition } from "@project/utils";
import type { FormValue } from "../types/process";
import { useFlowStore } from "./flowStore";
import type { ProcessInstance } from "../types/process";

// =====================
// 审批日志
// =====================
export type ApprovalLog = {
  date: number;
  action: "submit" | "approve" | "reject" | "delegate";
  operator: string;
  comment?: string;
};

export type InstanceStatus = "running" | "approved" | "rejected";

// =====================
// Store 类型
// =====================
type ProcessInstanceStore = {
  instances: Record<string, ProcessInstance>;

  startProcess: (
    params:
      | { definitionId: string }
      | { definitionKey: string; version: number },
    formData?: Record<string, unknown>
  ) => string;

  getInstanceById: (instanceId: string) => ProcessInstance | undefined;

  /** ⭐ Step 3 新接口：task 驱动流程（占位版） */
  applyTaskAction: (params: {
    taskId: string;
    action: "approve" | "reject";
    operator: string;
  }) => void;

  createInstance: (
    definitionId: string,
    startNodeId: string
  ) => ProcessInstance;

  appendLog: (instanceId: string, log: ApprovalLog) => void;
};

// =====================
// 工具函数
// =====================

/**
 * 规范化表单数据，仅保留 string/number/boolean/null 类型
 */
function normalizeFormData(
  formData: Record<string, unknown>
): Record<string, FormValue> {
  const result: Record<string, FormValue> = {};
  for (const [k, v] of Object.entries(formData)) {
    if (
      typeof v === "string" ||
      typeof v === "number" ||
      typeof v === "boolean" ||
      v === null
    ) {
      result[k] = v;
    }
    // 其他类型（object/array/function/undefined）不进入条件上下文
  }
  return result;
}
function getNextNodeByRuntime(
  def: ProcessDefinition,
  nodeId: string | null,
  context: { form: Record<string, FormValue> }
) {
  if (!nodeId) return null;

  const outgoingEdges: FlowEdge[] = def.edges.filter(
    (e) => e.from.nodeId === nodeId
  );
  if (outgoingEdges.length === 0) return null;

  const currentNode = def.nodes.find((n) => n.id === nodeId);
  if (!currentNode) return null;

  // 普通节点：仍然按第一条边走（兼容你现在的实现）
  if (currentNode.type !== "gateway") {
    const edge = outgoingEdges[0];
    return def.nodes.find((n) => n.id === edge.to.nodeId) || null;
  }

  // ===== XOR Gateway 核心逻辑 =====
  // 1. 先找条件命中的边（非 default）
  console.log("[gateway] evaluating edges", {
    nodeId,
    context,
    outgoingEdges,
  });

  const matchedEdge = outgoingEdges.find((e) => {
    const result = !e.isDefault && evaluateCondition(e.condition, context);
    console.log("[gateway] check edge", {
      edgeId: e.id,
      condition: e.condition,
      isDefault: e.isDefault,
      result,
    });
    return result;
  });

  if (matchedEdge) {
    console.log("[gateway] matchedEdge ->", matchedEdge.to.nodeId);
    return def.nodes.find((n) => n.id === matchedEdge.to.nodeId) || null;
  }

  // 2. 找 default 边
  const defaultEdge = outgoingEdges.find((e) => e.isDefault);
  console.log("[gateway] defaultEdge ->", defaultEdge?.to.nodeId);
  if (defaultEdge) {
    return def.nodes.find((n) => n.id === defaultEdge.to.nodeId) || null;
  }

  // 3. 没有 default → 配置错误
  throw new Error("条件网关缺少默认路径，请检查流程配置");
}

// =====================
// Store 实现
// =====================
export const useProcessInstanceStore = create<ProcessInstanceStore>()(
  persist(
    (set, get) => ({
      instances: {},

      // =====================
      // 发起流程
      // =====================
      startProcess: (params, formData = {}) => {
        console.log("[startProcess] called", {
          params,
          formData,
        });
        const { publishedFlows } = useFlowStore.getState();

        let definition: ProcessDefinition | undefined;

        // ===== 1️⃣ 精确查找流程定义（禁止默认 latest）=====
        if ("definitionId" in params) {
          definition = publishedFlows.find((f) => f.id === params.definitionId);
        } else {
          definition = publishedFlows.find(
            (f) =>
              f.definitionKey === params.definitionKey &&
              f.version === params.version
          );
        }

        if (!definition) {
          throw new Error("未找到指定版本的流程定义，无法发起流程");
        }

        // ===== 2️⃣ 以下逻辑基本保持你原来的实现 =====
        const title =
          typeof formData.title === "string" && formData.title.trim()
            ? formData.title
            : definition.name;

        const currentUserRole = (useAuthStore.getState().role ??
          "user") as Role;
        const startNode = definition.nodes.find((n) => n.type === "start");
        console.log("[startProcess] startNode", startNode);
        const instanceId = nanoid();
        const now = Date.now();
        const normalizedForm = normalizeFormData(formData);
        console.log("[startProcess] normalizedForm", normalizedForm);

        let firstNode = getNextNodeByRuntime(
          definition,
          startNode?.id || null,
          { form: normalizedForm }
        );

        console.log("[startProcess] firstNode (raw)", {
          id: firstNode?.id,
          type: firstNode?.type,
          name: firstNode?.name,
        });

        // ⭐ gateway 自动穿透（核心）
        while (firstNode && firstNode.type === "gateway") {
          console.log("[startProcess][gateway] evaluating", {
            gatewayId: firstNode.id,
          });

          const next = getNextNodeByRuntime(definition, firstNode.id, {
            form: normalizedForm,
          });

          if (!next) {
            throw new Error("Gateway 未能计算出下一个节点，请检查条件或默认路径");
          }

          console.log("[startProcess][gateway] resolved ->", {
            id: next.id,
            type: next.type,
            name: next.name,
          });

          firstNode = next;
        }

        console.log("[startProcess] firstNode (resolved)", {
          id: firstNode?.id,
          type: firstNode?.type,
          name: firstNode?.name,
        });

        const approvalRecords: ProcessInstance["approvalRecords"] = {};

        if (firstNode && firstNode.type === "approval") {
          const taskStore = useTaskStore.getState();

          const roles = Array.isArray(firstNode.config.approverRoles)
            ? firstNode.config.approverRoles
            : firstNode.config.approverRole
            ? [firstNode.config.approverRole]
            : [];

          console.log("[approval] entering approval node", {
            nodeId: firstNode.id,
            nodeName: firstNode.name,
            approverRoles: roles,
          });

          const tasks = roles.map((role) =>
            taskStore.createTask(instanceId, firstNode.id, role as Role)
          );

          approvalRecords[firstNode.id] = {
            mode: firstNode.config.approvalMode,
            taskIds: tasks.map((t) => t.id),
            approvedTaskIds: [],
            rejectedTaskIds: [],
          };
        }

        // ===== 1️⃣ definitionKey/definitionVersion 安全兜底 =====
        const definitionKey = definition.definitionKey ?? definition.id;
        const definitionVersion = definition.version ?? 1;

        const instance: ProcessInstance = {
          instanceId,
          title,
          processDefinitionId: definition.id,
          definitionSnapshot: definition,
          definitionKey,
          definitionVersion,
          currentNodeId: firstNode ? firstNode.id : null,
          status: "running",
          approvalRecords,
          createdBy: currentUserRole,
          createdAt: now,
          formData,
          context: {
            form: normalizedForm,
          },
          logs: [
            {
              date: now,
              action: "submit",
              operator: "申请人",
              comment: "发起流程申请",
            },
          ],
        };

        set((state) => ({
          instances: { ...state.instances, [instanceId]: instance },
        }));

        return instanceId;
      },

      getInstanceById: (instanceId) => get().instances[instanceId],

      // =====================
      // Step 3：task 驱动（占位版）
      // =====================
      applyTaskAction: ({ taskId, action, operator }) => {
        set((state) => {
          const taskStore = useTaskStore.getState();

          // 1️⃣ 找到 task
          const task = taskStore.tasks.find((t) => t.id === taskId);
          if (!task) return state;

          const instance = state.instances[task.instanceId];
          if (!instance || instance.status !== "running") return state;

          const nodeId = task.nodeId;
          const record = instance.approvalRecords[nodeId];
          if (!record) return state;

          // 2️⃣ 写入 task 级审批结果
          const approvedTaskIds = [...record.approvedTaskIds];
          const rejectedTaskIds = [...record.rejectedTaskIds];

          if (action === "approve") {
            if (!approvedTaskIds.includes(taskId)) {
              approvedTaskIds.push(taskId);
            }
          }

          if (action === "reject") {
            if (!rejectedTaskIds.includes(taskId)) {
              rejectedTaskIds.push(taskId);
            }
          }

          const updatedRecord = {
            ...record,
            approvedTaskIds,
            rejectedTaskIds,
          };

          // 3️⃣ 判断是否满足会签推进条件
          let shouldMove = false;
          let shouldReject = false;

          if (record.mode === "MATCH_ANY") {
            if (approvedTaskIds.length >= 1) {
              shouldMove = true;
            }
          }

          if (record.mode === "MATCH_ALL") {
            if (rejectedTaskIds.length > 0) {
              shouldReject = true;
            } else if (approvedTaskIds.length === record.taskIds.length) {
              shouldMove = true;
            }
          }

          // 4️⃣ 更新 approvalRecords
          const nextApprovalRecords = {
            ...instance.approvalRecords,
            [nodeId]: updatedRecord,
          };

          // 5️⃣ 会签失败 → 整个流程 reject
          if (shouldReject) {
            // 关闭其余 task
            const remainTaskIds = record.taskIds.filter((id) => id !== taskId);
            taskStore.cancelTasks(remainTaskIds, "会签失败，流程终止");

            return {
              instances: {
                ...state.instances,
                [instance.instanceId]: {
                  ...instance,
                  status: "rejected",
                  currentNodeId: null,
                  approvalRecords: nextApprovalRecords,
                  logs: [
                    ...instance.logs,
                    {
                      date: Date.now(),
                      action: "reject",
                      operator,
                      comment: "会签节点被拒绝，流程终止",
                    },
                  ],
                },
              },
            };
          }

          // 6️⃣ 会签通过 → 推进到下一个节点
          if (shouldMove) {
            // 关闭其余未处理 task
            const remainTaskIds = record.taskIds.filter(
              (id) => !approvedTaskIds.includes(id)
            );
            taskStore.cancelTasks(remainTaskIds, "会签已完成，任务自动关闭");

            const def = instance.definitionSnapshot;
            let nextNode: FlowNode | null = null;

            if (def) {
              const outgoing = def.edges.filter(e => e.from.nodeId === nodeId);
              if (outgoing.length > 0) {
                const edge = outgoing[0]; // approval 节点只能线性推进
                nextNode = def.nodes.find(n => n.id === edge.to.nodeId) || null;
              }
            }

            let newStatus: InstanceStatus = "running";
            let nextNodeId: string | null = null;

            const finalApprovalRecords = { ...nextApprovalRecords };

            if (!nextNode || nextNode.type === "end") {
              newStatus = "approved";
              nextNodeId = null; // ⭐ 明确终止流程，防止继续串行
            } else if (nextNode.type === "approval") {
              const nextRoles = Array.isArray(nextNode.config.approverRoles)
                ? nextNode.config.approverRoles
                : nextNode.config.approverRole
                ? [nextNode.config.approverRole]
                : [];

              const tasks = nextRoles.map((role) =>
                taskStore.createTask(
                  instance.instanceId,
                  nextNode.id,
                  role as Role
                )
              );

              nextNodeId = nextNode.id;

              finalApprovalRecords[nextNode.id] = {
                mode: nextNode.config.approvalMode,
                taskIds: tasks.map((t) => t.id),
                approvedTaskIds: [],
                rejectedTaskIds: [],
              };
            }

            // 不创建任何后续 task 当流程已终止（approved）
            return {
              instances: {
                ...state.instances,
                [instance.instanceId]: {
                  ...instance,
                  status: newStatus,
                  currentNodeId: nextNodeId,
                  approvalRecords: finalApprovalRecords,
                  logs: [
                    ...instance.logs,
                    {
                      date: Date.now(),
                      action: "approve",
                      operator,
                      comment:
                        newStatus === "approved"
                          ? "会签完成，流程结束"
                          : "会签完成，流转到下一节点",
                    },
                  ],
                },
              },
            };
          }

          // 7️⃣ 未达成条件，仅记录进度
          return {
            instances: {
              ...state.instances,
              [instance.instanceId]: {
                ...instance,
                approvalRecords: nextApprovalRecords,
                logs: [
                  ...instance.logs,
                  {
                    date: Date.now(),
                    action,
                    operator,
                    comment: `会签进行中 (${approvedTaskIds.length}/${record.taskIds.length})`,
                  },
                ],
              },
            },
          };
        });
      },

      appendLog: (instanceId, log) => {
        set((state) => {
          const instance = state.instances[instanceId];
          if (!instance) return state;

          return {
            instances: {
              ...state.instances,
              [instanceId]: {
                ...instance,
                logs: [...instance.logs, log],
              },
            },
          };
        });
      },

      createInstance: (definitionId: string, startNodeId: string) => {
        const instanceId = nanoid();
        const now = Date.now();

        const instance: ProcessInstance = {
          instanceId,
          title: "未命名流程",
          processDefinitionId: definitionId,

          definitionKey: definitionId,
          definitionVersion: 1,

          currentNodeId: startNodeId,
          status: "running",
          approvalRecords: {},
          definitionSnapshot: null,
          createdBy: "user",
          createdAt: now,
          logs: [],
        };

        set((state) => ({
          instances: { ...state.instances, [instanceId]: instance },
        }));

        return instance;
      },
    }),
    {
      name: "enterprise-instance-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
