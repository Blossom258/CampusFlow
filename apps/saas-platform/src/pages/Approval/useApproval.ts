import { useMemo, useState } from "react";
import { message } from "antd";
import { useNavigate } from "react-router-dom";

import type { UserRole } from "../../store/useAuthStore";
import type { Role, ProcessInstance, Task } from "../../types/process";
import { useAuthStore } from "../../store/useAuthStore";
import { useProcessInstanceStore } from "../../store/processInstanceStore";
import { useTaskStore } from "../../store/taskStore";
import { ApprovalGuardError } from "@project/utils";

import {
  buildApprovalPath,
  getDefinitionSnapshot,
} from "@project/workflow-sdk";

export function useApproval() {
  const navigate = useNavigate();

  // ===== Auth / Store =====
  const userRole = useAuthStore((s) => s.role as Role);

  const instancesMap = useProcessInstanceStore((s) => s.instances);
  const appendLog = useProcessInstanceStore((s) => s.appendLog);

  const tasks = useTaskStore((s) => s.tasks);
  const approveTask = useTaskStore((s) => s.approveTask);
  const delegateTask = useTaskStore((s) => s.delegateTask);

  // ===== Delegate Modal State =====
  const [delegateVisible, setDelegateVisible] = useState(false);
  const [delegatingTaskId, setDelegatingTaskId] = useState<string | null>(null);
  const [delegatingInstanceId, setDelegatingInstanceId] =
    useState<string | null>(null);
  const [delegateToRole, setDelegateToRole] = useState<UserRole | null>(null);

  // ===== Pending List =====
  const pendingList = useMemo(() => {
    const myTasks = tasks.filter(
      (t) => t.assigneeRole === userRole && t.status === "pending"
    );

    const uniqueInstanceIds = Array.from(
      new Set(myTasks.map((t) => t.instanceId))
    );

    return uniqueInstanceIds
      .map((id) => {
        const instance = instancesMap[id];
        if (!instance || !instance.definitionSnapshot) return instance;

        const def = getDefinitionSnapshot(instance);
        if (!def) return instance;

        const ctx = { form: instance.formData ?? {} };
        const path = buildApprovalPath(def, ctx);
        const current = path.find(
          (p) => p.id === instance.currentNodeId
        );

        const pendingApproverRoles = tasks
          .filter(
            (t) =>
              t.instanceId === instance.instanceId &&
              t.status === "pending"
          )
          .map((t) => t.assigneeRole);

        return {
          ...instance,
          currentApprovalLabel: current?.label ?? "-",
          pendingApproverRoles,
        };
      })
      .filter(
        (i): i is ProcessInstance => i !== undefined
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [tasks, userRole, instancesMap]);

  // ===== History List =====
  const historyList = useMemo(() => {
    return Object.values(instancesMap)
      .filter((i) => i.status !== "running")
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [instancesMap]);

  // ===== Actions =====
  const viewDetail = (instanceId: string) => {
    navigate(`/approval-detail/${instanceId}`);
  };

  const quickApprove = (instanceId: string) => {
    try {
      const task = tasks.find(
        (t: Task) =>
          t.instanceId === instanceId &&
          t.assigneeRole === userRole &&
          t.status === "pending"
      );

      if (!task) {
        message.error("未找到对应的待办任务");
        return;
      }

      approveTask(task.id);
      message.success("已通过审批并推进到下一节点");
    } catch (e) {
      if (e instanceof ApprovalGuardError) {
        message.error(e.message);
        return;
      }
      throw e;
    }
  };

  const openDelegate = (instanceId: string) => {
    const task = tasks.find(
      (t: Task) =>
        t.instanceId === instanceId &&
        t.assigneeRole === userRole &&
        t.status === "pending"
    );

    if (!task) {
      message.error("未找到可委派的待办任务");
      return;
    }

    setDelegatingTaskId(task.id);
    setDelegatingInstanceId(instanceId);
    setDelegateToRole(null);
    setDelegateVisible(true);
  };

  const confirmDelegate = () => {
    if (
      !delegatingTaskId ||
      !delegatingInstanceId ||
      !delegateToRole ||
      !userRole
    ) {
      message.error("请选择委派角色");
      return;
    }

    delegateTask(delegatingTaskId, delegateToRole as Role, userRole);

    appendLog(delegatingInstanceId, {
      date: Date.now(),
      action: "delegate",
      operator: userRole,
      comment: `委派给 ${delegateToRole}`,
    });

    message.success("委派成功");
    setDelegateVisible(false);
  };

  return {
    // data
    userRole,
    pendingList,
    historyList,

    // navigation
    viewDetail,

    // actions
    quickApprove,
    openDelegate,

    // delegate modal
    delegateVisible,
    delegateToRole,
    setDelegateToRole,
    setDelegateVisible,
    confirmDelegate,
  };
}