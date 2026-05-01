import type {
  EngineFlowDefinition,
  FormContext,
  ApprovalPathNode,
  EngineFlowNode,
} from "../types/engine";
import { resolveNextNodeId } from "./gatewayResolver";

type ApprovalConfig = {
  approverRoles?: string[];
  approvalMode?: string;
};

function getNodeName(node: EngineFlowNode): string | undefined {
  return (node as EngineFlowNode & { name?: string }).name;
}

function getApprovalConfig(node: EngineFlowNode): ApprovalConfig | undefined {
  if (typeof node.config === "object" && node.config !== null) {
    return node.config as ApprovalConfig;
  }
  return undefined;
}

const ROLE_LABEL_MAP: Record<string, string> = {
  hr: "HR",
  manager: "经理",
};

/**
 * 判断是否为审批节点
 */
function isApprovalNode(node: EngineFlowNode): boolean {
  return node.type === "approval";
}

function extractApprovalLabel(node: EngineFlowNode): string {

  // 1️⃣ 显式 label（极少情况）
  if (typeof node.label === "string" && node.label.trim()) {
    return node.label;
  }

  // 2️⃣ 审批配置优先（会签 / 或签）
  const cfg = getApprovalConfig(node);
  if (cfg && Array.isArray(cfg.approverRoles) && cfg.approverRoles.length > 0) {
    const roleLabels = cfg.approverRoles.map((r) => ROLE_LABEL_MAP[r] ?? r);
    const mode = cfg.approvalMode?.toUpperCase();

    if (mode === "MATCH_ALL") {
      const label = `${roleLabels.join(" + ")}（会签）`;
      return label;
    }

    if (mode === "MATCH_ANY") {
      const label = `${roleLabels.join(" / ")}（或签）`;
      return label;
    }

    const label = roleLabels.join(" / ");
    return label;
  }

  // 3️⃣ name（最后兜底）
  const name = getNodeName(node);
  if (typeof name === "string" && name.trim()) {
    return name;
  }

  // 4️⃣ 最终兜底
  return "审批节点";
}

/**
 * 根据流程定义 + 表单上下文，计算「本次实际会走的审批路径」
 * - 从 start 节点开始
 * - 遇到 gateway 由 gatewayResolver 决定下一跳
 * - 只收集 approval 节点
 * - 遇到 end 结束
 */
export function buildApprovalPath(
  def: EngineFlowDefinition,
  context: FormContext
): ApprovalPathNode[] {
  const startNode = def.nodes.find((n) => n.type === "start");
  if (!startNode) return [];

  const visited = new Set<string>();
  const result: ApprovalPathNode[] = [];

  let cursor: string | null = startNode.id;
  let guard = 0;

  while (cursor && guard < 200) {
    guard++;

    // 防止死循环
    if (visited.has(cursor)) break;
    visited.add(cursor);

    const node = def.nodes.find((n) => n.id === cursor);
    if (!node) break;

    // 只收集审批节点
    if (isApprovalNode(node)) {
      // 🔍 审批节点原始数据（调试用，确认审批人信息存在哪）
      const label = extractApprovalLabel(node);

      result.push({
        id: node.id,
        label,
      });
    }

    // 结束节点直接终止
    if (node.type === "end") break;

    // 计算下一节点（普通节点 / 网关）
    const next = resolveNextNodeId(def, cursor, context);
    cursor = next;
  }

  return result;
}
