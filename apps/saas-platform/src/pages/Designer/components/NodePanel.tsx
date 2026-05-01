import React from "react";
import { Card, Typography, Space } from "antd";

const { Title, Text } = Typography;

const NODE_TYPES = [
  {
    type: "start",
    label: "开始节点",
    description: "流程起点",
  },
  {
    type: "approval",
    label: "审批节点",
    description: "常规审批、人事/财务审批等",
  },
  {
    type: "gateway",
    label: "条件网关",
    description: "根据条件进行流程分支（XOR）",
  },
  {
    type: "end",
    label: "结束节点",
    description: "流程结束节点",
  },
];

const NodePanel: React.FC = () => {
  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      <Card title="节点面板" variant="borderless" style={{ height: "100%" }}>
        <Space orientation="vertical" style={{ width: "100%" }} size="middle">
          {NODE_TYPES.map((node) => (
            <Card
              key={node.type}
              size="small"
              hoverable
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("node-type", node.type);
              }}
              style={{ cursor: "grab" }}
            >
              <Title level={5} style={{ marginBottom: 4 }}>
                {node.label}
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {node.description}
              </Text>
            </Card>
          ))}
        </Space>
      </Card>
    </div>
  );
};

export default NodePanel;
