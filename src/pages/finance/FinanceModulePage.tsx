import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import type { ApiModule } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { AccessDenied } from '@/components/StatusPage';
import { toSlug } from '@/utils/modules';
import { MODULE_KEYS } from '@/utils/permissions';
import { ButtonLink, PageHeader, Tabs } from '@/ui';
import { FINANCE_TABS, quotationsPath, type FinanceTab } from './financeTabs';
import QuotationsTab from './QuotationsTab';
import FeeStructureTab from './FeeStructureTab';

const DESCRIPTIONS: Record<FinanceTab, string> = {
  quotations: 'Quotations sent to clients for requests and jobs, with every revision kept.',
  'fee-structure': 'Standard survey fees and additional charges. New quotation lines start from these values.',
};

/** Finance module: Quotations and Fee structure tabs (?tab=), each shown only with read access. */
export default function FinanceModulePage({ currentModule }: { currentModule: ApiModule }) {
  const { can } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const basePath = `/${toSlug(currentModule.name)}`;

  const visibleTabs = FINANCE_TABS.filter(t => can(t.module));
  if (visibleTabs.length === 0) return <AccessDenied />;

  const tabParam = searchParams.get('tab');
  const activeTab: FinanceTab = visibleTabs.some(t => t.id === tabParam) ? (tabParam as FinanceTab) : visibleTabs[0].id;

  const createButton = activeTab === 'quotations' && can(MODULE_KEYS.financeQuotations, 'create') && (
    <ButtonLink to={`${quotationsPath(basePath)}/new`} variant="primary" icon={<Plus />}>New quotation</ButtonLink>
  );

  return (
    <div className="animate-in">
      <PageHeader
        breadcrumbs={[{ label: currentModule.name }]}
        title={currentModule.name}
        description={DESCRIPTIONS[activeTab]}
        actions={createButton}
      />

      {visibleTabs.length > 1 && (
        <Tabs
          label="Finance sections"
          value={activeTab}
          onValueChange={tab => setSearchParams({ tab }, { replace: true })}
          items={visibleTabs.map(t => ({ value: t.id, label: t.label }))}
        />
      )}

      {activeTab === 'quotations' ? (
        <QuotationsTab basePath={basePath} createButton={createButton || undefined} />
      ) : (
        <FeeStructureTab />
      )}
    </div>
  );
}
