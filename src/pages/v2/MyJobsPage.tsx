import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Briefcase } from 'lucide-react';
import { DataTable, PageHeader, SearchInput, Tabs, Toolbar, type Column } from '@/ui';
import Pagination from '@/components/Pagination';
import { useAuth } from '@/context/AuthContext';
import { MODULE_KEYS } from '@/utils/permissions';
import { jobsService } from '@/api';
import type { ApiJob, PaginationMeta } from '@/api';
import { MAIN_SURVEY_TYPE_LABELS, MAIN_TYPES_BY_SECTOR, isSurveyorRoleName, type MainSurveyType, type Sector } from '@/config/surveyCategories';
import { formatDate } from '@/utils/date';
import { JobStatusBadge, personName } from './shared';
import s from './v2.module.css';

/** One sector's jobs (My Jobs → Marine or Industrial; each sector is its own permission-gated module). */
export default function MyJobsPage({ basePath, sector, sectorLabel }: { basePath: string; sector: Sector; sectorLabel: string }) {
  const navigate = useNavigate();
  const { can, user } = useAuth();
  const seesAll = !isSurveyorRoleName(user?.role?.roleName) || can(MODULE_KEYS.jobs, 'view-all');
  const [params, setParams] = useSearchParams();
  const types = MAIN_TYPES_BY_SECTOR[sector];
  const mainType = (types.includes(params.get('type') as MainSurveyType) ? params.get('type') : types[0]) as MainSurveyType;

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [meta, setMeta] = useState<PaginationMeta & { total: number }>({ page: 1, limit: 25, totalPages: 1, hasNextPage: false, hasPrevPage: false, total: 0 });
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await jobsService.getJobs({
        sector, mainSurveyType: mainType, search: search.trim() || undefined,
        page, limit,
      });
      setJobs(res.data);
      setMeta({ ...res.pagination, total: res.count });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sector, mainType, search, page, limit]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    jobsService.getCounts().then(res => setCounts(res.data)).catch(() => setCounts({}));
  }, []);

  useEffect(() => setPage(1), [sector, mainType, search]);

  const pick = (type: MainSurveyType) => setParams({ type });

  const columns: Column<ApiJob>[] = [
    { key: 'job', header: 'Job', primary: true, cell: j => (
      <span className={s.cellStack}><span className={s.strong}>{j.jobNumber || j.requestNumber}</span><span className={s.muted}>{j.uqmsNumber || '—'}</span></span>
    ) },
    { key: 'vessel', header: 'Vessel', cell: j => (
      <span className={s.cellStack}><span>{j.vesselName}</span><span className={s.muted}>{j.vesselCode}</span></span>
    ) },
    { key: 'surveys', header: 'Surveys', hideOnMobile: true, cell: j => j.surveyTypes.map(t => (typeof t === 'object' ? t.code : t)).join(', ') || '—' },
    ...(seesAll ? [{ key: 'surveyor', header: 'Surveyor', hideOnMobile: true, cell: (j: ApiJob) => personName(j.surveyor) }] : []),
    { key: 'allocated', header: 'Allocated', hideOnMobile: true, nowrap: true, cell: j => (j.allocatedAt ? formatDate(j.allocatedAt) : '—') },
    { key: 'status', header: 'Status', cell: j => <JobStatusBadge status={j.status} /> },
  ];

  return (
    <div className="animate-in">
      <PageHeader
        breadcrumbs={[{ label: 'My Jobs' }, { label: sectorLabel }]}
        title={`${sectorLabel} jobs`}
        description={seesAll ? 'All open jobs across surveyors. Completed jobs move to View Report.' : 'Jobs allocated to you. Open a job to book the survey and start reporting. Completed jobs move to View Report.'}
      />

      <Tabs
        label="Main survey type"
        value={mainType}
        onValueChange={pick}
        items={types.map(t => ({ value: t, label: MAIN_SURVEY_TYPE_LABELS[t], count: counts[t] ?? 0 }))}
      />

      <Toolbar
        attached
        search={<SearchInput value={search} onChange={setSearch} placeholder="Search vessel, UQMS, job or request…" />}
      />
      <DataTable
        attached
        columns={columns}
        rows={jobs}
        getRowId={j => j._id}
        loading={loading}
        error={error}
        onRetry={load}
        onRowClick={j => navigate(`${basePath}/${j._id}`)}
        empty={{ icon: <Briefcase />, title: 'No jobs here', description: `No ${MAIN_SURVEY_TYPE_LABELS[mainType].toLowerCase()} jobs ${seesAll ? '' : 'are allocated to you '}right now.` }}
        footer={meta.total > limit && (
          <Pagination page={meta.page} limit={limit} total={meta.total} totalPages={meta.totalPages} onPageChange={setPage} onLimitChange={setLimit} />
        )}
      />
    </div>
  );
}
