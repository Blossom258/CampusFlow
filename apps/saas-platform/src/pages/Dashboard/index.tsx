import React from "react";
import { Col, Row, Typography } from "antd";

import DashboardLayout from "./DashboardLayout";
import { useDashboard } from "./useDashboard";

import KpiSection from "./components/KpiSection";
import FunnelChart from "./components/FunnelChart";
import HeatmapChart from "./components/HeatmapChart";

const { Title, Text } = Typography;

/**
 * Dashboard Page
 *
 * - 页面拼装层（不含业务逻辑）
 * - 所有数据来自 useDashboard
 * - UI 由 Layout + Components 组合完成
 */
const Dashboard: React.FC = () => {
  const { kpi, funnelData, heatmapData } = useDashboard();

  return (
    <DashboardLayout
      header={
        <>
          <Title level={4} style={{ marginBottom: 0 }}>
            数据可视化看板
          </Title>
          <Text type="secondary">基于流程实例的实时业务分析</Text>
        </>
      }
      kpi={<KpiSection kpi={kpi} />}
      charts={
        <Row gutter={24}>
          <Col span={10}>
            <FunnelChart total={kpi.total} data={funnelData} />
          </Col>
          <Col span={14}>
            <HeatmapChart total={kpi.total} data={heatmapData} />
          </Col>
        </Row>
      }
    />
  );
};

export default Dashboard;
