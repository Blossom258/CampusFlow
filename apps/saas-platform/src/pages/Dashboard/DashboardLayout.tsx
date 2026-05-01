import React from "react";
import { Card } from "antd";

interface DashboardLayoutProps {
  header: React.ReactNode;
  kpi: React.ReactNode;
  charts: React.ReactNode;
}

/**
 * DashboardLayout
 *
 * 纯布局组件：
 * - 统一页面背景 / padding
 * - 规范 Header / KPI / Charts 区块结构
 *
 * ❌ 不包含任何业务逻辑
 * ❌ 不依赖 store / hook
 */
const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  header,
  kpi,
  charts,
}) => {
  return (
    <div
      style={{
        padding: 24,
        background: "#f5f7fa",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <Card variant="outlined" style={{ marginBottom: 24 }}>
        {header}
      </Card>

      {/* KPI Section */}
      <div style={{ marginBottom: 24 }}>{kpi}</div>

      {/* Charts Section */}
      {charts}
    </div>
  );
};

export default DashboardLayout;
