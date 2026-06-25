import { useState, useEffect } from 'react';
import { hrService } from '../../api';

export default function AttendanceView({ basePath }: { basePath: string }) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [clockLoading, setClockLoading] = useState(false);

  useEffect(() => {
    hrService.getEmployees().then(res => {
      if (res.success) setEmployees(res.data?.employees || []);
    });
  }, []);

  useEffect(() => {
    if (selectedEmployeeId) {
      fetchLogs();
    } else {
      setLogs([]);
    }
  }, [selectedEmployeeId]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await hrService.getAttendance(selectedEmployeeId);
      if (res.success) {
        setLogs(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    if (!selectedEmployeeId) return alert('Select an employee first');
    setClockLoading(true);
    try {
      await hrService.clockIn(selectedEmployeeId);
      fetchLogs();
    } catch (err: any) {
      alert(err.message || 'Error clocking in');
    } finally {
      setClockLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!selectedEmployeeId) return alert('Select an employee first');
    setClockLoading(true);
    try {
      await hrService.clockOut(selectedEmployeeId);
      fetchLogs();
    } catch (err: any) {
      alert(err.message || 'Error clocking out');
    } finally {
      setClockLoading(false);
    }
  };

  return (
    <div>
      <div className="card" style={{ padding: '24px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label>Select Employee</label>
          <select value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)}>
            <option value="">-- Select Employee --</option>
            {employees.map(emp => (
              <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} ({emp.employeeId})</option>
            ))}
          </select>
        </div>
        <button className="btn-primary" onClick={handleClockIn} disabled={!selectedEmployeeId || clockLoading} style={{ marginBottom: 0 }}>
          Clock In
        </button>
        <button className="btn-secondary" onClick={handleClockOut} disabled={!selectedEmployeeId || clockLoading} style={{ marginBottom: 0 }}>
          Clock Out
        </button>
      </div>

      {loading ? (
        <p>Loading attendance logs...</p>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--separator)' }}>
                <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Date</th>
                <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Clock In</th>
                <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Clock Out</th>
                <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Hours Worked</th>
                <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log._id} style={{ borderBottom: '1px solid var(--separator)' }} className="table-row-hover">
                  <td style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 600 }}>{new Date(log.date).toLocaleDateString()}</td>
                  <td style={{ padding: '16px 20px', fontSize: '13px' }}>{log.clockIn ? new Date(log.clockIn).toLocaleTimeString() : '-'}</td>
                  <td style={{ padding: '16px 20px', fontSize: '13px' }}>{log.clockOut ? new Date(log.clockOut).toLocaleTimeString() : '-'}</td>
                  <td style={{ padding: '16px 20px', fontSize: '13px' }}>{log.workedHours ? log.workedHours.toFixed(2) : '-'}</td>
                  <td style={{ padding: '16px 20px', fontSize: '13px' }}>
                    <span style={{ display: 'inline-flex', padding: '4px 8px', borderRadius: '4px', background: 'var(--primary-subtle)', color: 'var(--primary)', fontSize: '11px', fontWeight: 600 }}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>
                    {selectedEmployeeId ? 'No attendance logs found for this employee.' : 'Please select an employee to view logs.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
