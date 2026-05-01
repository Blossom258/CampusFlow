import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { message } from "antd";
import type { StepsProps, TimelineProps } from "antd";

import { useProcessInstanceStore } from "../../store/processInstanceStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useTaskStore } from "../../store/taskStore";
import { ApprovalGuardError } from "@project/utils";
import type { Role } from "../../types/process";

/**
 * 审批详情页面的唯一业务入口
 * ❗ 页面 / 组件 不允许再直接访问 store
 */
export function useApprovalDetail(instanceId?: string) {
  const navigate = useNavigate();

  /* =========================
   * 基础数据（store）
   * ========================= */
  const currentUserRole = useAuthStore((s) => s.role as Role);

  const instance = useProcessInstanceStore((s) =>
    instanceId ? s.instances[instanceId] : undefined
  );

  const tasks = useTaskStore((s) => s.tasks);
  const approveTask = useTaskStore((s) => s.approveTask);
  const rejectTask = useTaskStore((s) => s.rejectTask);

  const loading = !instanceId || !instance;

  const formData = useMemo<Record<string, unknown>>(() => {
    return (instance?.formData ?? {}) as Record<string, unknown>;
  }, [instance]);

  /* =========================
   * 运行态 task & 权限判断
   * ========================= */
  const myPendingTask = useMemo(() => {
    if (!instance) return undefined;
    return tasks.find(
      (t) =>
        t.instanceId === instance.instanceId &&
        t.assigneeRole === currentUserRole &&
        t.status === "pending"
    );
  }, [tasks, instance, currentUserRole]);

  const isCreator = instance ? instance.createdBy === currentUserRole : false;

  const canApprove =
    !!instance &&
    instance.status === "running" &&
    !isCreator &&
    !!myPendingTask;

  /* =========================
   * Steps 构建（流程运行态）
   * ========================= */

  const approvalPath = useMemo(() => {
    type ConditionOp = "gt" | "gte" | "lt" | "lte" | "eq" | "neq";

    interface GatewayCondition {
      left?: string;
      op?: ConditionOp;
      right?: unknown;
    }

    const getByPath = (obj: unknown, path: string): unknown => {
      if (!path) return undefined;
      const parts = path.split(".").filter(Boolean);
      let cur: unknown = obj;
      for (const p of parts) {
        if (cur == null || typeof cur !== "object") return undefined;
        cur = (cur as Record<string, unknown>)[p];
      }
      return cur;
    };

    const toComparable = (v: unknown): string | number | boolean | null => {
      if (v == null) return null;
      if (typeof v === "number" || typeof v === "boolean") return v;
      if (typeof v === "string") {
        const s = v.trim();
        if (s !== "" && !Number.isNaN(Number(s))) return Number(s);
        if (s === "true") return true;
        if (s === "false") return false;
        return s;
      }
      return String(v);
    };

    const evalCondition = (
      condition: GatewayCondition | undefined,
      context: { form: Record<string, unknown> }
    ): boolean => {
      if (!condition || !condition.left || !condition.op) return false;

      const leftValueRaw = condition.left.startsWith("form.")
        ? getByPath(context, condition.left)
        : undefined;

      const leftValue = toComparable(leftValueRaw);
      const rightValue = toComparable(condition.right);

      const bothNumber =
        typeof leftValue === "number" && typeof rightValue === "number";

      const l = bothNumber ? leftValue : String(leftValue ?? "");
      const r = bothNumber ? rightValue : String(rightValue ?? "");

      switch (condition.op) {
        case "gt":
          return l > r;
        case "gte":
          return l >= r;
        case "lt":
          return l < r;
        case "lte":
          return l <= r;
        case "eq":
          return l === r;
        case "neq":
          return l !== r;
        default:
          return false;
      }
    };

    if (!instance?.definitionSnapshot) return [];

    const def = instance.definitionSnapshot;
    const startNode = def.nodes.find((n) => n.type === "start");
    if (!startNode) return [];

    const visited = new Set<string>();
    const approvals: Array<{ id: string; name: string }> = [];

    let cursorId: string | null = startNode.id;
    let guard = 0;

    while (cursorId && guard < 200) {
      guard++;
      if (visited.has(cursorId)) break;
      visited.add(cursorId);

      const node = def.nodes.find((n) => n.id === cursorId);
      if (!node) break;

      if (node.type === "approval") {
        approvals.push({ id: node.id, name: node.name });
      }

      if (node.type === "end") break;

      const outgoing = def.edges.filter((e) => e.from.nodeId === cursorId);

      let nextId: string | null = null;
      if (node.type !== "gateway") {
        nextId = outgoing[0]?.to?.nodeId ?? null;
      } else {
        for (const e of outgoing) {
          if (!e.isDefault && e.condition) {
            if (
              evalCondition(e.condition as GatewayCondition, {
                form: formData,
              })
            ) {
              nextId = e.to?.nodeId ?? null;
              break;
            }
          }
        }
        if (!nextId) {
          nextId = outgoing.find((e) => e.isDefault)?.to?.nodeId ?? null;
        }
      }

      cursorId = nextId;
    }

    return approvals;
  }, [instance, formData]);

  /* =========================
   * Steps：流程运行态 + 会签/或签解释（最终稳定版）
   * ========================= */

  const getRuntimeApproversText = React.useCallback(
    (nodeId: string): string => {
      if (!instance) return "未开始";

      const record = instance.approvalRecords?.[nodeId];
      if (!record) return "未开始";

      // 该节点下的所有 runtime task
      const nodeTasks = tasks.filter((t) => record.taskIds?.includes(t.id));

      // 角色集合（去重）
      const allRoles = Array.from(
        new Set(nodeTasks.map((t) => t.assigneeRole))
      );

      const approvedIds = record.approvedTaskIds ?? [];
      const rejectedIds = record.rejectedTaskIds ?? [];

      // 角色级状态分类
      const approvedRoles = nodeTasks
        .filter((t) => approvedIds.includes(t.id))
        .map((t) => t.assigneeRole);

      const rejectedRoles = nodeTasks
        .filter((t) => rejectedIds.includes(t.id))
        .map((t) => t.assigneeRole);

      const pendingRoles = nodeTasks
        .filter(
          (t) =>
            !approvedIds.includes(t.id) &&
            !rejectedIds.includes(t.id)
        )
        .map((t) => t.assigneeRole);

      const roleText = allRoles.join(" / ") || "未配置";
      const modeText = record.mode === "MATCH_ALL" ? "会签" : "或签";

      // ===== 概览 =====
      let summary = "";
      if (record.mode === "MATCH_ALL") {
        summary = `已通过 ${approvedIds.length}/${record.taskIds?.length ?? 0}`;
      } else {
        summary =
          approvedIds.length > 0 ? "已有人通过" : "等待任一人通过";
      }

      // ===== 角色级状态 Tag（纯字符串）=====
      // 约定：
      // ✔ 已通过   ⏳ 待审批   ❌ 已驳回
      const roleStatusParts: string[] = [];

      approvedRoles.forEach((r) => {
        roleStatusParts.push(`✔ ${r}`);
      });

      pendingRoles.forEach((r) => {
        roleStatusParts.push(`⏳ ${r}`);
      });

      rejectedRoles.forEach((r) => {
        roleStatusParts.push(`❌ ${r}`);
      });

      // 第一行：概览
      // 第二行：角色级状态（同一行，用空格分隔）
      return [
        `${roleText}（${modeText}，${summary}）`,
        roleStatusParts.join("   "),
      ]
        .filter(Boolean)
        .join("\n");
    },
    [instance, tasks]
  );

  const currentApprovalIndex = useMemo(() => {
    if (!instance) return 0;
    let index = approvalPath.findIndex((n) => n.id === instance.currentNodeId);

    // currentNode 不是 approval（比如 gateway / end）
    if (index === -1 && instance.status === "running") {
      index = approvalPath.findIndex((n) => !instance.approvalRecords?.[n.id]);
      if (index === -1) index = approvalPath.length;
    }

    return index;
  }, [approvalPath, instance]);

  const stepItems: StepsProps["items"] = useMemo(() => {
    if (!instance) return [];

    return [
      { title: "发起申请", status: "finish" },

      ...approvalPath.map((node, index) => {
        let status: "wait" | "process" | "finish" | "error" = "wait";

        if (instance.status === "approved") status = "finish";
        else if (instance.status === "rejected") {
          status = index === currentApprovalIndex ? "error" : "finish";
        } else {
          if (index < currentApprovalIndex) status = "finish";
          else if (index === currentApprovalIndex) status = "process";
        }

        return {
          title: node.name,
          description: `审批人：${getRuntimeApproversText(node.id)}`,
          status,
        };
      }),

      {
        title: "流程结束",
        status:
          instance.status === "approved"
            ? "finish"
            : instance.status === "rejected"
            ? "error"
            : "wait",
      },
    ];
  }, [instance, approvalPath, currentApprovalIndex, getRuntimeApproversText]);

  const currentStep =
    stepItems.findIndex((i) => i?.status === "process") >= 0
      ? stepItems.findIndex((i) => i?.status === "process")
      : stepItems.length - 1;

/* =========================
 * Timeline（日志文案统一模板 · 支持换行）
 * ========================= */
const timelineItems: TimelineProps["items"] = useMemo(() => {
  if (!instance) return [];

  return instance.logs.map((log) => {
    let color: "blue" | "green" | "red" = "blue";
    let actionText = "";

    switch (log.action) {
      case "submit":
        color = "blue";
        actionText = "提交申请";
        break;
      case "approve":
        color = "green";
        actionText = "通过审批";
        break;
      case "reject":
        color = "red";
        actionText = "驳回审批";
        break;
      case "delegate":
        color = "blue";
        actionText = "委派审批";
        break;
      default:
        actionText = log.action;
    }

    const timeText = new Date(log.date).toLocaleString();

    const lines: string[] = [];
    lines.push(`${log.operator} ${actionText}`);
    lines.push(timeText);
    if (log.comment) {
      lines.push(`备注：${log.comment}`);
    }

    return {
      color,
      content: lines.join("\n"), // ✅ 关键修复点
    };
  });
}, [instance]);

  /* =========================
   * handlers（唯一副作用入口）
   * ========================= */
  const onBack = () => navigate(-1);

  const onApprove = () => {
    try {
      if (!myPendingTask) {
        message.error("未找到你的待办任务");
        return;
      }
      approveTask(myPendingTask.id);
      message.success("审批通过");
    } catch (e) {
      if (e instanceof ApprovalGuardError) {
        message.error(e.message);
        return;
      }
      throw e;
    }
  };

  const onReject = () => {
    try {
      if (!myPendingTask) {
        message.error("未找到你的待办任务");
        return;
      }
      rejectTask(myPendingTask.id);
      message.success("已驳回审批");
    } catch (e) {
      if (e instanceof ApprovalGuardError) {
        message.error(e.message);
        return;
      }
      throw e;
    }
  };

  return {
    loading,
    instance,
    formData,
    isCreator,
    canApprove,
    stepItems,
    currentStep,
    timelineItems,
    handlers: {
      onBack,
      onApprove,
      onReject,
    },
  };
}
