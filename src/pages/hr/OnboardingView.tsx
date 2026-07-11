import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { hrService } from '../../api';
import { Badge, Modal, Field, formatDate } from './hrShared';
import ConfirmModal from '../../components/ConfirmModal';
import s from './hr.module.css';

type Section = 'checklists' | 'templates';

interface TemplateItem {
  title: string;
  description: string;
  dueOffsetDays: number;
}

export default function OnboardingView() {
  const [section, setSection] = useState<Section>('checklists');
  const [templates, setTemplates] = useState<any[]>([]);
  const [checklists, setChecklists] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('InProgress');

  const [templateForm, setTemplateForm] = useState<{ open: boolean; editing: any | null; name: string; type: string; items: TemplateItem[] }>({ open: false, editing: null, name: '', type: 'Onboarding', items: [] });
  const [startForm, setStartForm] = useState<{ open: boolean; employeeId: string; templateId: string; startDate: string }>({ open: false, employeeId: '', templateId: '', startDate: new Date().toISOString().split('T')[0] });
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const [deleteChecklistId, setDeleteChecklistId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tplRes, empRes, clRes] = await Promise.all([
        hrService.getChecklistTemplates(),
        hrService.getEmployees({ limit: 100 }),
        hrService.getEmployeeChecklists({ type: typeFilter || undefined, status: statusFilter || undefined, limit: 50 }),
      ]);
      if (tplRes.success) setTemplates(tplRes.data || []);
      if (empRes.success) setEmployees(empRes.data?.employees || []);
      if (clRes.success) setChecklists(clRes.data?.checklists || []);
    } catch (err: any) {
      toast.error(err.message || 'Error loading checklists');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const saveTemplate = async () => {
    const f = templateForm;
    if (!f.name.trim()) return toast.warn('Template name is required');
    if (f.items.length === 0 || f.items.some(i => !i.title.trim())) return toast.warn('Add at least one item; every item needs a title');
    try {
      if (f.editing) {
        await hrService.updateChecklistTemplate(f.editing._id, { name: f.name, type: f.type, items: f.items });
        toast.success('Template updated');
      } else {
        await hrService.createChecklistTemplate({ name: f.name, type: f.type, items: f.items });
        toast.success('Template created');
      }
      setTemplateForm({ ...f, open: false });
      fetchAll();
    } catch (err: any) {
      toast.error(err.message || 'Error saving template');
    }
  };

  const startChecklist = async () => {
    const f = startForm;
    if (!f.employeeId || !f.templateId) return toast.warn('Employee and template are required');
    try {
      await hrService.createEmployeeChecklist({ employeeId: f.employeeId, templateId: f.templateId, startDate: f.startDate });
      toast.success('Checklist started');
      setStartForm({ ...f, open: false });
      fetchAll();
    } catch (err: any) {
      toast.error(err.message || 'Error starting checklist');
    }
  };

  const updateTask = async (checklist: any, taskIndex: number, patch: any) => {
    try {
      await hrService.updateChecklistTask(checklist._id, taskIndex, patch);
      fetchAll();
    } catch (err: any) {
      toast.error(err.message || 'Error updating task');
    }
  };

  const removeTemplate = async () => {
    if (!deleteTemplateId) return;
    try {
      const res = await hrService.deleteChecklistTemplate(deleteTemplateId);
      toast.success(res.message || 'Template deleted');
      setDeleteTemplateId(null);
      fetchAll();
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
      setDeleteTemplateId(null);
    }
  };

  const removeChecklist = async () => {
    if (!deleteChecklistId) return;
    try {
      await hrService.deleteEmployeeChecklist(deleteChecklistId);
      toast.success('Checklist deleted');
      setDeleteChecklistId(null);
      fetchAll();
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const updateItem = (index: number, patch: Partial<TemplateItem>) => {
    setTemplateForm(f => ({ ...f, items: f.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) }));
  };

  const progressOf = (cl: any) => {
    const done = cl.tasks.filter((t: any) => t.status === 'Done' || t.status === 'Skipped').length;
    return cl.tasks.length ? Math.round((done / cl.tasks.length) * 100) : 0;
  };

  return (
    <div>
      <div className={s.topBar}>
        <div className={s.sectionSwitch}>
          <button className={`${s.sectionBtn} ${section === 'checklists' ? s.sectionBtnActive : ''}`} onClick={() => setSection('checklists')}>Active Checklists</button>
          <button className={`${s.sectionBtn} ${section === 'templates' ? s.sectionBtnActive : ''}`} onClick={() => setSection('templates')}>Templates</button>
        </div>
        <div className={s.headerActions}>
          {section === 'checklists' && (
            <>
              <select className="form-input" style={{ marginBottom: 0, width: 'auto' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                <option value="">All types</option>
                <option value="Onboarding">Onboarding</option>
                <option value="Offboarding">Offboarding</option>
              </select>
              <select className="form-input" style={{ marginBottom: 0, width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">All statuses</option>
                <option value="InProgress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
              <button className={s.addBtn} onClick={() => setStartForm({ ...startForm, open: true })}>+ Start Checklist</button>
            </>
          )}
          {section === 'templates' && (
            <button className={s.addBtn} onClick={() => setTemplateForm({ open: true, editing: null, name: '', type: 'Onboarding', items: [{ title: '', description: '', dueOffsetDays: 0 }] })}>+ New Template</button>
          )}
        </div>
      </div>

      {loading ? <p className={s.mutedNote}>Loading...</p> : section === 'checklists' ? (
        <div className={s.gridAuto} style={{ marginBottom: 0 }}>
          {checklists.map(cl => (
            <div key={cl._id} className={s.entityCard}>
              <div className={s.entityCardHead}>
                <div>
                  <div className={s.entityTitle}>{cl.employee?.firstName} {cl.employee?.lastName}</div>
                  <div className={s.entityMeta}>{cl.employee?.employeeId} · started {formatDate(cl.startDate)}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <Badge status={cl.type === 'Onboarding' ? 'Scheduled' : 'Pending'} label={cl.type} />
                  <Badge status={cl.status} />
                </div>
              </div>

              <div className={s.progressTrack} style={{ marginBottom: '4px' }}>
                <div className={`${s.progressFill} ${cl.status === 'Completed' ? s.progressFillDone : ''}`} style={{ width: `${progressOf(cl)}%` }} />
              </div>
              <div className={s.entityMeta}>{progressOf(cl)}% complete</div>

              {cl.tasks.map((task: any, i: number) => (
                <div key={i} className={s.taskRow}>
                  <div style={{ flex: 1 }}>
                    <div className={`${s.taskTitle} ${task.status === 'Done' ? s.taskTitleDone : ''}`}>{task.title}</div>
                    <div className={s.taskMeta}>
                      {task.dueDate && `Due ${formatDate(task.dueDate)}`}
                      {task.assignee && ` · ${task.assignee.firstName} ${task.assignee.lastName}`}
                    </div>
                  </div>
                  <select
                    className={`form-input ${s.miniSelect}`}
                    value={task.status}
                    onChange={e => updateTask(cl, i, { status: e.target.value })}
                  >
                    {['Pending', 'InProgress', 'Done', 'Skipped'].map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button className={`${s.actionBtn} ${s.actionDanger}`} onClick={() => setDeleteChecklistId(cl._id)}>Delete</button>
              </div>
            </div>
          ))}
          {checklists.length === 0 && <p className={s.mutedNote}>No checklists match the current filters.</p>}
        </div>
      ) : (
        <div className={s.gridAuto} style={{ marginBottom: 0 }}>
          {templates.map(tpl => (
            <div key={tpl._id} className={`${s.entityCard} ${tpl.isActive ? '' : s.inactive}`}>
              <div className={s.entityCardHead}>
                <div className={s.entityTitle}>{tpl.name}</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <Badge status={tpl.type === 'Onboarding' ? 'Scheduled' : 'Pending'} label={tpl.type} />
                  {!tpl.isActive && <Badge status="Cancelled" label="Inactive" />}
                </div>
              </div>
              <ol style={{ paddingLeft: '18px', marginBottom: '12px' }}>
                {tpl.items.map((item: any, i: number) => (
                  <li key={i} style={{ fontSize: '13px', marginBottom: '4px', color: 'var(--secondary)' }}>
                    {item.title}
                    <span className={s.entityMeta} style={{ display: 'inline', marginLeft: '4px' }}>(day {item.dueOffsetDays})</span>
                  </li>
                ))}
              </ol>
              <div className={s.cardActions}>
                <button className={s.actionBtn} onClick={() => setTemplateForm({ open: true, editing: tpl, name: tpl.name, type: tpl.type, items: tpl.items.map((i: any) => ({ title: i.title, description: i.description || '', dueOffsetDays: i.dueOffsetDays || 0 })) })}>Edit</button>
                <button className={`${s.actionBtn} ${s.actionDanger}`} onClick={() => setDeleteTemplateId(tpl._id)}>Delete</button>
              </div>
            </div>
          ))}
          {templates.length === 0 && <p className={s.mutedNote}>No templates yet.</p>}
        </div>
      )}

      {templateForm.open && (
        <Modal
          title={templateForm.editing ? 'Edit Template' : 'New Checklist Template'}
          size="wide"
          onClose={() => setTemplateForm({ ...templateForm, open: false })}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setTemplateForm({ ...templateForm, open: false })}>Cancel</button>
              <button className="btn-primary" onClick={saveTemplate}>Save Template</button>
            </>
          }
        >
          <div className={s.modalGrid} style={{ gridTemplateColumns: '2fr 1fr' }}>
            <Field label="Name" required>
              <input className="form-input" type="text" value={templateForm.name} onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })} placeholder="e.g. Standard Onboarding" />
            </Field>
            <Field label="Type" required>
              <select className="form-input" value={templateForm.type} onChange={e => setTemplateForm({ ...templateForm, type: e.target.value })}>
                <option value="Onboarding">Onboarding</option>
                <option value="Offboarding">Offboarding</option>
              </select>
            </Field>
          </div>

          <div className={s.dynHead}>
            <label className="form-label" style={{ marginBottom: 0 }}>Items</label>
            <button className={s.actionBtn} onClick={() => setTemplateForm({ ...templateForm, items: [...templateForm.items, { title: '', description: '', dueOffsetDays: 0 }] })}>
              + Add Item
            </button>
          </div>
          {templateForm.items.map((item, i) => (
            <div key={i} className={s.dynRow} style={{ gridTemplateColumns: '2fr 2fr 90px auto' }}>
              <input className="form-input" style={{ marginBottom: 0 }} type="text" placeholder="Task title" value={item.title} onChange={e => updateItem(i, { title: e.target.value })} />
              <input className="form-input" style={{ marginBottom: 0 }} type="text" placeholder="Description" value={item.description} onChange={e => updateItem(i, { description: e.target.value })} />
              <input className="form-input" style={{ marginBottom: 0 }} type="number" min={0} title="Due after N days" value={item.dueOffsetDays} onChange={e => updateItem(i, { dueOffsetDays: Number(e.target.value) })} />
              <button className={s.iconBtn} onClick={() => setTemplateForm({ ...templateForm, items: templateForm.items.filter((_, idx) => idx !== i) })} aria-label="Remove">✕</button>
            </div>
          ))}
          <p className={s.hint}>The number is the due offset in days from the checklist start date.</p>
        </Modal>
      )}

      {startForm.open && (
        <Modal
          title="Start Checklist"
          size="narrow"
          onClose={() => setStartForm({ ...startForm, open: false })}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setStartForm({ ...startForm, open: false })}>Cancel</button>
              <button className="btn-primary" onClick={startChecklist}>Start</button>
            </>
          }
        >
          <Field label="Employee" required>
            <select className="form-input" value={startForm.employeeId} onChange={e => setStartForm({ ...startForm, employeeId: e.target.value })}>
              <option value="">Select</option>
              {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} ({emp.employeeId})</option>)}
            </select>
          </Field>
          <Field label="Template" required>
            <select className="form-input" value={startForm.templateId} onChange={e => setStartForm({ ...startForm, templateId: e.target.value })}>
              <option value="">Select</option>
              {templates.filter(t => t.isActive).map(t => <option key={t._id} value={t._id}>{t.name} ({t.type})</option>)}
            </select>
          </Field>
          <Field label="Start Date">
            <input className="form-input" type="date" value={startForm.startDate} onChange={e => setStartForm({ ...startForm, startDate: e.target.value })} />
          </Field>
        </Modal>
      )}

      <ConfirmModal
        isOpen={!!deleteTemplateId}
        title="Delete Template"
        message="Delete this template? If checklists reference it, it will be deactivated instead."
        confirmText="Delete"
        isDestructive
        onCancel={() => setDeleteTemplateId(null)}
        onConfirm={removeTemplate}
      />
      <ConfirmModal
        isOpen={!!deleteChecklistId}
        title="Delete Checklist"
        message="Delete this checklist and its task progress permanently?"
        confirmText="Delete"
        isDestructive
        onCancel={() => setDeleteChecklistId(null)}
        onConfirm={removeChecklist}
      />
    </div>
  );
}
