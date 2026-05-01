/**
 * 流程系统 - 核心类型定义
 * ⚠️ 只放类型，不写任何业务逻辑
 */

/**
 * 表单字段允许的基础类型
 * 运行态条件判断只需要可比较的值
 */
export type FormValue = string | number | boolean | null;

/**
 * 系统内角色类型
 * hr / finance 是审批角色
 * admin / user 用于系统权限（预留）
 */
export type Role =
  | 'user'
  | 'admin'
  | 'manager'
  | 'hr'
  | 'finance'
  | 'student'
  | 'tutor'
  | 'academic_office';

/**
 * 流程节点类型
 */
export type NodeType = 'start' | 'approval' | 'gateway' | 'end';

/**
 * 流程节点（定义态）
 * 用于流程设计器 & 流程模板
 */
export interface ProcessNode {
  /** 节点唯一 ID */
  id: string;

  /** 节点类型 */
  type: NodeType;

  /** 节点名称（如：HR 审批、财务审批） */
  name: string;

  /**
   * 审批人角色
   * 仅 approval 节点需要
   */
  assigneeRole?: Role;

  /**
   * 下一个节点 ID
   * MVP 阶段先支持“单一下一节点（串行流程）”
   */
  nextId?: string;
}

/**
 * 流程定义（模板）
 * 对应「流程设计器」保存的结果
 */
export interface ProcessDefinition {
  /** 流程模板 ID */
  id: string;

  /** 流程名称 */
  name: string;

  /** 流程节点列表 */
  nodes: ProcessNode[];

  /** 起始节点 ID */
  startNodeId: string;
}

/**
 * 流程实例（运行态）
 * 每一次真实提交都会生成一个实例
 */
export interface ProcessInstance {
  currentApprovalLabel?: string;

  /** 会签/串行：当前仍需审批的角色列表 */
  pendingApproverRoles?: string[];
  /** 实例 ID */
  instanceId: string;

  /** 展示用标题 */
  title: string;

  /** 具体流程定义版本的 ID */
  processDefinitionId: string;

  /** ⭐ 流程逻辑标识（同一流程系列） */
  definitionKey: string;

  /** ⭐ 实例绑定的流程版本号 */
  definitionVersion: number;

  /** 当前节点 */
  currentNodeId: string | null;

  /** 实例状态 */
  status: 'running' | 'approved' | 'rejected';

  /** 会签记录 */
  approvalRecords: {
    [nodeId: string]: {
      mode: 'MATCH_ANY' | 'MATCH_ALL';
      taskIds: string[];
      approvedTaskIds: string[];
      rejectedTaskIds: string[];
    };
  };

  /** 冻结的流程定义快照 */
  definitionSnapshot: import('./flow').ProcessDefinition | null;

  /** 发起人角色 */
  createdBy: import('./process').Role;

  /** 创建时间 */
  createdAt: number;

  /** 原始表单数据（可选） */
  formData?: Record<string, unknown>;

  /** 运行时上下文（给条件网关用） */
  context?: {
    form: Record<string, FormValue>;
  };

  /** 审批日志 */
  logs: {
    date: number;
    action: 'submit' | 'approve' | 'reject' | 'delegate';
    operator: string;
    comment?: string;
  }[];
}

/**
 * 审批任务（待办）
 * 审批中心展示的最小单元
 */
export interface Task {
  /** 任务 ID */
  id: string;

  /** 所属流程实例 ID */
  instanceId: string;

  /** 所属节点 ID */
  nodeId: string;

  /** 当前任务的审批角色 */
  assigneeRole: Role;

  /** 任务状态 */
  status: 'pending' | 'approved' | 'rejected' | "cancelled";

  /** 创建时间 */
  createdAt?: string;
}
