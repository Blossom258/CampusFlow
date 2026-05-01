import React from "react";
import { Layout, Typography } from "antd";

const { Content } = Layout;
const { Title } = Typography;

interface ApplyLayoutProps {
  /** 页面主标题区域（由 index.tsx 传入） */
  header: React.ReactNode;
  /** 页面主体内容 */
  children: React.ReactNode;
}

/**
 * ApplyLayout
 * 仅负责页面结构与样式（Header / Content）
 * ❌ 不包含任何业务逻辑
 */
const ApplyLayout: React.FC<ApplyLayoutProps> = ({ header, children }) => {
  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      {/* 顶部 Header */}
      <div
        style={{
          background: "#fff",
          padding: "0 24px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            height: 64,
            display: "flex",
            alignItems: "center",
          }}
        >
          <Title level={4} style={{ margin: 0 }}>
            CampusFlow · 学院服务台
          </Title>
        </div>
      </div>

      {/* 页面内容区 */}
      <Content
        style={{
          maxWidth: 1200,
          margin: "24px auto",
          width: "100%",
          padding: "0 24px",
        }}
      >
        {/* 页面标题 / 描述 */}
        <div style={{ marginBottom: 24 }}>{header}</div>

        {/* 页面主体 */}
        {children}
      </Content>
    </Layout>
  );
};

export default ApplyLayout;
