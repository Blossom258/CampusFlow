import React from "react";
import { Typography, Tag } from "antd";
import type { Role } from "../../../types/process";
const { Title, Text } = Typography;

interface ApprovalHeaderProps {
  userRole: Role;
}

const ApprovalHeader: React.FC<ApprovalHeaderProps> = ({ userRole }) => {
  const getRoleTag = () => {
    switch (userRole) {
      case "admin":
        return <Tag color="red">管理员 (Admin)</Tag>;
      case "manager":
        return <Tag color="orange">部门经理 (Manager)</Tag>;
      case "hr":
        return <Tag color="green">人事专员 (HR)</Tag>;
      case "finance":
        return <Tag color="cyan">财务专员 (Finance)</Tag>;
      default:
        return <Tag color="geekblue">普通员工 ({userRole})</Tag>;
    }
  };

  return (
    <div
      style={{
        marginBottom: 24,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <Title level={4} style={{ margin: 0 }}>
          审批工作台
        </Title>
        <Text type="secondary">当前登录身份: {getRoleTag()}</Text>
      </div>
    </div>
  );
};

export default ApprovalHeader;