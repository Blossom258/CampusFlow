import React from "react";
import { Card, Steps, Empty, Typography } from "antd";


const { Text } = Typography;

export type PreviewStepItem = {
  title: string;
  status?: "wait" | "process" | "finish" | "error";
};

interface FlowPreviewProps {
  /** 当前选择的流程名称 */
  flowName?: string;
  /**
   * 预览步骤：
   * - "NEED_CONDITION_INPUT"：需要输入条件
   * - PreviewStepItem[]：可渲染步骤
   * - null / undefined：未选择流程
   */
  previewSteps?: PreviewStepItem[] | "NEED_CONDITION_INPUT";
}

/**
 * FlowPreview
 * 仅负责审批流「只读预览」
 * ❌ 不包含任何业务逻辑
 */
const FlowPreview: React.FC<FlowPreviewProps> = ({
  flowName,
  previewSteps,
}) => {
  return (
    <Card title="审批流预览" variant="outlined">
      {flowName ? (
        <>
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">即将发起的流程：</Text>
            <br />
            <Text strong style={{ fontSize: 16 }}>
              {flowName}
            </Text>
          </div>

          {previewSteps === "NEED_CONDITION_INPUT" ? (
            <Empty
              description="请先填写条件字段（如：金额 / 天数）以预览审批流程"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : Array.isArray(previewSteps) ? (
            <Steps
              orientation="vertical"
              size="small"
              current={0}
              items={previewSteps}
            />
          ) : (
            <Empty
              description="请先在左侧选择流程"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </>
      ) : (
        <Empty
          description="请先在左侧选择流程"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}
    </Card>
  );
};

export default FlowPreview;