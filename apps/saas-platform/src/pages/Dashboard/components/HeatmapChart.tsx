import React from "react";
import ReactECharts from "echarts-for-react";
import { Card, Typography, Empty } from "antd";

const { Text } = Typography;

export type HeatmapPoint = [number, number, number];

interface HeatmapChartProps {
  total: number;
  data: HeatmapPoint[];
}

/**
 * HeatmapChart
 *
 * - 纯展示组件（无 store / 无 hook）
 * - 仅根据 props 渲染热力图
 * - 可复用于 Dashboard / 报表分析页面
 */
const HeatmapChart: React.FC<HeatmapChartProps> = ({ total, data }) => {
  const hours = [
    "12a","1a","2a","3a","4a","5a","6a","7a",
    "8a","9a","10a","11a","12p","1p","2p","3p",
    "4p","5p","6p","7p","8p","9p","10p","11p",
  ];
  const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

  const option = {
    tooltip: { position: "top" },
    grid: { height: "55%", top: "15%" },
    xAxis: {
      type: "category",
      data: hours,
      splitArea: { show: true },
    },
    yAxis: {
      type: "category",
      data: days,
      splitArea: { show: true },
    },
    visualMap: {
      min: 0,
      max: 5,
      calculable: true,
      orient: "horizontal",
      left: "center",
      bottom: "10%",
    },
    series: [
      {
        type: "heatmap",
        data,
        label: { show: true },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: "rgba(0,0,0,0.4)",
          },
        },
      },
    ],
  };

  return (
    <Card
      variant="outlined"
      title="申请提交时间分布"
      extra={<Text type="secondary">按星期 & 小时</Text>}
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

export default HeatmapChart;
