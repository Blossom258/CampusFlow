import type { EngineFlowDefinition } from "../types";

/**
 * 从流程对象中安全地提取 EngineFlowDefinition
 * 支持：
 * - definitionSnapshot（运行态快照）
 * - 直接 nodes + edges（兼容旧结构）
 */
export function getDefinitionSnapshot(
  flow: unknown
): EngineFlowDefinition | null {
  if (!flow || typeof flow !== "object") return null;

  // ✅ 优先使用运行态快照（避免 any）
  if (
    "definitionSnapshot" in flow &&
    (flow as { definitionSnapshot?: unknown }).definitionSnapshot
  ) {
    return (flow as { definitionSnapshot: EngineFlowDefinition })
      .definitionSnapshot;
  }

  // ✅ 兼容直接 definition（旧结构）
  if ("nodes" in flow && "edges" in flow) {
    return flow as EngineFlowDefinition;
  }

  return null;
}