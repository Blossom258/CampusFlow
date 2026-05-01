import type { ProcessDefinition } from "./types/flow";

export type ValidateResult = {
  success: boolean;
  error?: string;
};

function isValidConditionLeft(left: string): boolean {
  // 必须以 form. 开头
  if (!left.startsWith("form.")) return false;

  const field = left.slice("form.".length);

  // 当前允许的条件字段
  return field === "amount" || field === "days";
}

export function validateFlow(def: ProcessDefinition): ValidateResult {
  const { nodes, edges } = def;

  /* ---------- 1. start / end 校验 ---------- */
  const startNodes = nodes.filter(n => n.type === "start");
  const endNodes = nodes.filter(n => n.type === "end");

  if (startNodes.length !== 1) {
    return { success: false, error: "流程必须且只能有一个开始节点" };
  }

  if (endNodes.length < 1) {
    return { success: false, error: "流程必须至少有一个结束节点" };
  }

  /* ---------- 2. 断线节点校验 ---------- */
  for (const node of nodes) {
    const inEdges = edges.filter(e => e.to.nodeId === node.id);
    const outEdges = edges.filter(e => e.from.nodeId === node.id);

    if (node.type !== "start" && inEdges.length === 0) {
      return { success: false, error: `节点「${node.name}」没有入线` };
    }

    if (node.type !== "end" && outEdges.length === 0) {
      return { success: false, error: `节点「${node.name}」没有出线` };
    }
  }

  /* ---------- 3. Gateway（XOR）校验 ---------- */
  const gateways = nodes.filter(n => n.type === "gateway");

  for (const gateway of gateways) {
    const outEdges = edges.filter(e => e.from.nodeId === gateway.id);

    // 3.1 至少两条出边
    if (outEdges.length < 2) {
      return {
        success: false,
        error: `条件网关「${gateway.name}」至少需要两条出线`,
      };
    }

    // 3.2 必须且只能有一条 default
    const defaultEdges = outEdges.filter(e => e.isDefault);
    if (defaultEdges.length !== 1) {
      return {
        success: false,
        error: `条件网关「${gateway.name}」必须且只能有一条默认路径`,
      };
    }

    // 3.3 条件合法性
    for (const edge of outEdges) {
      if (edge.isDefault) {
        if (edge.condition) {
          return {
            success: false,
            error: `默认路径不能配置条件（网关：${gateway.name}）`,
          };
        }
      } else {
        if (!edge.condition) {
          return {
            success: false,
            error: `非默认路径必须配置条件（网关：${gateway.name}）`,
          };
        }

        if (!isValidConditionLeft(edge.condition.left)) {
          return {
            success: false,
            error: `条件左值必须以 form. 开头（网关：${gateway.name}）`,
          };
        }
      }
    }
  }

  return { success: true };
}