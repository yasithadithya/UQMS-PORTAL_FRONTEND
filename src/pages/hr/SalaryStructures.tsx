import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { hrService } from '../../api';
import { PageHeader, FilterBar, Field, formatMoney, formatDate } from './hrShared';
import s from './hr.module.css';

interface AllowanceRow {
  name: string;
  amount: number;
  isTaxable: boolean;
}

export default function SalaryStructures() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [structure, setStructure] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [basicSalary, setBasicSalary] = useState<number>(0);
  const [allowances, setAllowances] = useState<AllowanceRow[]>([]);
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    hrService.getEmployees({ limit: 100, status: 'Active' }).then(res => {
      if (res.success) setEmployees(res.data?.employees || []);
    }).catch(() => toast.error('Failed to load employees'));
  }, []);

  const fetchStructure = useCallback(async () => {
    if (!employeeId) {
      setStructure(null);
      return;
    }
    setLoading(true);
    try {
      const res = await hrService.getSalaryStructure(employeeId);
      if (res.success) {
        setStructure(res.data);
        setBasicSalary(res.data.basicSalary);
        setAllowances((res.data.allowances || []).map((a: any) => ({ name: a.name, amount: a.amount, isTaxable: a.isTaxable ?? true })));
      }
    } catch {
      // 404 = no active structure yet
      setStructure(null);
      setBasicSalary(0);
      setAllowances([]);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { fetchStructure(); }, [fetchStructure]);

  const updateAllowance = (index: number, patch: Partial<AllowanceRow>) => {
    setAllowances(rows => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const save = async () => {
    if (!employeeId) return toast.warn('Select an employee');
    if (!basicSalary || basicSalary <= 0) return toast.warn('Basic salary must be greater than zero');
    if (allowances.some(a => !a.name.trim())) return toast.warn('Every allowance needs a name');
    setSaving(true);
    try {
      await hrService.setSalaryStructure({ employeeId, basicSalary, allowances, effectiveFrom });
      toast.success('Salary structure saved (previous structure deactivated)');
      fetchStructure();
    } catch (err: any) {
      toast.error(err.message || 'Error saving salary structure');
    } finally {
      setSaving(false);
    }
  };

  const totalAllowances = allowances.reduce((sum, a) => sum + (a.amount || 0), 0);

  return (
    <div>
      <PageHeader title="Salary Structures" subtitle="Basic pay and allowances per employee" />

      <FilterBar>
        <Field label="Employee" className={s.filterField}>
          <select className="form-input" value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
            <option value="">-- Select Employee --</option>
            {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} ({emp.employeeId})</option>)}
          </select>
        </Field>
        {structure && (
          <p className={s.mutedNote} style={{ marginBottom: '10px' }}>
            Active since {formatDate(structure.effectiveFrom)} — Basic {formatMoney(structure.basicSalary)}
          </p>
        )}
      </FilterBar>

      {employeeId && !loading && (
        <div className={`card ${s.formCard}`}>
          <h3 className={s.sectionTitle} style={{ marginBottom: '20px' }}>
            {structure ? 'Update Salary Structure' : 'Set Salary Structure'}
          </h3>

          <div className={s.modalGrid}>
            <Field label="Basic Salary (Rs.)" required>
              <input className="form-input" type="number" min={0} value={basicSalary || ''} onChange={e => setBasicSalary(Number(e.target.value))} />
            </Field>
            <Field label="Effective From">
              <input className="form-input" type="date" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)} />
            </Field>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div className={s.dynHead}>
              <label className="form-label" style={{ marginBottom: 0 }}>Allowances ({formatMoney(totalAllowances)} total)</label>
              <button className={s.actionBtn} onClick={() => setAllowances([...allowances, { name: '', amount: 0, isTaxable: true }])}>
                + Add Allowance
              </button>
            </div>
            {allowances.map((a, i) => (
              <div key={i} className={s.dynRow} style={{ gridTemplateColumns: '2fr 1fr auto auto' }}>
                <input className="form-input" style={{ marginBottom: 0 }} type="text" placeholder="Name (e.g. Transport)" value={a.name} onChange={e => updateAllowance(i, { name: e.target.value })} />
                <input className="form-input" style={{ marginBottom: 0 }} type="number" min={0} placeholder="Amount" value={a.amount || ''} onChange={e => updateAllowance(i, { amount: Number(e.target.value) })} />
                <label className={s.checkInline}>
                  <input type="checkbox" checked={a.isTaxable} onChange={e => updateAllowance(i, { isTaxable: e.target.checked })} />
                  Taxable
                </label>
                <button className={s.iconBtn} onClick={() => setAllowances(allowances.filter((_, idx) => idx !== i))} aria-label="Remove">✕</button>
              </div>
            ))}
            {allowances.length === 0 && <p className={s.mutedNote}>No allowances defined.</p>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" style={{ marginBottom: 0 }} onClick={save} disabled={saving}>
              {saving ? 'Saving...' : 'Save Structure'}
            </button>
          </div>
        </div>
      )}

      {!employeeId && <p className={s.mutedNote}>Select an employee to view or set their salary structure.</p>}
      {loading && <p className={s.mutedNote}>Loading salary structure...</p>}
    </div>
  );
}
