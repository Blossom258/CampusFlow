import React from "react";
import { Card, Descriptions, Typography } from "antd";

const { Text } = Typography;

export type ApprovalFormProps = {
  formData: Record<string, unknown>;
  createdAt: string | number;
};

const ApprovalForm: React.FC<ApprovalFormProps> = ({
  formData,
  createdAt,
}) => {
  return (
    <Card title="申请单详情" style={{ flex: 1 }}>
      <Descriptions column={1} bordered>
        {/* 标题 */}
        <Descriptions.Item label="申请标题">
          <Text strong>
            {(formData.title as string) || "-"}
          </Text>
        </Descriptions.Item>

        {/* 理由 */}
        <Descriptions.Item label="申请理由">
          {(formData.reason as string) || "无"}
        </Descriptions.Item>

        {/* 动态渲染其余字段 */}
        {Object.entries(formData).map(([key, value]) => {
          if (key === "title" || key === "reason") return null;

          return (
            <Descriptions.Item label={key} key={key}>
              {String(value)}
            </Descriptions.Item>
          );
        })}

        {/* 提交时间 */}
        <Descriptions.Item label="提交时间">
          {createdAt
            ? new Date(createdAt).toLocaleString()
            : "-"}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
};

export default ApprovalForm;