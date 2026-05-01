import React from "react";
import { Space } from "antd";

interface ApprovalDetailLayoutProps {
  header: React.ReactNode;
  steps: React.ReactNode;
  form: React.ReactNode;
  timeline: React.ReactNode;
}

/**
 * ApprovalDetailLayout
 *
 * 页面结构职责：
 * - Header（标题 / 操作）
 * - Steps（审批步骤）
 * - 主内容区（表单 + 时间线）
 *
 * ❗ 不包含任何业务逻辑
 */
const ApprovalDetailLayout: React.FC<ApprovalDetailLayoutProps> = ({
  header,
  steps,
  form,
  timeline,
}) => {
  return (
    <div
      style={{
        padding: 24,
        background: "#f5f5f5",
        minHeight: "100vh",
      }}
    >
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* Header */}
        {header}

        {/* Steps */}
        {steps}

        {/* Main Content */}
        <div
          style={{
            display: "flex",
            gap: 24,
            alignItems: "flex-start",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>{form}</div>

          <div style={{ width: 360, flexShrink: 0 }}>{timeline}</div>
        </div>
      </Space>
    </div>
  );
};

export default ApprovalDetailLayout;