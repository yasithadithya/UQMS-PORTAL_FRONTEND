import { useState, useEffect } from 'react';
import { hrService } from '../../api';
import EmployeeForm from './EmployeeForm';

export default function EmployeeList({ basePath }: { basePath: string }) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await hrService.getEmployees();
      if (res.success) {
        setEmployees(res.data?.employees || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedEmployee(null);
    setIsFormOpen(true);
  };

  const handleEdit = (emp: any) => {
    setSelectedEmployee(emp);
    setIsFormOpen(true);
  };

  const handleSaved = () => {
    setIsFormOpen(false);
    fetchEmployees();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button className="btn-primary" onClick={handleAdd}>
          + Add Employee
        </button>
      </div>

      {loading ? (
        <p>Loading employees...</p>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--separator)' }}>
                <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Emp ID</th>
                <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Name</th>
                <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Department</th>
                <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp._id} style={{ borderBottom: '1px solid var(--separator)' }} className="table-row-hover">
                  <td style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 600 }}>{emp.employeeId}</td>
                  <td style={{ padding: '16px 20px', fontSize: '14px', color: 'var(--label)' }}>{emp.firstName} {emp.lastName}</td>
                  <td style={{ padding: '16px 20px', fontSize: '13px' }}>{emp.department?.name || 'N/A'}</td>
                  <td style={{ padding: '16px 20px', fontSize: '13px' }}>
                    <span style={{ display: 'inline-flex', padding: '4px 8px', borderRadius: '4px', background: emp.employmentStatus === 'Active' ? 'var(--green-subtle)' : 'var(--separator)', color: emp.employmentStatus === 'Active' ? 'var(--green)' : 'var(--muted)', fontSize: '11px', fontWeight: 600 }}>
                      {emp.employmentStatus}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => handleEdit(emp)}>Edit</button>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>No employees found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {isFormOpen && (
        <EmployeeForm 
          employee={selectedEmployee} 
          onClose={() => setIsFormOpen(false)} 
          onSaved={handleSaved} 
        />
      )}
    </div>
  );
}
