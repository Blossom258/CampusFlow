import { useState, useMemo } from "react";
import { Form, message } from "antd";
import { useNavigate } from "react-router-dom";

import { useFlowStore } from "../../store/flowStore";
import { useProcessInstanceStore } from "../../store/processInstanceStore";
import { useAuthStore } from "../../store/useAuthStore";
import { buildApprovalPath } from "@project/workflow-sdk";
import { getDefinitionSnapshot } from "@project/workflow-sdk";;

/* =========================
   Types（最小可用）
========================= */

export interface ApplyFormData extends Record<string, unknown> {
  title: string;
  reason: string;
  amount?: number;
  days?: number;
}

/* =========================
   useApply
========================= */

export function useApply() {
  const navigate = useNavigate();
  const [form] = Form.useForm<ApplyFormData>();

  const [loading, setLoading] = useState(false);
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);

  const watchedAmount = Form.useWatch("amount", form);
  const watchedDays = Form.useWatch("days", form);

  const publishedFlows = useFlowStore((s) => s.publishedFlows);
  const startProcess = useProcessInstanceStore((s) => s.startProcess);
  const role = useAuthStore((s) => s.role) || "user";

  const selectedFlow = publishedFlows.find((f) => f.id === selectedFlowId);

  const needAmountInput = useMemo(() => {
    if (!selectedFlow) return false;

    const definition = getDefinitionSnapshot(selectedFlow);
    if (!definition) return false;

    const hasGateway = definition.nodes.some((n) => n.type === "gateway");
    const hasCondition = definition.edges.some((e) => !!e.condition);

    return hasGateway && hasCondition;
  }, [selectedFlow]);

  /* =========================
     提交
  ========================= */

  const onFinish = async (values: ApplyFormData) => {
    if (!selectedFlow) {
      message.error("请先选择一个审批流程类型！");
      return;
    }

    if (
      !selectedFlow.definitionKey ||
      typeof selectedFlow.version !== "number"
    ) {
      message.error("流程定义不完整，请联系管理员重新发布流程");
      return;
    }

    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 800));

      const instanceId = startProcess(
        {
          definitionKey: selectedFlow.definitionKey,
          version: selectedFlow.version,
        },
        values
      );

      message.success(`申请提交成功！（单号：${instanceId}）`);

      navigate(
        role === "user" || role === "admin" ? "/my-applications" : "/approval"
      );
    } catch (e) {
      console.error(e);
      message.error("流程发起失败");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     审批流预览
  ========================= */

  const previewSteps = useMemo(() => {
    if (!selectedFlow) {
      return [
        { title: "填写申请", description: "待开始" },
        { title: "选择流程", description: "请先选择业务类型" },
        { title: "审批结束", description: "..." },
      ];
    }

    const definition = getDefinitionSnapshot(selectedFlow);
    if (!definition) {
      return [
        { title: "发起申请", status: "finish" as const },
        { title: "流程定义异常", status: "wait" as const },
      ];
    }

    //const hasGateway = definition.nodes.some((n) => n.type === "gateway");
    //const hasCondition = definition.edges.some((e) => !!e.condition);

    if (
      needAmountInput &&
      (watchedAmount == null || Number.isNaN(Number(watchedAmount))) &&
      (watchedDays == null || Number.isNaN(Number(watchedDays)))
    ) {
      return "NEED_CONDITION_INPUT" as const;
    }

    const ctx = {
      form: {
        ...form.getFieldsValue(),
        amount:
          watchedAmount != null ? Number(watchedAmount) : undefined,
        days:
          watchedDays != null ? Number(watchedDays) : undefined,
      },
    };

    const path = buildApprovalPath(definition, ctx);

    return [
      { title: "发起申请", status: "finish" as const },
      ...path.map((n) => ({
        title: n.label,
        status: "wait" as const,
      })),
      { title: "流程结束", status: "wait" as const },
    ];
  }, [selectedFlow, watchedAmount, watchedDays, form, needAmountInput]);

  /* =========================
     Export
  ========================= */

  return {
    form,
    loading,
    publishedFlows,

    selectedFlowId,
    setSelectedFlowId,

    selectedFlow,
    previewSteps,
    needAmountInput,

    onFinish,
  };
}
