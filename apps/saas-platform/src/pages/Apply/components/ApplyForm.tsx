import React, { useState, useMemo } from "react";
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  Empty,
  Tag,
  message,
} from "antd";
import type { FormInstance } from "antd";
import { useNavigate } from "react-router-dom";

import { useProcessInstanceStore } from "../../../store/processInstanceStore";
import { useAuthStore } from "../../../store/useAuthStore";

const { TextArea } = Input;

export interface ApplyFormData extends Record<string, unknown> {
  title: string;
  reason: string;
  amount?: number;
  days?: number;
}

interface FlowNodeLike {
  type: string;
}

interface FlowEdgeLike {
  condition?: {
    left?: string;
  };
}

interface PublishedFlow {
  id: string;
  name: string;
  nodes?: FlowNodeLike[];
  edges?: FlowEdgeLike[];
  definitionKey?: string;
  version?: number;
  definitionSnapshot?: {
    nodes: FlowNodeLike[];
    edges: FlowEdgeLike[];
  };
}


interface ApplyFormProps {
  publishedFlows: PublishedFlow[];
  selectedFlowId: string | null;
  onSelectFlow: (id: string) => void;
  form: FormInstance;
  onSubmitSuccess: (instanceId: string) => void;
  needAmountInput: boolean;
}

/**
 * ApplyForm
 * - 仅负责业务申请表单
 * - 不包含流程预览 / 页面布局
 */
const ApplyForm: React.FC<ApplyFormProps> = ({
  publishedFlows,
  selectedFlowId,
  onSelectFlow,
  form,
  onSubmitSuccess,
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const startProcess = useProcessInstanceStore((s) => s.startProcess);
  const role = useAuthStore((s) => s.role) || "user";

  const selectedFlow = useMemo(
    () => publishedFlows.find((f) => f.id === selectedFlowId),
    [publishedFlows, selectedFlowId]
  );

  const usedConditionFields = useMemo(() => {
    if (!selectedFlow) return new Set<string>();

    // ✅ 兼容 publishedFlows 的两种结构
    const edges =
      selectedFlow.definitionSnapshot?.edges ??
      selectedFlow.edges ??
      [];

    const fields = new Set<string>();

    edges.forEach((edge: FlowEdgeLike) => {
      const left = edge.condition?.left;

      // Designer / Engine 统一使用 form.xxx
      if (typeof left === "string" && left.startsWith("form.")) {
        const key = left.slice("form.".length);
        if (key === "amount" || key === "days") {
          fields.add(key);
        }
      }
    });

    return fields;
  }, [selectedFlow]);

  const onFinish = async (values: ApplyFormData) => {
    if (!selectedFlow) {
      message.error("请先选择一个审批流程类型！");
      return;
    }

    if (!selectedFlow.definitionKey || typeof selectedFlow.version !== "number") {
      message.error("流程定义不完整，请联系管理员");
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

      message.success(`申请提交成功！（单号: ${instanceId}）`);
      onSubmitSuccess(instanceId);

      if (role === "user" || role === "admin") {
        navigate("/my-applications");
      } else {
        navigate("/approval");
      }
    } catch (e) {
      message.error("流程发起失败");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="业务申请单" variant="outlined">
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ title: "", reason: "" }}
      >
        <Form.Item
          label="选择审批流程"
          name="flowId"
          required
          tooltip="请选择您要办理的业务类型"
        >
          <Select
            size="large"
            placeholder="请选择业务类型"
            value={selectedFlowId ?? undefined}
            onChange={onSelectFlow}
            notFoundContent={
              <Empty description="暂无已发布流程，请联系管理员" />
            }
          >
            {publishedFlows.map((flow: PublishedFlow) => (
              <Select.Option key={flow.id} value={flow.id}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{flow.name}</span>
                  <Tag>{flow.nodes?.length ?? 0} 个节点</Tag>
                </div>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {usedConditionFields.has("amount") && (
          <Form.Item
            label="金额（用于条件判断）"
            name="amount"
            rules={[{ required: true, message: "请输入金额" }]}
          >
            <Input type="number" size="large" />
          </Form.Item>
        )}

        {usedConditionFields.has("days") && (
          <Form.Item
            label="天数（用于条件判断）"
            name="days"
            rules={[{ required: true, message: "请输入天数" }]}
          >
            <Input type="number" size="large" min={1} />
          </Form.Item>
        )}

        <Form.Item
          label="申请标题"
          name="title"
          rules={[{ required: true, message: "请输入申请标题" }]}
        >
          <Input size="large" />
        </Form.Item>

        <Form.Item
          label="申请事由 / 备注"
          name="reason"
          rules={[{ required: true, message: "请填写申请事由" }]}
        >
          <TextArea rows={6} />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loading}
            disabled={!selectedFlowId}
          >
            🚀 立即提交申请
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default ApplyForm;