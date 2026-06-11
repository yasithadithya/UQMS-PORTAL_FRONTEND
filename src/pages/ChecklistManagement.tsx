import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import {
  checklistQuestionsService,
  operationsService,
  vesselCodesService,
  type ApiChecklistQuestion,
  type ApiSurveyType,
  type ApiAreaOfOperation,
  type ApiVesselType,
  type ApiVesselCode,
} from '@/api';
import s from './ChecklistManagement.module.css';

// Predefined options requested by user

// Premium click outside hook to close dropdowns
function useOutsideClick(ref: React.RefObject<HTMLElement>, callback: () => void) {
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, callback]);
}

interface MultiSelectDropdownProps<T> {
  label: string;
  options: T[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  getOptionId: (option: T) => string;
  getOptionLabel: (option: T) => string;
  placeholder: string;
}

function MultiSelectDropdown<T>({
  label,
  options,
  selectedValues,
  onChange,
  getOptionId,
  getOptionLabel,
  placeholder,
}: MultiSelectDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useOutsideClick(containerRef, () => setIsOpen(false));

  const handleToggleOption = (id: string) => {
    if (selectedValues.includes(id)) {
      onChange(selectedValues.filter((v) => v !== id));
    } else {
      onChange([...selectedValues, id]);
    }
  };

  const handleSelectAll = () => {
    onChange(options.map((opt) => getOptionId(opt)));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  // Label display logic
  const getTriggerText = () => {
    if (selectedValues.length === 0) {
      return <span className={s.triggerPlaceholder}>{placeholder}</span>;
    }
    if (selectedValues.length === options.length) {
      return `All ${label}s Selected`;
    }
    if (selectedValues.length > 2) {
      return `${selectedValues.length} ${label}s Selected`;
    }
    
    return selectedValues
      .map((val) => {
        const opt = options.find((o) => getOptionId(o) === val);
        return opt ? getOptionLabel(opt) : '';
      })
      .filter(Boolean)
      .join(', ');
  };

  return (
    <div className={s.multiSelectContainer} ref={containerRef}>
      <div className={s.multiSelectTrigger} onClick={() => setIsOpen(!isOpen)}>
        <span className={s.triggerText}>{getTriggerText()}</span>
        <svg
          className={`${s.arrow} ${isOpen ? s.arrowOpen : ''}`}
          viewBox="0 0 10 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="2 2 5 5 8 2" />
        </svg>
      </div>

      {isOpen && (
        <div className={s.dropdownPanel}>
          <div className={s.dropdownActions}>
            <button type="button" className={s.dropdownActionLink} onClick={handleSelectAll}>
              Select All
            </button>
            <button type="button" className={s.dropdownActionLink} onClick={handleClearAll}>
              Clear All
            </button>
          </div>
          {options.map((opt) => {
            const id = getOptionId(opt);
            const isChecked = selectedValues.includes(id);
            return (
              <div key={id} className={s.optionItem} onClick={() => handleToggleOption(id)}>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {}} // Controlled via parent click
                  className={s.checkboxInput}
                />
                <span className={s.optionLabel}>{getOptionLabel(opt)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ChecklistManagement() {
  const [questions, setQuestions] = useState<ApiChecklistQuestion[]>([]);
  const [surveyTypes, setSurveyTypes] = useState<ApiSurveyType[]>([]);
  const [areaOperations, setAreaOperations] = useState<ApiAreaOfOperation[]>([]);
  const [boatTypes, setBoatTypes] = useState<ApiVesselType[]>([]);
  const [vesselCodes, setVesselCodes] = useState<ApiVesselCode[]>([]);

  // Filtering criteria states (Arrays for multi-select dropdowns)
  const [search, setSearch] = useState('');
  const [filterSurveyCategories, setFilterSurveyCategories] = useState<string[]>([]);
  const [filterAreaOperations, setFilterAreaOperations] = useState<string[]>([]);
  const [filterBoatTypes, setFilterBoatTypes] = useState<string[]>([]);
  const [filterVesselCode, setFilterVesselCode] = useState('');
  const [filterQCategory, setFilterQCategory] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<ApiChecklistQuestion | null>(null);
  const [viewingQuestion, setViewingQuestion] = useState<ApiChecklistQuestion | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form payload states (using array states for all select dropdowns)
  const [formItemText, setFormItemText] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAdditionalFields, setFormAdditionalFields] = useState<string[]>([]);
  const [formSurveyCategories, setFormSurveyCategories] = useState<string[]>([]);
  const [formAreaOperations, setFormAreaOperations] = useState<string[]>([]);
  const [formBoatTypes, setFormBoatTypes] = useState<string[]>([]);
  const [formVesselCode, setFormVesselCode] = useState('');
  const [formQCategory, setFormQCategory] = useState('');

  // Load lookup criteria options from backend
  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [vTypesRes, sTypesRes, areasRes, vCodesRes] = await Promise.all([
          operationsService.getVesselTypes(),
          operationsService.getSurveyTypes(),
          operationsService.getAreaOperations(),
          vesselCodesService.getVesselCodes(),
        ]);
        if (vTypesRes.success) setBoatTypes(vTypesRes.data);
        if (sTypesRes.success) setSurveyTypes(sTypesRes.data);
        if (areasRes.success) setAreaOperations(areasRes.data);
        if (vCodesRes.success) setVesselCodes(vCodesRes.data);
      } catch (err: any) {
        toast.error('Failed to load filter dropdown criteria: ' + err.message);
      }
    };
    loadLookups();
  }, []);

  // Fetch checklist questions on filter updates
  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const params: any = {
        search: search.trim() || undefined,
        surveyCategory: filterSurveyCategories.length > 0 ? filterSurveyCategories.join(',') : undefined,
        areaOfOperation: filterAreaOperations.length > 0 ? filterAreaOperations.join(',') : undefined,
        boatType: filterBoatTypes.length > 0 ? filterBoatTypes.join(',') : undefined,
        vesselCode: filterVesselCode.trim() || undefined,
        qCategory: filterQCategory.trim() || undefined,
      };
      const res = await checklistQuestionsService.getQuestions(params);
      if (res.success) {
        setQuestions(res.data);
      }
    } catch (err: any) {
      toast.error('Failed to fetch checklist questions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [search, filterSurveyCategories, filterAreaOperations, filterBoatTypes, filterVesselCode, filterQCategory]);

  const openAddModal = () => {
    setEditingQuestion(null);
    setFormItemText('');
    setFormDescription('');
    setFormAdditionalFields([]);
    setFormSurveyCategories([]);
    setFormAreaOperations([]);
    setFormBoatTypes([]);
    setFormVesselCode('');
    setFormQCategory('');
    setShowModal(true);
  };

  const openEditModal = (q: ApiChecklistQuestion) => {
    setEditingQuestion(q);
    setFormItemText(q.item);
    setFormDescription(q.description || '');
    setFormAdditionalFields(q.additionalFields || []);
    
    // Map populated categories/objects to string arrays
    const categoryIds = (q.surveyCategories || []).map((c: any) => (typeof c === 'object' ? c._id : c));
    const areaIds = (q.areaOfOperations || []).map((a: any) => (typeof a === 'object' ? a._id : a));
    const boatIds = (q.boatTypes || []).map((b: any) => (typeof b === 'object' ? b._id : b));
    
    setFormSurveyCategories(categoryIds);
    setFormAreaOperations(areaIds);
    setFormBoatTypes(boatIds);
    setFormVesselCode(q.vesselCode || '');
    setFormQCategory(q.qCategory || '');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formItemText.trim()) {
      toast.error('Item text is required.');
      return;
    }
    if (formSurveyCategories.length === 0) {
      toast.error('At least one survey category must be selected.');
      return;
    }

    try {
      setSaving(true);
      const payload: Partial<ApiChecklistQuestion> = {
        item: formItemText.trim(),
        description: formDescription.trim() || null,
        additionalFields: formAdditionalFields,
        surveyCategories: formSurveyCategories,
        areaOfOperations: formAreaOperations,
        boatTypes: formBoatTypes,
        vesselCode: formVesselCode.trim() || null,
        qCategory: formQCategory.trim() || null,
      };

      if (editingQuestion?._id) {
        const res = await checklistQuestionsService.updateQuestion(editingQuestion._id, payload);
        if (res.success) {
          toast.success('Checklist item updated successfully.');
          fetchQuestions();
          setShowModal(false);
        } else {
          toast.error(res.message || 'Failed to update item.');
        }
      } else {
        const res = await checklistQuestionsService.createQuestion(payload);
        if (res.success) {
          toast.success('Checklist item created successfully.');
          fetchQuestions();
          setShowModal(false);
        } else {
          toast.error(res.message || 'Failed to create item.');
        }
      }
    } catch (err: any) {
      toast.error('Error saving checklist item: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const res = await checklistQuestionsService.deleteQuestion(deleteConfirmId);
      if (res.success) {
        toast.success('Checklist question deleted successfully.');
        fetchQuestions();
      } else {
        toast.error(res.message || 'Failed to delete question.');
      }
    } catch (err: any) {
      toast.error('Error deleting checklist question: ' + err.message);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const getSurveyLabels = (q: ApiChecklistQuestion) => {
    if (!q.surveyCategories || q.surveyCategories.length === 0) return <span className={s.badgeEmpty}>All</span>;
    return q.surveyCategories.map((c: any) => {
      const name = typeof c === 'object' ? c.name : c;
      return (
        <span key={name} className={`${s.badge} ${s.badgeCategory}`}>
          {name}
        </span>
      );
    });
  };

  const getAreaLabels = (q: ApiChecklistQuestion) => {
    if (!q.areaOfOperations || q.areaOfOperations.length === 0) return <span className={s.badgeEmpty}>All Areas</span>;
    return q.areaOfOperations.map((a: any) => {
      const name = typeof a === 'object' ? a.AreaCategory : a;
      return (
        <span key={name} className={`${s.badge} ${s.badgeArea}`}>
          {name}
        </span>
      );
    });
  };

  const getBoatLabels = (q: ApiChecklistQuestion) => {
    if (!q.boatTypes || q.boatTypes.length === 0) return <span className={s.badgeEmpty}>All Boats</span>;
    return q.boatTypes.map((b: any) => {
      const name = typeof b === 'object' ? b.name : b;
      return (
        <span key={name} className={`${s.badge} ${s.badgeBoat}`}>
          {name}
        </span>
      );
    });
  };

  return (
    <div className="animate-in" style={{ padding: '4px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Banner Bar */}
      <div className={s.topBar}>
        <div>
          <h2 className="section-header" style={{ marginBottom: '4px' }}>Checklist Items</h2>
          <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Manage checklist items and filter criteria mapping for survey check sheets.
          </p>
        </div>
        <button className={s.addBtn} onClick={openAddModal}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 3v12M3 9h12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          Add Item
        </button>
      </div>

      {/* Filter Section (Multiple Selection Dropdowns) */}
      <div className={s.filterSection}>
        <div className={s.filterField}>
          <label className={s.filterLabel}>Search Item text</label>
          <input
            className="form-input"
            style={{ marginBottom: 0 }}
            placeholder="Type search words..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={s.filterField}>
          <label className={s.filterLabel}>Survey Category</label>
          <MultiSelectDropdown
            label="Category"
            options={surveyTypes}
            selectedValues={filterSurveyCategories}
            onChange={setFilterSurveyCategories}
            getOptionId={(opt) => opt._id}
            getOptionLabel={(opt) => `${opt.name} (${opt.code})`}
            placeholder="Select Categories..."
          />
        </div>

        <div className={s.filterField}>
          <label className={s.filterLabel}>Boat Type</label>
          <MultiSelectDropdown
            label="Boat Type"
            options={boatTypes}
            selectedValues={filterBoatTypes}
            onChange={setFilterBoatTypes}
            getOptionId={(opt) => opt._id}
            getOptionLabel={(opt) => opt.name}
            placeholder="Select Boat Types..."
          />
        </div>

        <div className={s.filterField}>
          <label className={s.filterLabel}>Area of Operations</label>
          <MultiSelectDropdown
            label="Area"
            options={areaOperations}
            selectedValues={filterAreaOperations}
            onChange={setFilterAreaOperations}
            getOptionId={(opt) => opt._id}
            getOptionLabel={(opt) => opt.AreaCategory}
            placeholder="Select Areas..."
          />
        </div>

        <div className={s.filterField}>
          <label className={s.filterLabel}>Vessel Code</label>
          <select
            className="form-input"
            style={{ marginBottom: 0, cursor: 'pointer' }}
            value={filterVesselCode}
            onChange={(e) => setFilterVesselCode(e.target.value)}
          >
            <option value="">All Vessel Codes</option>
            {vesselCodes.map((vc) => (
              <option key={vc._id} value={vc.code}>
                {vc.code}
              </option>
            ))}
          </select>
        </div>

        <div className={s.filterField}>
          <label className={s.filterLabel}>Q Category</label>
          <input
            className="form-input"
            style={{ marginBottom: 0 }}
            placeholder="HULL..."
            value={filterQCategory}
            onChange={(e) => setFilterQCategory(e.target.value)}
          />
        </div>
      </div>

      {/* List Table */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--muted)' }}>
          <div
            style={{
              display: 'inline-block',
              width: '32px',
              height: '32px',
              border: '3px solid var(--border)',
              borderTopColor: 'var(--primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '16px',
            }}
          />
          <p>Fetching checklist items...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className={s.emptyState}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📝</div>
          <h3>No Checklist Items Found</h3>
          <p style={{ marginTop: '8px' }}>
            No checklist items match the current query criteria. Click "Add Item" to construct one.
          </p>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Item</th>
                <th>Item Category</th>
                <th style={{ width: '150px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => (
                <tr key={q._id} className={s.clickableRow} onClick={() => setViewingQuestion(q)}>
                  <td>
                    <div className={s.questionText}>{q.item}</div>
                    {q.vesselCode && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '11px', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--muted)', background: 'rgba(148,163,184,.08)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                          Vessel Code: <strong style={{ color: 'var(--label)' }}>{q.vesselCode}</strong>
                        </span>
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={q.qCategory ? s.categoryTag : s.categoryTagEmpty}>
                      {q.qCategory || 'General'}
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className={s.actions}>
                      <button className={s.actionBtn} onClick={() => setViewingQuestion(q)} title="View Details">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      <button className={s.actionBtn} onClick={() => openEditModal(q)} title="Edit Item">
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M11.5 2.5l2 2M2 14l1-4L11.5 1.5l2 2L5 12l-4 1z"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      <button
                        className={`${s.actionBtn} ${s.deleteBtn}`}
                        onClick={() => setDeleteConfirmId(q._id || null)}
                        title="Delete Item"
                      >
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1M5 4v8a1 1 0 001 1h4a1 1 0 001-1V4"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className={s.overlay} onClick={() => setShowModal(false)}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSave}>
              <div className={s.modalHeader}>
                <h3 className={s.modalTitle}>
                  {editingQuestion ? 'Edit Checklist Item' : 'Add Checklist Item'}
                </h3>
                <button type="button" className={s.closeBtn} onClick={() => setShowModal(false)}>
                  ✕
                </button>
              </div>

              <div className={s.modalBody}>
                <label className="form-label">Item text *</label>
                <textarea
                  className="form-input form-textarea"
                  placeholder="e.g. Lifeboats functional"
                  value={formItemText}
                  onChange={(e) => setFormItemText(e.target.value)}
                  rows={2}
                  required
                />

                <label className="form-label">Description (Optional)</label>
                <textarea
                  className="form-input form-textarea"
                  placeholder="e.g. Ensure emergency batteries are fully charged and systems operational."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                />

                <label className="form-label">Additional Fields Required</label>
                <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  {['Model', 'Serial Number', 'Qty', 'Capacity', 'Type', 'Last Service'].map((field) => (
                    <label key={field} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--label)' }}>
                      <input
                        type="checkbox"
                        checked={formAdditionalFields.includes(field)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormAdditionalFields([...formAdditionalFields, field]);
                          } else {
                            setFormAdditionalFields(formAdditionalFields.filter((f) => f !== field));
                          }
                        }}
                        className={s.checkboxInput}
                      />
                      {field}
                    </label>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label className="form-label">Vessel Code (Optional)</label>
                    <select
                      className="form-input"
                      style={{ marginBottom: 0, cursor: 'pointer' }}
                      value={formVesselCode}
                      onChange={(e) => setFormVesselCode(e.target.value)}
                    >
                      <option value="">-- Applies to all --</option>
                      {vesselCodes.map((vc) => (
                        <option key={vc._id} value={vc.code}>
                          {vc.code} - {vc.description}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Q Category (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ marginBottom: 0 }}
                      placeholder="e.g. Hull"
                      value={formQCategory}
                      onChange={(e) => setFormQCategory(e.target.value)}
                    />
                  </div>
                </div>

                <label className="form-label">Survey Categories *</label>
                <MultiSelectDropdown
                  label="Category"
                  options={surveyTypes}
                  selectedValues={formSurveyCategories}
                  onChange={setFormSurveyCategories}
                  getOptionId={(opt) => opt._id}
                  getOptionLabel={(opt) => `${opt.name} (${opt.code})`}
                  placeholder="Select Survey Categories..."
                />

                <label className="form-label">Boat Types (Optional)</label>
                <MultiSelectDropdown
                  label="Boat Type"
                  options={boatTypes}
                  selectedValues={formBoatTypes}
                  onChange={setFormBoatTypes}
                  getOptionId={(opt) => opt._id}
                  getOptionLabel={(opt) => opt.name}
                  placeholder="Applies to all boat types if empty"
                />

                <label className="form-label">Area of Operations (Optional)</label>
                <MultiSelectDropdown
                  label="Area"
                  options={areaOperations}
                  selectedValues={formAreaOperations}
                  onChange={setFormAreaOperations}
                  getOptionId={(opt) => opt._id}
                  getOptionLabel={(opt) => opt.AreaCategory}
                  placeholder="Applies to all areas if empty"
                />


              </div>

              <div className={s.modalFooter}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewingQuestion && (
        <div className={s.overlay} onClick={() => setViewingQuestion(null)}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
            <div className={s.modalHeader}>
              <h3 className={s.modalTitle}>Checklist Item Details</h3>
              <button type="button" className={s.closeBtn} onClick={() => setViewingQuestion(null)}>
                ✕
              </button>
            </div>

            <div className={s.modalBody}>
              <div className={s.detailSection}>
                <div className={s.detailLabel}>Item Text</div>
                <div className={s.detailValueQuestion}>{viewingQuestion.item}</div>
              </div>

              {viewingQuestion.description && (
                <div className={s.detailSection}>
                  <div className={s.detailLabel}>Description</div>
                  <div className={s.detailValueQuestion} style={{ fontSize: '13.5px', whiteSpace: 'pre-wrap' }}>
                    {viewingQuestion.description}
                  </div>
                </div>
              )}

              {viewingQuestion.additionalFields && viewingQuestion.additionalFields.length > 0 && (
                <div className={s.detailSection}>
                  <div className={s.detailLabel}>Additional Fields Required</div>
                  <div className={s.badgeList}>
                    {viewingQuestion.additionalFields.map((field) => (
                      <span key={field} className={`${s.badge} ${s.badgeField}`}>
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className={s.detailGrid}>
                <div className={s.detailItem}>
                  <div className={s.detailLabel}>Item Category</div>
                  <div className={s.detailValue}>
                    <span className={viewingQuestion.qCategory ? s.categoryTag : s.categoryTagEmpty}>
                      {viewingQuestion.qCategory || 'General'}
                    </span>
                  </div>
                </div>

                <div className={s.detailItem}>
                  <div className={s.detailLabel}>Vessel Code</div>
                  <div className={s.detailValue}>
                    {viewingQuestion.vesselCode ? (
                      <span className={s.vesselCodeBadge}>{viewingQuestion.vesselCode}</span>
                    ) : (
                      <span className={s.badgeEmpty}>Applies to all vessel codes</span>
                    )}
                  </div>
                </div>
              </div>

              <div className={s.detailSection}>
                <div className={s.detailLabel}>Survey Categories</div>
                <div className={s.badgeList}>
                  {getSurveyLabels(viewingQuestion)}
                </div>
              </div>

              <div className={s.detailSection}>
                <div className={s.detailLabel}>Boat Types</div>
                <div className={s.badgeList}>
                  {getBoatLabels(viewingQuestion)}
                </div>
              </div>

              <div className={s.detailSection}>
                <div className={s.detailLabel}>Area of Operations</div>
                <div className={s.badgeList}>
                  {getAreaLabels(viewingQuestion)}
                </div>
              </div>


            </div>

            <div className={s.modalFooter}>
              <button type="button" className="btn-secondary" onClick={() => setViewingQuestion(null)}>
                Close
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  const q = viewingQuestion;
                  setViewingQuestion(null);
                  openEditModal(q);
                }}
              >
                Edit Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className={s.overlay} onClick={() => setDeleteConfirmId(null)}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '365px' }}>
            <div className={s.modalBody} style={{ textAlign: 'center', padding: '28px 24px' }}>
              <div style={{ fontSize: '42px', marginBottom: '14px' }}>⚠️</div>
              <h3 className={s.modalTitle} style={{ marginBottom: '8px' }}>
                Delete Item?
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--muted)' }}>
                This checklist item will be removed permanently.
              </p>
            </div>
            <div className={s.modalFooter}>
              <button type="button" className="btn-secondary" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ background: 'var(--red)', marginBottom: 0 }}
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
