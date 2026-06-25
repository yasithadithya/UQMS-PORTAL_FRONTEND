import { useState, useEffect } from 'react';
import { hrService } from '../../api';

export default function PayslipModal({ runId, onClose }: { runId: string, onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hrService.getPayslip(runId).then(res => {
      if (res.success) setData(res.data);
      setLoading(false);
    }).catch(err => {
      alert('Error fetching payslip');
      onClose();
    });
  }, [runId]);

  if (loading) return null;
  if (!data) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card animate-in" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h2 style={{ marginBottom: '4px' }}>Payslip</h2>
            <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
              For the period: {data.month}/{data.year}
            </p>
          </div>
          <button className="btn-secondary" onClick={onClose} style={{ marginBottom: 0 }}>Close</button>
        </div>

        <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--separator)', borderRadius: '8px' }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>Employee Details</p>
          <p style={{ margin: '0 0 4px 0', fontSize: '14px' }}>Name: {data.employee?.firstName} {data.employee?.lastName}</p>
          <p style={{ margin: 0, fontSize: '14px' }}>ID: {data.employee?.employeeId}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          <div>
            <h4 style={{ borderBottom: '1px solid var(--separator)', paddingBottom: '8px', marginBottom: '16px' }}>Earnings</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
              <span>Basic Salary</span>
              <span>{data.basicSalary?.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
              <span>Allowances</span>
              <span>{data.allowances?.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', fontWeight: 600, marginTop: '16px' }}>
              <span>Gross Earnings</span>
              <span>{data.grossSalary?.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <h4 style={{ borderBottom: '1px solid var(--separator)', paddingBottom: '8px', marginBottom: '16px' }}>Deductions</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
              <span>EPF (Employee 8%)</span>
              <span>{data.epfEmployee?.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
              <span>Income Tax (APIT)</span>
              <span>{data.incomeTax?.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
              <span>Unpaid Leave Ded.</span>
              <span>{data.unpaidLeaveDeduction?.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', fontWeight: 600, marginTop: '16px' }}>
              <span>Total Deductions</span>
              <span>{data.totalDeductions?.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '2px solid var(--separator)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '16px', fontWeight: 700 }}>Net Pay</span>
          <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--green)' }}>Rs. {data.netSalary?.toFixed(2)}</span>
        </div>

      </div>
    </div>
  );
}
