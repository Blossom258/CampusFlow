import React from "react";
import { Card, Typography } from "antd";

const { Text } = Typography;

export interface KpiCardProps {
  title: string;
  value: string | number;
  prefix: React.ReactNode;
  color: string;
}

/**
 * KpiCard
 *
 * - 原子级 KPI 展示组件
 * - 仅负责 UI 展示
 * - 不包含任何业务逻辑
 */
const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  prefix,
  color,
}) => {
  return (
    <Card variant="outlined">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 22, color }}>{prefix}</span>
        <div>
          <Text type="secondary">{title}</Text>
          <div
            style={{
              fontSize: 26,
              fontWeight: 600,
              color,
            }}
          >
            {value}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default KpiCard;