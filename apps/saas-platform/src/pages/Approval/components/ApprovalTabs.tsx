import React from "react";
import {
  Table,
  Tag,
  Typography,
  Button,
  Tooltip,
  Space,
  Tabs,
  Empty,
  Alert,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
} from "@ant-design/icons";

import type { ProcessInstance } from "../../../types/process";
import { StatusTag } from "@project/ui-components";

const { Text } = Typography;

interface ApprovalTabsProps {
  pendingList: ProcessInstance[];
  historyList: ProcessInstance[];

  onViewDetail: (instanceId: string) => void;
  onQuickApprove: (instanceId: string) => void;
  onOpenDelegate: (instanceId: string) => void;
}

const ApprovalTabs: React.FC<ApprovalTabsProps> = ({
  pendingList,
  historyList,
  onViewDetail,
  onQuickApprove,
  onOpenDelegate,
}) => {
  const hasPending = pendingList.length > 0;

  const getColumns = (isHistory = false): ColumnsType<ProcessInstance> => [
    {
      title: "申请内容",
      key: "summary",
      render: (_, record) => (
        <div>
          <Text strong>
            {(record.formData?.title as string) || "未命名申请"}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            单号: {record.instanceId}
          </Text>
        </div>
      ),
    },
    {
      title: "流程类型",
      key: "processName",
      render: (_, record) =>
        record.definitionSnapshot ? (
          <Tag>{record.definitionSnapshot.name}</Tag>
        ) : (
          <Tag>未知流程</Tag>
        ),
    },
    {
      title: "当前节点",
      dataIndex: "currentNodeId",
      key: "currentNodeId",
      render: (_, record) => {
        if (record.status !== "running") {
          return <Text type="secondary">-</Text>;
        }

        if (!record.currentApprovalLabel) {
          return <Text type="secondary">流程初始化中</Text>;
        }

        return (
          <Space direction="vertical" size={2}>
            <Tag color="blue">{record.currentApprovalLabel}</Tag>

            {Array.isArray(record.pendingApproverRoles) &&
              record.pendingApproverRoles.length > 0 && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  待审批：{record.pendingApproverRoles.join("、")}
                </Text>
              )}
          </Space>
        );
      },
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        if (status !== "running" && status !== "approved" && status !== "rejected") {
          return <Tag>{status}</Tag>;
        }

        return <StatusTag status={status} />;
      },
    },
    {
      title: "提交时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (time) => new Date(time).toLocaleString(),
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => onViewDetail(record.instanceId)}
          >
            详情
          </Button>

          {!isHistory && record.status === "running" && (
            <>
              <Button
                type="link"
                size="small"
                onClick={() => onOpenDelegate(record.instanceId)}
              >
                委派
              </Button>

              <Tooltip title="快速通过">
                <Button
                  type="text"
                  size="small"
                  style={{ color: "#52c41a" }}
                  icon={<CheckCircleOutlined />}
                  onClick={() => onQuickApprove(record.instanceId)}
                />
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  if (!hasPending) {
    return (
      <div style={{ textAlign: "center", marginTop: 48 }}>
        <Alert
          message="当前无审批权限 / 无待办任务"
          type="info"
          showIcon
        />
      </div>
    );
  }

  return (
    <Tabs
      defaultActiveKey="pending"
      items={[
        {
          key: "pending",
          label: (
            <span>
              <ClockCircleOutlined />
              待我审批 ({pendingList.length})
            </span>
          ),
          children: (
            <Table
              dataSource={pendingList}
              columns={getColumns(false)}
              rowKey="instanceId"
              pagination={{ pageSize: 5 }}
              locale={{
                emptyText: (
                  <Empty
                    description={
                      <span>
                        暂无待办任务 <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          提示：当有审批任务分配给你时，该审批单才会显示。
                        </Text>
                      </span>
                    }
                  />
                ),
              }}
            />
          ),
        },
        {
          key: "history",
          label: (
            <span>
              <HistoryOutlined />
              审批历史
            </span>
          ),
          children: (
            <Table
              dataSource={historyList}
              columns={getColumns(true)}
              rowKey="instanceId"
              pagination={{ pageSize: 10 }}
            />
          ),
        },
      ]}
    />
  );
};

export default ApprovalTabs;