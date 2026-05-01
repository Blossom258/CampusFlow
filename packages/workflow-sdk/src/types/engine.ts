export type NodeType = "start" | "approval" | "gateway" | "end";

export interface EngineFlowNode {
  id: string;
  type: NodeType;
  label?: string; // ✅ 统一用 label，不用 name
  config?: unknown;
}

export interface ConditionExpr {
  left: string;
  op: "gt" | "gte" | "lt" | "lte" | "eq" | "neq";
  right: unknown;
}

export interface EngineFlowEdge {
  from: { nodeId: string };
  to: { nodeId: string };
  condition?: ConditionExpr;
  isDefault?: boolean;
}

export interface EngineFlowDefinition {
  nodes: EngineFlowNode[];
  edges: EngineFlowEdge[];
}

export interface FormContext {
  form: Record<string, unknown>;
}

export interface ApprovalPathNode {
  id: string;
  label: string;
}