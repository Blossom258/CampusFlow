import React, { useState } from 'react';
import { Card, Input, InputNumber, Select, Radio, Space, Divider, Switch } from 'antd';
import { useFlowStore } from '../../../store/flowStore';
import { FIELD_CATALOG } from "../condition/fieldCatalog";
//import type { ApprovalMode } from '../../../types/flow';

// ⭐ 核心修复：角色 Value 统一全小写，确保全链路匹配 
const ROLES = [
  { value: 'admin', label: '管理员 (Admin)' },
  { value: 'manager', label: '部门经理 (Manager)' },
  { value: 'hr', label: '人事专员 (HR)' },
  { value: 'finance', label: '财务专员 (Finance)' },
];

const PropertiesPanel: React.FC = () => {
  const {
    nodes,
    edges,
    selectedNodeId,
    selectedEdgeId,
    updateNode,
    setEdgeCondition,
    setDefaultEdge,
    processName,
    setProcessName,
  } = useFlowStore();

  const [advanced, setAdvanced] = useState(false);

  const node = nodes.find((n) => n.id === selectedNodeId);
  const edge = edges.find((e) => e.id === selectedEdgeId);

  return (
    <Card
      title="属性配置"
      size="small"
      style={{ height: "100%" }}
      bodyStyle={{ padding: 16, overflow: "auto" }}
    >
      {/* ① 既没有选中 node，也没有选中 edge → 全局配置 */}
      {!node && !edge && (
        <>
          <h4 style={{ marginBottom: 16 }}>
            全局配置
          </h4>
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>流程名称：</div>
            <Input
              value={processName}
              onChange={(e) => setProcessName(e.target.value)}
              showCount
              maxLength={20}
              placeholder="例如：请假审批流"
            />
          </div>
        </>
      )}

      {/* ② 选中的是 Edge（且没有选中 Node）→ Edge 条件配置 */}
      {!node && edge && (
        <>
          <h4 style={{ marginBottom: 16 }}>
            连线条件
          </h4>
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            {/* 条件配置 */}
            <div>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>条件表达式</div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                <Switch
                  checked={advanced}
                  onChange={setAdvanced}
                  checkedChildren="高级"
                  unCheckedChildren="简单"
                />
              </div>
              <Space direction="vertical" style={{ width: "100%" }} size="small">
                <div>
                  <div style={{ marginBottom: 4, fontWeight: 500 }}>字段</div>
                  {advanced ? (
                    <Input
                      style={{ width: "100%" }}
                      disabled
                      placeholder="高级模式已禁用字段手输"
                      value={edge.condition?.left ?? ''}
                    />
                  ) : (
                    <Select
                      style={{ width: "100%" }}
                      placeholder="选择字段（如：金额 / 天数）"
                      options={FIELD_CATALOG.map((f) => ({
                        label: f.label,
                        value: f.path,
                      }))}
                      value={edge.condition?.left}
                      onChange={(v) =>
                        setEdgeCondition(edge.id, {
                          op: edge.condition?.op ?? "eq",
                          left: v,
                          right: edge.condition?.right ?? 0,
                        })
                      }
                    />
                  )}
                </div>
                <div>
                  <div style={{ marginBottom: 4, fontWeight: 500 }}>操作符</div>
                  <Select
                    value={edge.condition?.op ?? "eq"}
                    style={{ width: 90 }}
                    options={[
                      { label: "=", value: "eq" },
                      { label: ">", value: "gt" },
                      { label: ">=", value: "gte" },
                      { label: "<", value: "lt" },
                      { label: "<=", value: "lte" },
                    ]}
                    onChange={(op) =>
                      setEdgeCondition(edge.id, {
                        op,
                        left: edge.condition?.left ?? "form.amount",
                        right: edge.condition?.right ?? 0,
                      })
                    }
                  />
                </div>
                <div>
                  <div style={{ marginBottom: 4, fontWeight: 500 }}>右值</div>
                  {(() => {
                    const fieldMeta = FIELD_CATALOG.find(
                      (f) => f.path === edge.condition?.left
                    );
                    const fieldType = fieldMeta?.type ?? "number";
                    if (fieldType === "number") {
                      return (
                        <InputNumber
                          style={{ width: "100%" }}
                          placeholder="请输入数字"
                          value={
                            typeof edge.condition?.right === "number"
                              ? edge.condition.right
                              : undefined
                          }
                          onChange={(v) => {
                            // antd InputNumber returns number | null; when cleared we remove the condition
                            if (typeof v !== "number") {
                              setEdgeCondition(edge.id, null);
                              return;
                            }
                            if (!edge.condition) return;

                            setEdgeCondition(edge.id, {
                              op: edge.condition.op,
                              left: edge.condition.left,
                              right: v,
                            });
                          }}
                        />
                      );
                    }
                    return (
                      <Input
                        placeholder="右值"
                        value={String(edge.condition?.right ?? "")}
                        onChange={(e) => {
                          if (!edge.condition) return;

                          setEdgeCondition(edge.id, {
                            op: edge.condition.op,
                            left: edge.condition.left,
                            right: e.target.value,
                          });
                        }}
                      />
                    );
                  })()}
                </div>
              </Space>
            </div>

            <Divider />

            {/* 默认路径 */}
            <div>
              <Radio
                checked={edge.isDefault}
                onChange={() => setDefaultEdge(edge.from.nodeId, edge.id)}
              >
                设为默认路径（条件不满足时走这里）
              </Radio>
            </div>
          </Space>
        </>
      )}

      {/* ③ 走到这里表示要渲染节点属性，但为了让 TS 明确 node 一定存在，做一次兜底 */}
      {node && (
        <>
          <h4 style={{ marginBottom: 16 }}>
            节点属性
          </h4>
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>节点名称：</div>
            <Input 
              value={node.name} 
              onChange={(e) => updateNode(node.id, { name: e.target.value })} 
            />
          </div>

          {node.type === 'approval' && (
            <>
              <Divider />

              {/* 审批模式 */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, fontWeight: 500, color: '#1677ff' }}>
                  ⚖️ 审批逻辑
                </div>
                <Radio.Group
                  value={node.config?.approvalMode || 'MATCH_ANY'}
                  onChange={(e) =>
                    updateNode(node.id, {
                      config: {
                        ...node.config,
                        approvalMode: e.target.value,
                      },
                    })
                  }
                >
                  <Space direction="vertical">
                    <Radio value="MATCH_ANY">
                      <b>或签</b>（任意一人通过即可）
                    </Radio>
                    <Radio value="MATCH_ALL">
                      <b>会签</b>（所有人通过才可继续）
                    </Radio>
                  </Space>
                </Radio.Group>
              </div>

              {/* 审批角色（多选） */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, fontWeight: 500, color: '#1677ff' }}>
                  👤 审批角色
                </div>
                <Select
                  mode="multiple"
                  style={{ width: '100%' }}
                  placeholder="请选择审批角色（可多选）"
                  options={ROLES}
                  value={
                    node?.config?.approverRoles ??
                    (node?.config?.approverRole ? [node.config.approverRole] : [])
                  }
                  onChange={(values) =>
                    updateNode(node.id, {
                      config: {
                        ...node.config,
                        approverRoles: values,
                      },
                    })
                  }
                />
              </div>
            </>
          )}
        </>
      )}
    </Card>
  );
};

export default PropertiesPanel;
