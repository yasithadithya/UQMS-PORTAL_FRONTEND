import { useState, useEffect } from 'react';
import { hrService } from '../../api';

export default function LeaveManagement({ basePath }: { basePath: string }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await hrService.getLeaveRequests();
      if (res.success) setRequests(res.data?.requests || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!window.confirm('Approve this leave request?')) return;
    try {
      await hrService.approveLeaveRequest(id);
      fetchRequests();
    } catch (err: any) {
      alert(err.message || 'Error approving request');
    }
  };

  const handleReject = async (id: string) => {
    const comments = window.prompt('Reason for rejection:');
    if (comments === null) return;
    try {
      await hrService.rejectLeaveRequest(id, comments);
      fetchRequests();
    } catch (err: any) {
      alert(err.message || 'Error rejecting request');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Leave Requests</h3>
        <button className="btn-secondary" onClick={fetchRequests}>Refresh</button>
      </div>

      {loading ? (
        <p>Loading leave requests...</p>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--separator)' }}>
                <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Employee</th>
                <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Leave Type</th>
                <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Dates</th>
                <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Days</th>
                <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => (
                <tr key={req._id} style={{ borderBottom: '1px solid var(--separator)' }} className="table-row-hover">
                  <td style={{ padding: '16px 20px', fontSize: '14px', fontWeight: 600 }}>
                    {req.employee?.firstName} {req.employee?.lastName}
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', fontWeight: 400, marginTop: '2px' }}>
                      {req.employee?.employeeId}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: '13px' }}>{req.leaveType?.name || 'Unknown'}</td>
                  <td style={{ padding: '16px 20px', fontSize: '13px' }}>
                    {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: '13px' }}>{req.numberOfDays}</td>
                  <td style={{ padding: '16px 20px', fontSize: '13px' }}>
                    <span style={{ 
                      display: 'inline-flex', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                      background: req.status === 'Approved' ? 'var(--green-subtle)' : req.status === 'Rejected' ? 'var(--red-subtle)' : 'var(--orange-subtle)', 
                      color: req.status === 'Approved' ? 'var(--green)' : req.status === 'Rejected' ? 'var(--red)' : 'var(--orange)'
                    }}>
                      {req.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    {req.status === 'Pending' && (
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: '12px', color: 'var(--green)', borderColor: 'rgba(16,185,129,0.3)' }} onClick={() => handleApprove(req._id)}>Approve</button>
                        <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: '12px', color: 'var(--red)', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => handleReject(req._id)}>Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>No leave requests found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
