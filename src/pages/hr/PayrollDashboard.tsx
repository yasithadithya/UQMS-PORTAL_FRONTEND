import { useState, useEffect } from 'react';
import { hrService } from '../../api';
import PayslipModal from './PayslipModal';

export default function PayrollDashboard({ basePath }: { basePath: string }) {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generateLoading, setGenerateLoading] = useState(false);

  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  useEffect(() => {
    fetchRuns();
  }, []);

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const res = await hrService.getPayrollRuns();
      if (res.success) setRuns(res.data?.runs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!window.confirm(`Generate payroll for ${month}/${year}?`)) return;
    setGenerateLoading(true);
    try {
      await hrService.generatePayroll(month, year);
      alert('Payroll generated successfully');
      fetchRuns();
    } catch (err: any) {
      alert(err.message || 'Error generating payroll');
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!window.confirm('Approve this payroll run?')) return;
    try {
      await hrService.approvePayrollRun(id);
      fetchRuns();
    } catch (err: any) {
      alert(err.message || 'Error approving payroll');
    }
  };

  const handleMarkPaid = async (id: string) => {
    if (!window.confirm('Mark this payroll run as Paid?')) return;
    try {
      await hrService.markPayrollPaid(id);
      fetchRuns();
    } catch (err: any) {
      alert(err.message || 'Error marking payroll as paid');
    }
  };

  return (
    <div>
      <div className="card" style={{ padding: '24px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Month</label>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Year</label>
          <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: '100px' }} />
        </div>
        <button className="btn-primary" onClick={handleGenerate} disabled={generateLoading} style={{ marginBottom: 0 }}>
          {generateLoading ? 'Generating...' : 'Generate Bulk Payroll'}
        </button>
      </div>

      {loading ? (
        <p>Loading payroll runs...</p>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--separator)' }}>
                <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Period</th>
                <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Employees</th>
                <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Total Net Pay</th>
                <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(run => (
                <tr key={run._id} style={{ borderBottom: '1px solid var(--separator)' }} className="table-row-hover">
                  <td style={{ padding: '16px 20px', fontSize: '14px', fontWeight: 600 }}>{run.month} / {run.year}</td>
                  <td style={{ padding: '16px 20px', fontSize: '13px' }}>{run.payslips?.length || 0}</td>
                  <td style={{ padding: '16px 20px', fontSize: '13px' }}>Rs. {run.totalNetPay?.toFixed(2)}</td>
                  <td style={{ padding: '16px 20px', fontSize: '13px' }}>
                    <span style={{ 
                      display: 'inline-flex', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                      background: run.status === 'Paid' ? 'var(--green-subtle)' : run.status === 'Approved' ? 'var(--blue-subtle)' : 'var(--orange-subtle)', 
                      color: run.status === 'Paid' ? 'var(--green)' : run.status === 'Approved' ? 'var(--primary)' : 'var(--orange)'
                    }}>
                      {run.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => setSelectedRunId(run._id)}>View Payslip</button>
                      {run.status === 'Draft' && <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: '12px', color: 'var(--primary)', borderColor: 'rgba(59,130,246,0.3)' }} onClick={() => handleApprove(run._id)}>Approve</button>}
                      {run.status === 'Approved' && <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: '12px', color: 'var(--green)', borderColor: 'rgba(16,185,129,0.3)' }} onClick={() => handleMarkPaid(run._id)}>Mark Paid</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {runs.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>No payroll runs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedRunId && (
        <PayslipModal runId={selectedRunId} onClose={() => setSelectedRunId(null)} />
      )}
    </div>
  );
}
