import React, { useEffect, useState } from "react";
import { Button, Space, Table, Tag, message } from "antd";
import { request } from "../../api/request";
import { PageContainer } from "@project/ui-components";

type PendingTask = {
  id: string;
  assigneeRole: string;
  createdAt: number;
  application?: {
    id: string;
    title: string;
    type: string;
    createdBy: string;
    currentNode: string;
  } | null;
};

const Approval: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<PendingTask[]>([]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const resp = await request<PendingTask[]>({ url: "/tasks/pending", method: "GET" });
      setTasks(resp.data || []);
    } finally {
      setLoading(false);
    }
  };

  const approve = async (taskId: string) => {
    await request({ url: `/tasks/${taskId}/approve`, method: "POST" });
    message.success("审批通过");
    await loadTasks();
  };

  useEffect(() => {
    void loadTasks();
  }, []);

  return (
    <PageContainer title="审批中心">
      <Table
        rowKey="id"
        loading={loading}
        dataSource={tasks}
        columns={[
          { title: "申请标题", render: (_, r) => r.application?.title || "-" },
          { title: "事务类型", render: (_, r) => r.application?.type || "-" },
          { title: "申请人", render: (_, r) => <Tag>{r.application?.createdBy || "-"}</Tag> },
          { title: "当前节点", render: (_, r) => r.application?.currentNode || "-" },
          {
            title: "操作",
            render: (_, r) => (
              <Space>
                <Button type="primary" size="small" onClick={() => void approve(r.id)}>
                  通过
                </Button>
              </Space>
            ),
          },
        ]}
      />
    </PageContainer>
  );
};

export default Approval;
