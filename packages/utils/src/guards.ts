import type { ConditionExpr } from './types/flow';
import type { FormValue } from './types/process';
export class ApprovalGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApprovalGuardError';
  }
}

export function assertTaskAtCurrentNode(params: { taskNodeId: string; currentNodeId: string | null }): void {
  const { taskNodeId, currentNodeId } = params;
  if (!currentNodeId || currentNodeId !== taskNodeId) {
    throw new ApprovalGuardError('流程未到该节点，禁止抢跑审批');
  }
}

/**
 * 通用取值函数，支持路径如 form.amount、form.days
 */
function getValue(path: string, form: Record<string, FormValue>): FormValue | null {
  const parts = path.split('.');
  let value: unknown = { form };

  for (const part of parts) {
    if (typeof value === 'object' && value !== null && part in value) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return null;
    }
  }

  return value as FormValue;
}

/**
 * 条件表达式求值（用于 XOR 网关）
 */
export function evaluateCondition(
  condition: ConditionExpr | undefined,
  context: { form: Record<string, FormValue> }
): boolean {
  if (!condition) return true;

  const { left, op, right } = condition;
  const leftValue = getValue(left, context.form);

  if (leftValue == null) return false;

  const leftNum = Number(leftValue);
  const rightNum = Number(right);

  switch (op) {
    case 'eq':
      return leftValue === right;
    case 'gt':
      return leftNum > rightNum;
    case 'gte':
      return leftNum >= rightNum;
    case 'lt':
      return leftNum < rightNum;
    case 'lte':
      return leftNum <= rightNum;
    default:
      return false;
  }
}
