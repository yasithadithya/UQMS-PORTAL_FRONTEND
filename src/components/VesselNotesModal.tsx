import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { notesService } from '@/api';
import type { ApiNoteItem } from '@/api';

interface VesselNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  vesselId: string;
  vesselName: string;
  onSaveSuccess?: () => void;
}

export default function VesselNotesModal({
  isOpen,
  onClose,
  vesselId,
  vesselName,
  onSaveSuccess
}: VesselNotesModalProps) {
  if (!isOpen || !vesselId) return null;

  const [notesList, setNotesList] = useState<ApiNoteItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Additional Information');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch existing notes when modal opens
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setLoading(true);
        const res = await notesService.getNotesByVesselId(vesselId);
        if (res.success && res.data) {
          // Format dates to YYYY-MM-DD for standard date input fields
          const formatted = (res.data.notes || []).map((note: any) => ({
            ...note,
            dueDate: note.dueDate ? note.dueDate.split('T')[0] : ''
          }));
          setNotesList(formatted);
        }
      } catch (err: any) {
        toast.error('Failed to load notes: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [vesselId]);

  // Add a new empty note row locally under the selected category
  const handleAddNote = () => {
    const newNote: ApiNoteItem = {
      noteCategory: selectedCategory,
      noteCode: '', // Indicates unsaved / pending generation
      description: '',
      type: 'Hull',
      status: 'new',
      dueDate: ''
    };
    setNotesList([...notesList, newNote]);
  };

  // Update a field in a note row using its original index in the full list
  const handleUpdateField = (originalIndex: number, field: keyof ApiNoteItem, value: any) => {
    const updated = [...notesList];
    
    let statusVal = updated[originalIndex].status;
    if (field === 'status') {
      statusVal = value;
    } else if (updated[originalIndex].noteCode && statusVal === 'retained') {
      statusVal = 'modified';
    }

    updated[originalIndex] = {
      ...updated[originalIndex],
      [field]: value,
      status: statusVal
    };
    setNotesList(updated);
  };

  // Delete/Restore a note row using its original index in the full list
  const handleDeleteNote = (originalIndex: number) => {
    const note = notesList[originalIndex];
    if (!note.noteCode) {
      // Local-only note: remove from array immediately
      setNotesList(notesList.filter((_, i) => i !== originalIndex));
    } else {
      // Saved note: toggle deleted status
      const updated = [...notesList];
      const isDeleted = updated[originalIndex].status === 'deleted';
      updated[originalIndex] = {
        ...updated[originalIndex],
        status: isDeleted ? 'modified' : 'deleted'
      };
      setNotesList(updated);
    }
  };

  // Save all notes (both displayed and hidden categories)
  const handleSave = async () => {
    // Basic validation (only validate non-deleted notes)
    const emptyDescIndex = notesList.findIndex(n => n.status !== 'deleted' && !n.description.trim());
    if (emptyDescIndex !== -1) {
      const emptyNote = notesList[emptyDescIndex];
      toast.error(`Please provide a description for the note under "${emptyNote.noteCategory}".`);
      return;
    }

    try {
      setSaving(true);
      const res = await notesService.updateNotesByVesselId(vesselId, notesList);
      if (res.success) {
        toast.success('Vessel notes saved successfully!');
        if (onSaveSuccess) onSaveSuccess();
        onClose();
      } else {
        toast.error(res.message || 'Failed to save notes.');
      }
    } catch (err: any) {
      toast.error('Error saving notes: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Type styling map for visual tags
  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case 'Hull':
        return { background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' };
      case 'Machinery':
        return { background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', border: '1px solid rgba(139, 92, 246, 0.2)' };
      case 'Equipment':
        return { background: 'rgba(249, 115, 22, 0.1)', color: '#f97316', border: '1px solid rgba(249, 115, 22, 0.2)' };
      default:
        return { background: 'var(--bg-subtle)', color: 'var(--muted)', border: '1px solid var(--border)' };
    }
  };

  // Status badge styling map
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'new':
        return { background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' };
      case 'modified':
        return { background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)' };
      case 'deleted':
        return { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' };
      case 'retained':
        return { background: 'var(--border)', color: 'var(--muted)', border: '1px solid var(--border)' };
      default:
        return {};
    }
  };

  // Filter notes to display based on selected category
  const filteredNotes = notesList
    .map((note, originalIndex) => ({ note, originalIndex }))
    .filter(({ note }) => note.noteCategory === selectedCategory);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '24px',
      animation: 'fadeIn 0.2s ease'
    }}>
      <div className="card animate-in" style={{
        maxWidth: '1100px',
        width: '100%',
        maxHeight: '85vh',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        boxShadow: 'var(--shadow-xl)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        padding: 0
      }}>
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '18px 24px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)'
        }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 850, color: 'var(--label)', margin: 0, letterSpacing: '-0.02em' }}>
              Vessel Notes - {vesselName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              fontWeight: 'bold',
              color: 'var(--muted)',
              cursor: 'pointer',
              lineHeight: '1',
              padding: '4px'
            }}
          >
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div style={{
          flex: 1,
          padding: '24px',
          overflowY: 'auto',
          background: 'var(--surface)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '2px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
              <p>Fetching vessel notes...</p>
            </div>
          ) : (
            <>
              {/* Common Category Dropdown at the Top */}
              <div style={{ 
                marginBottom: '20px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                background: 'var(--bg-subtle)',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid var(--border)'
              }}>
                <label className="form-label" htmlFor="modalCategorySelect" style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: 'var(--label)' }}>
                  Note Category:
                </label>
                <select
                  id="modalCategorySelect"
                  className="form-input"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{ width: '260px', padding: '8px 12px', height: 'auto', marginBottom: 0, cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                >
                  <option value="Additional Information">Additional Information</option>
                  <option value="Statutory Conditions">Statutory Conditions</option>
                </select>
              </div>

              {/* Notes Content */}
              {filteredNotes.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center', background: 'var(--bg-subtle)', borderRadius: '12px', border: '1px dashed var(--border)', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.6 }}>📝</div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--label)', marginBottom: '6px' }}>No Notes Under This Category</h4>
                  <p style={{ fontSize: '13px', color: 'var(--muted)', maxWidth: '400px', margin: '0 auto 16px auto', lineHeight: '1.4' }}>
                    There are currently no notes recorded under the "{selectedCategory}" category. Click below to add one.
                  </p>
                  <button type="button" className="btn-primary" onClick={handleAddNote} style={{ marginBottom: 0 }}>
                    + Add Note
                  </button>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', width: '110px' }}>Code</th>
                        <th style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', width: '150px' }}>Type</th>
                        <th style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>Description *</th>
                        <th style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', width: '150px' }}>Due Date</th>
                        <th style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', width: '130px' }}>Status</th>
                        <th style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', width: '80px', textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredNotes.map(({ note, originalIndex }) => {
                        const isDeleted = note.status === 'deleted';
                        return (
                          <tr 
                            key={originalIndex} 
                            style={{ 
                              borderBottom: '1px solid var(--border)',
                              background: isDeleted ? 'rgba(239, 68, 68, 0.03)' : 'transparent',
                              opacity: isDeleted ? 0.6 : 1,
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {/* Code Display */}
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ 
                                fontSize: '12px', 
                                fontFamily: 'monospace', 
                                fontWeight: 700, 
                                color: note.noteCode ? 'var(--primary)' : 'var(--muted)',
                                background: 'var(--bg-subtle)',
                                padding: '3px 6px',
                                borderRadius: '4px',
                                border: '1px solid var(--border)'
                              }}>
                                {note.noteCode || 'PENDING'}
                              </span>
                            </td>

                            {/* Type Selector */}
                            <td style={{ padding: '12px 16px' }}>
                              <select
                                className="form-input"
                                value={note.type}
                                onChange={(e) => handleUpdateField(originalIndex, 'type', e.target.value)}
                                disabled={isDeleted}
                                style={{ padding: '6px 8px', fontSize: '12px', height: 'auto', marginBottom: 0, width: '100%', cursor: 'pointer', ...getTypeBadgeStyle(note.type) }}
                              >
                                <option value="Hull">Hull</option>
                                <option value="Machinery">Machinery</option>
                                <option value="Equipment">Equipment</option>
                              </select>
                            </td>

                            {/* Description Textarea */}
                            <td style={{ padding: '12px 16px' }}>
                              <textarea
                                className="form-input"
                                placeholder="Enter note details..."
                                value={note.description}
                                onChange={(e) => handleUpdateField(originalIndex, 'description', e.target.value)}
                                disabled={isDeleted}
                                style={{ 
                                  padding: '6px 8px', 
                                  fontSize: '12px', 
                                  height: '52px', 
                                  width: '100%', 
                                  resize: 'vertical', 
                                  marginBottom: 0,
                                  lineHeight: '1.4',
                                  textDecoration: isDeleted ? 'line-through' : 'none'
                                }}
                                required
                              />
                            </td>

                            {/* Due Date picker */}
                            <td style={{ padding: '12px 16px' }}>
                              <input
                                type="date"
                                className="form-input"
                                value={note.dueDate || ''}
                                onChange={(e) => handleUpdateField(originalIndex, 'dueDate', e.target.value)}
                                disabled={isDeleted}
                                style={{ padding: '6px 8px', fontSize: '12px', height: 'auto', marginBottom: 0, width: '100%' }}
                              />
                            </td>

                            {/* Status selector */}
                            <td style={{ padding: '12px 16px' }}>
                              <select
                                className="form-input"
                                value={note.status}
                                onChange={(e) => handleUpdateField(originalIndex, 'status', e.target.value)}
                                disabled={isDeleted}
                                style={{ padding: '6px 8px', fontSize: '12px', height: 'auto', marginBottom: 0, width: '100%', cursor: 'pointer', ...getStatusBadgeStyle(note.status) }}
                              >
                                <option value="new">new</option>
                                <option value="modified">modified</option>
                                <option value="retained">retained</option>
                                <option value="deleted">deleted</option>
                              </select>
                            </td>

                            {/* Quick Action Delete / Restore */}
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleDeleteNote(originalIndex)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: isDeleted ? '#10b981' : '#ef4444',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  transition: 'all 0.15s ease'
                                }}
                                className="hover-lift"
                              >
                                {isDeleted ? 'Restore' : 'Delete'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface)'
        }}>
          <div>
            {!loading && filteredNotes.length > 0 && (
              <button
                type="button"
                className="btn-secondary"
                onClick={handleAddNote}
                disabled={saving}
                style={{ marginBottom: 0, padding: '10px 18px', borderRadius: '10px', fontWeight: 600 }}
              >
                + Add Note
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={saving}
              style={{ marginBottom: 0, padding: '10px 20px', borderRadius: '10px' }}
            >
              Cancel
            </button>

            {!loading && notesList.length > 0 && (
              <button
                type="button"
                className="btn-primary"
                onClick={handleSave}
                disabled={saving}
                style={{ marginBottom: 0, padding: '10px 20px', borderRadius: '10px', minWidth: '120px' }}
              >
                {saving ? 'Saving...' : 'Save Notes'}
              </button>
            )}
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}} />
    </div>
  );
}
