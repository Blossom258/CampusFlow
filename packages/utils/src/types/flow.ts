/** 条件字段（用于条件表达式 left） */
export type ConditionField = 'amount' | 'days';

/** 条件表达式（用于条件网关出边） */
export type ConditionExpr = {
  op: 'eq' | 'gt' | 'gte' | 'lt' | 'lte';
  left: ConditionField; // amount | days
  right: string | number;
};

/** 流程定义快照（支持版本冻结） */
export type ProcessDefinition = {
  /** 具体版本的唯一 id */
  id: string;

  /** 流程名称 */
  name: string;

  /** ⭐ 流程逻辑标识（同一业务流程的系列版本）
   * 旧数据可能不存在，允许缺省
   */
  definitionKey?: string;

  /** ⭐ 版本号：1,2,3…
   * 旧数据可能不存在，允许缺省
   */
  version?: number;

  /** ⭐ 草稿 / 已发布
   * 旧数据默认为 draft
   */
  status?: ProcessStatus;

  /** ⭐ 发布时间（仅 published 时存在） */
  publishedAt?: number;

  /** 原有结构，保持不变 */
  nodes: FlowNode[];
  edges: FlowEdge[];
};

/** 审批模式：MATCH_ALL (会签), MATCH_ANY (或签) */
export type ApprovalMode = 'MATCH_ALL' | 'MATCH_ANY'; // 

/** 流程发布状态 */
export type ProcessStatus = "draft" | "published";

/** 锚点类型 */
export type AnchorType = "top" | "right" | "bottom" | "left"; // 

/** 节点配置信息 */
export type NodeConfig = {
  approverRole?: string; // 
  // --- Phase 1 核心字段 ---
  approverRoles?: string[];
  approvalMode: ApprovalMode;   
};

/** 流程节点定义 */
export type FlowNode = {
  id: string;  
  type: 'start' | 'approval' | 'gateway' | 'end';  
  name: string; 
  position: { x: number; y: number }; 
  config: NodeConfig; // 将 config 设为必选，方便逻辑处理 
};

/** 流程连线定义 */
export type FlowEdge = {
  id: string; 
  from: { nodeId: string; anchor: AnchorType }; 
  to: { nodeId: string; anchor: AnchorType }; 
  /** 条件表达式（仅 gateway 出边使用） */
  condition?: ConditionExpr;
  /** 是否为默认路径（XOR 网关兜底） */
  isDefault?: boolean;
};



// =======================================================
// UI 创建节点时使用的输入类型（不要求 config）
// =======================================================
export type CreateFlowNode = Omit<FlowNode, "config"> & {
  config?: Partial<FlowNode["config"]>;
};