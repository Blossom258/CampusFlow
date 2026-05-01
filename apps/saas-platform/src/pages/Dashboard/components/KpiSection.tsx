import React from "react";
import { Row, Col } from "antd";
import {
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
} from "@ant-design/icons";

import KpiCard from "./KpiCard";

export interface KpiData {
  total: number;
  running: number;
  approved: number;
  avgDuration: string | number;
}

/**
 * KpiSection
 *
 * - KPI 区块级组件
 * - 负责 KPI 的布局与组合
 * - 不包含任何业务计算
 */
const KpiSection: React.FC<{ kpi: KpiData }> = ({ kpi }) => {
  return (
    <Row gutter={16}>
      <Col span={6}>
        <KpiCard
          title="总申请数"
          value={kpi.total}
          prefix={<BarChartOutlined />}
          color="#262626"
        />
      </Col>

      <Col span={6}>
        <KpiCard
          title="审批中"
          value={kpi.running}
          prefix={<ClockCircleOutlined />}
          color="#1677ff"
        />
      </Col>

      <Col span={6}>
        <KpiCard
          title="通过率"
          value={`${
            kpi.total ? ((kpi.approved / kpi.total) * 100).toFixed(1) : 0
          }%`}
          prefix={<CheckCircleOutlined />}
          color="#52c41a"
        />
      </Col>

      <Col span={6}>
        <KpiCard
          title="平均耗时（分）"
          value={kpi.avgDuration}
          prefix={<StopOutlined />}
          color="#fa541c"
        />
      </Col>
    </Row>
  );
};

export default KpiSection;