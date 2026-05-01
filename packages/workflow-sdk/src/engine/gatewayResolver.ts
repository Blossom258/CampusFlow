import type { EngineFlowDefinition, FormContext } from "../types";
import { evaluateCondition } from "./conditionEvaluator";

export function resolveNextNodeId(
  def: EngineFlowDefinition,
  fromNodeId: string,
  context: FormContext
): string | null {
  const outgoing = def.edges.filter(e => e.from.nodeId === fromNodeId);

  if (outgoing.length === 0) {
    console.warn(
      "[gatewayResolver] No outgoing edges for node",
      fromNodeId
    );
    return null;
  }

  // ✅ 非 gateway 情况（start / approval / end 前）
  if (outgoing.length === 1 && !outgoing[0].condition) {
    return outgoing[0].to.nodeId;
  }

  // ✅ gateway 情况：按条件匹配
  for (const edge of outgoing) {
    if (edge.condition) {
      const ok = evaluateCondition(edge.condition, context);
      if (ok) {
        return edge.to.nodeId;
      }
    }
  }

  // ✅ fallback default
  const defaultEdge = outgoing.find(e => e.isDefault);
  if (defaultEdge) {
    return defaultEdge.to.nodeId;
  }

  console.warn(
    "[gatewayResolver] No outgoing edge matched for node",
    fromNodeId,
    { outgoing, context }
  );
  return null;
}