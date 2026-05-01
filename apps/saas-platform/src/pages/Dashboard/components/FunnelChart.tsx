import React from "react";
import ReactECharts from "echarts-for-react";
import { Card, Typography, Empty } from "antd";

const { Text } = Typography;

export interface FunnelChartItem {
  name: string;
  value: number;
}

interface FunnelChartProps {
  total: number;
  data: FunnelChartItem[];
}

/**
 * FunnelChart
 *
 * - 纯展示组件（无 store / 无 hook）
 * - 只接收 total + data
 * - Dashboard / 报表页面可复用
 */
const FunnelChart: React.FC<FunnelChartProps> = ({ total, data }) => {
  const option = {
    tooltip: {
      trigger: "item",
      formatter: "{b} : {c}",
    },
    color: ["#5470c6", "#91cc75", "#fac858"],
    series: [
      {
        type: "funnel",
        left: "10%",
        top: 20,
        bottom: 20,
        width: "70%",
        min: 0,
        max: total || 100,
        sort: "descending",
        gap: 4,
        label: {
          show: true,
          position: "right",
          formatter: "{b}: {c}",
        },
        itemStyle: {
          borderColor: "#fff",
          borderWidth: 1,
        },
        data,
      },
    ],
  };

  return (
    <Card
      variant="outlined"
      title="审批转化漏斗"
      extra={<Text type="secondary">流程从发起到完成</Text>}
      style={{ height: 520 }}
    >
      {total > 0 ? (
        <ReactECharts option={option} style={{ height: 420 }} />
      ) : (
        <Empty description="暂无数据" style={{ marginTop: 120 }} />
      )}
    </Card>
  );
};

export default FunnelChart;