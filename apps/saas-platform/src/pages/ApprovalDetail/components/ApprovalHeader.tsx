import React from "react";
import {
  Card,
  Tag,
  Button,
  Alert,
  Space,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

export type ApprovalHeaderProps = {
  title: string;
  status: "running" | "approved" | "rejected";
  instanceId: string;

  canApprove: boolean;
  isCreator: boolean;

  onBack: () => void;
  onApprove: () => void;
  onReject: () => void;
};

const statusMap: Record<
  ApprovalHeaderProps["status"],
  { color: string; text: string }
> = {
  running: { color: "blue", text: "审批中" },
  approved: { color: "green", text: "已通过" },
  rejected: { color: "red", text: "已驳回" },
};

const ApprovalHeader: React.FC<ApprovalHeaderProps> = ({
  title,
  status,
  instanceId,
  canApprove,
  isCreator,
  onBack,
  onApprove,
  onReject,
}) => {
  const statusMeta = statusMap[status];

  return (
    <Card>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 24,
        }}
      >
        {/* 左侧：标题 + 状态 */}
        <div>
          <Title level={4} style={{ marginBottom: 8 }}>
            {title || "无标题申请"}
          </Title>

          <Space>
            <Tag color={statusMeta.color}>{statusMeta.text}</Tag>
            <Text type="secondary">申请单号：{instanceId}</Text>
          </Space>
        </div>

        {/* 右侧：操作区 */}
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={onBack}
          >
            返回
          </Button>

          {canApprove && (
            <>
              <Button
                danger
                icon={<CloseCircleOutlined />}
                onClick={onReject}
              >
                驳回
              </Button>

              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={onApprove}
              >
                通过
              </Button>
            </>
          )}
        </Space>
      </div>

      {/* 发起人提示 */}
      {isCreator && status === "running" && (
        <Alert
          style={{ marginTop: 16 }}
          type="info"
          showIcon
          message="你是该流程的发起人，可查看流程进度，但不能参与审批。"
        />
      )}
    </Card>
  );
};

export default ApprovalHeader;