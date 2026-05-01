import React, { useEffect, useState } from "react";
import { Table, Tag } from "antd";
import { PageContainer } from "@project/ui-components";
import { request } from "../../api/request";

type ApplicationItem = {
  id: string;
  title: string;
  type: string;
  status: string;
  currentNode: string;
  createdAt: number;
};

const MyApplications: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<ApplicationItem[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const resp = await request<ApplicationItem[]>({ url: "/applications/my", method: "GET" });
        setList(resp.data || []);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <PageContainer title="我发起的申请">
      <Table
        rowKey="id"
        loading={loading}
        dataSource={list}
        columns={[
          { title: "标题", dataIndex: "title" },
          { title: "类型", dataIndex: "type" },
          { title: "状态", render: (_, r) => <Tag color={r.status === "approved" ? "green" : "blue"}>{r.status}</Tag> },
          { title: "当前节点", dataIndex: "currentNode" },
          { title: "提交时间", render: (_, r) => new Date(r.createdAt).toLocaleString("zh-CN", { hour12: false }) },
        ]}
      />
    </PageContainer>
  );
};

export default MyApplications;
