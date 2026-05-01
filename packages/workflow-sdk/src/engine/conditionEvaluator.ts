import type { ConditionExpr, FormContext } from "../types/engine";

/**
 * 从表单上下文中读取条件左值
 * 新标准：amount | days
 * 兼容旧数据：form.amount
 */
function getValue(left: string, ctx: FormContext): unknown {
  const form = ctx.form as Record<string, unknown>;

  // ✅ 新模型优先：amount / days
  if (left in form) {
    return form[left];
  }

  // 🟡 兼容旧模型：form.amount
  if (left.startsWith("form.")) {
    const key = left.slice("form.".length);
    return form[key];
  }

  return undefined;
}

/**
 * 条件表达式求值（用于条件网关）
 */
export function evaluateCondition(
  expr: ConditionExpr,
  ctx: FormContext
): boolean {
  const leftValue = getValue(expr.left, ctx);
  const rightValue = expr.right;

  // 防御：左值不存在，条件直接不成立
  if (leftValue === undefined) {
    console.warn("[conditionEvaluator] left value not found", expr, ctx);
    return false;
  }

  switch (expr.op) {
    case "gt":
      return Number(leftValue) > Number(rightValue);
    case "gte":
      return Number(leftValue) >= Number(rightValue);
    case "lt":
      return Number(leftValue) < Number(rightValue);
    case "lte":
      return Number(leftValue) <= Number(rightValue);
    case "eq":
      return leftValue === rightValue;
    case "neq":
      return leftValue !== rightValue;
    default:
      console.warn("[conditionEvaluator] unknown op", expr.op);
      return false;
  }
}