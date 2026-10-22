import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck2 } from 'lucide-react';
import { Card, DataTable, Field, Input, PageHeader, SearchInput, Select, Toolbar, type Column } from '@/ui';
import Pagination from '@/components/Pagination';
import { jobsService, operationsService } from '@/api';
import type { ApiAllocatableSurveyor, ApiJob, ApiSurveyType, PaginationMeta } from '@/api';
import { INDUSTRIAL_MAIN_TYPES, MAIN_SURVEY_TYPE_LABELS, MARINE_MAIN_TYPES } from '@/config/surveyCategories';
import { formatDate } from '@/utils/date';
import { JobStatusBadge, mainTypeLabel, personName } from './shared';
import s from './v2.module.css';

/**
 * View Report (scope=completed, read only) and Authorization (scope=authorization, manager queue)
 * share this filtered job list.
 */
export default function JobListPage({
  scope, basePath, title, description,
}: { scope: 'completed' | 'authorization'; basePath: string; title: string; description: string }) {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ search: '', sector: '', mainSurveyType: '', surveyTypeId: '', surveyorId: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [meta, setMeta] = useState<PaginationMeta & { total: number }>({ page: 1, limit: 25, totalPages: 1, hasNextPage: false, hasPrevPage: false, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [surveyTypes, setSurveyTypes] = useState<ApiSurveyType[]>([]);
  const [surveyors, setSurveyors] = useState<ApiAllocatableSurveyor[]>([]);

  useEffect(() => {
    operationsService.getSurveyTypes().then(r => setSurveyTypes(r.data)).catch(() => undefined);
    jobsService.getSurveyors().then(r => setSurveyors(r.data)).catch(() => undefined);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await jobsService.getJobs({ scope, ...filters, search: filters.search.trim() || undefined, page, limit });
      setJobs(res.data);
      setMeta({ ...res.pagination, total: res.count });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [scope, filters, page, limit]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const set = (k: keyof typeof filters) => (v: string) => {
    setFilters(prev => ({ ...prev, [k]: v }));
    setPage(1);
  };

  const columns: Column<ApiJob>[] = [
    { key: 'job', header: 'Job', primary: true, cell: j => (
      <span className={s.cellStack}><span className={s.strong}>{j.jobNumber || j.requestNumber}</span><span className={s.muted}>{j.uqmsNumber}</span></span>
    ) },
    { key: 'vessel', header: 'Vessel', cell: j => <span className={s.cellStack}><span>{j.vesselName}</span><span className={s.muted}>{j.vesselCode}</span></span> },
    { key: 'type', header: 'Survey', hideOnMobile: true, cell: j => `${j.sector === 'industrial' ? 'Industrial · ' : ''}${mainTypeLabel(j.mainSurveyType)}` },
    { key: 'surveyor', header: 'Surveyor', hideOnMobile: true, cell: j => personName(j.surveyor) },
    { key: 'date', header: scope === 'completed' ? 'Completed' : 'Signed', nowrap: true, hideOnMobile: true, cell: j => formatDate((scope === 'completed' ? j.completedAt : undefined) ?? j.updatedAt ?? '') },
    { key: 'status', header: 'Status', cell: j => <JobStatusBadge status={j.status} /> },
  ];

  return (
    <div className="animate-in">
      <PageHeader title={title} description={description} />
      <Card>
        <div className={s.filters}>
          <Field label="Sector">
            <Select value={filters.sector} onChange={e => set('sector')(e.target.value)}>
              <option value="">All</option><option value="marine">Marine</option><option value="industrial">Industrial</option>
            </Select>
          </Field>
          <Field label="Main survey type">
            <Select value={filters.mainSurveyType} onChange={e => set('mainSurveyType')(e.target.value)}>
              <option value="">All</option>
              {[...MARINE_MAIN_TYPES, ...INDUSTRIAL_MAIN_TYPES].map(t => (
                <option key={t} value={t}>{(INDUSTRIAL_MAIN_TYPES as readonly string[]).includes(t) ? 'Industrial · ' : ''}{MAIN_SURVEY_TYPE_LABELS[t]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Survey">
            <Select value={filters.surveyTypeId} onChange={e => set('surveyTypeId')(e.target.value)}>
              <option value="">All</option>
              {surveyTypes.map(t => <option key={t._id} value={t._id}>{t.code} · {t.name}</option>)}
            </Select>
          </Field>
          <Field label="Surveyor">
            <Select value={filters.surveyorId} onChange={e => set('surveyorId')(e.target.value)}>
              <option value="">All</option>
              {surveyors.map(u => <option key={u._id} value={u._id}>{personName(u)}</option>)}
            </Select>
          </Field>
          <Field label="From"><Input type="date" value={filters.from} onChange={e => set('from')(e.target.value)} /></Field>
          <Field label="To"><Input type="date" value={filters.to} onChange={e => set('to')(e.target.value)} /></Field>
        </div>
      </Card>
      <div style={{ height: 'var(--space-4)' }} />
      <Toolbar attached search={<SearchInput value={filters.search} onChange={set('search')} placeholder="Search vessel, UQMS, vessel code, job or request…" />} />
      <DataTable
        attached
        columns={columns}
        rows={jobs}
        getRowId={j => j._id}
        loading={loading}
        error={error}
        onRetry={load}
        onRowClick={j => navigate(`${basePath}/${j._id}`)}
        empty={{ icon: <FileCheck2 />, title: scope === 'completed' ? 'No completed reports' : 'Nothing waiting for approval' }}
        footer={meta.total > limit && (
          <Pagination page={meta.page} limit={limit} total={meta.total} totalPages={meta.totalPages} onPageChange={setPage} onLimitChange={setLimit} />
        )}
      />
    </div>
  );
}
