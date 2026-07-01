import { useState, useEffect } from 'react';
import { hrService } from '../../api';
import EmployeeForm from './EmployeeForm';
import Pagination from '@/components/Pagination';

export default function EmployeeList({ basePath }: { basePath: string }) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchEmployees = async (currentPage = page, currentLimit = limit) => {
    try {
      setLoading(true);
      const res = await hrService.getEmployees({ page: currentPage, limit: currentLimit });
      if (res.success && res.data) {
        setEmployees(res.data.employees || []);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.pages || 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees(page, limit);
  }, [page, limit]);

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
    fetchEmployees(page, limit);
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
        <>
          <div className="card" style={{ padding: 0, overflowX: 'auto', marginBottom: '16px' }}>
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

          <Pagination
            page={page}
            limit={limit}
            total={total}
            totalPages={totalPages}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </>
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
