import { MODULE_KEYS, type ModuleKey } from '@/utils/permissions';

export type FinanceTab = 'quotations' | 'fee-structure';

/** The Finance page's tabs, each behind its own permission sub-module. */
export const FINANCE_TABS: { id: FinanceTab; label: string; module: ModuleKey }[] = [
  { id: 'quotations', label: 'Quotations', module: MODULE_KEYS.financeQuotations },
  { id: 'fee-structure', label: 'Fee structure', module: MODULE_KEYS.financeFeeStructure },
];

/** Quotation pages live under the Finance module's path, e.g. /finance/quotations/new. */
export const quotationsPath = (financePath: string) => `${financePath}/quotations`;
