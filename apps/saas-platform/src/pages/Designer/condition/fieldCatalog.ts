// src/pages/Designer/condition/fieldCatalog.ts
import type { ConditionField } from '../../../types/flow';

export type FieldOption = {
  label: string;              // 给人看的
  path: ConditionField;       // 给条件表达式用：amount | days
  type: 'number';             // 当前只支持数值型条件
};

export const FIELD_CATALOG: FieldOption[] = [
  { label: '金额', path: 'form.amount', type: 'number' },
  { label: '天数', path: 'form.days', type: 'number' },
];