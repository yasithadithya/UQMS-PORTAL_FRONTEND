import React, { useState, useEffect } from 'react';
import { Plus, RotateCcw, StickyNote, Trash2 } from 'lucide-react';
import { Badge, Button, EmptyState, Field, FormGrid, IconButton, Input, LoadingBlock, Modal, Select, StatusBadge, Tabs, Textarea, type Tone } from '@/ui';
import s from './VesselNotesModal.module.css';
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

export default function VesselNotesModal(props: VesselNotesModalProps) {
  // Mount the dialog only while open, so hooks never run conditionally and notes reload each time.
  if (!props.isOpen || !props.vesselId) return null;
  return <VesselNotesDialog {...props} />;
}

function VesselNotesDialog({
  onClose,
  vesselId,
  vesselName,
  onSaveSuccess
}: VesselNotesModalProps) {

  const [notesList, setNotesList] = useState<ApiNoteItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Additional Information');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

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
      setShowErrors(true);
      setSelectedCategory(emptyNote.noteCategory);
      toast.error(`A note under "${emptyNote.noteCategory}" has no description.`);
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

  // Filter notes to display based on selected category
  const filteredNotes = notesList
    .map((note, originalIndex) => ({ note, originalIndex }))
    .filter(({ note }) => note.noteCategory === selectedCategory);

  const CATEGORIES = ['Additional Information', 'Statutory Conditions'];
  const countIn = (category: string) => notesList.filter(n => n.noteCategory === category && n.status !== 'deleted').length;

  const STATUS_TONE: Record<string, Tone> = { new: 'success', modified: 'warning', deleted: 'danger', retained: 'neutral' };

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!saving}
      size="lg"
      title={`Vessel notes · ${vesselName}`}
      description="Notes appear on the vessel's survey reports. Changes are saved together."
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={saving} disabled={loading || notesList.length === 0}>Save notes</Button>
        </>
      }
    >
      {loading ? (
        <LoadingBlock label="Loading vessel notes…" />
      ) : (
        <>
          <div className={s.toolbar}>
            <Tabs
              variant="segmented"
              label="Note category"
              value={selectedCategory}
              onValueChange={setSelectedCategory}
              items={CATEGORIES.map(c => ({ value: c, label: c, count: countIn(c) }))}
            />
            {filteredNotes.length > 0 && <Button size="sm" icon={<Plus />} onClick={handleAddNote}>Add note</Button>}
          </div>

          {filteredNotes.length === 0 ? (
            <EmptyState
              compact
              icon={<StickyNote />}
              title={`No ${selectedCategory.toLowerCase()} notes`}
              description="Add a note to record it against this vessel."
              action={<Button variant="primary" icon={<Plus />} onClick={handleAddNote}>Add note</Button>}
            />
          ) : (
            <ul className={s.notes}>
              {filteredNotes.map(({ note, originalIndex }) => {
                const isDeleted = note.status === 'deleted';
                return (
                  <li key={originalIndex} className={`${s.note} ${isDeleted ? s.noteDeleted : ''}`}>
                    <div className={s.noteHeader}>
                      <Badge tone={note.noteCode ? 'accent' : 'neutral'} className={s.code}>{note.noteCode || 'New note'}</Badge>
                      <StatusBadge status={note.status} tone={STATUS_TONE[note.status]} />
                      <span className={s.spacer} />
                      {isDeleted ? (
                        <Button size="sm" variant="ghost" icon={<RotateCcw />} onClick={() => handleDeleteNote(originalIndex)}>Restore</Button>
                      ) : (
                        <IconButton size="sm" variant="dangerGhost" icon={<Trash2 />}
                          label={note.noteCode ? `Delete note ${note.noteCode}` : 'Remove note'}
                          onClick={() => handleDeleteNote(originalIndex)} />
                      )}
                    </div>
                    <FormGrid columns={3}>
                      <Field label="Type">
                        <Select value={note.type} disabled={isDeleted} onChange={e => handleUpdateField(originalIndex, 'type', e.target.value)}>
                          <option value="Hull">Hull</option>
                          <option value="Machinery">Machinery</option>
                          <option value="Equipment">Equipment</option>
                        </Select>
                      </Field>
                      <Field label="Due date">
                        <Input type="date" value={note.dueDate || ''} disabled={isDeleted} onChange={e => handleUpdateField(originalIndex, 'dueDate', e.target.value)} />
                      </Field>
                      <Field label="Status">
                        <Select value={note.status} disabled={isDeleted} onChange={e => handleUpdateField(originalIndex, 'status', e.target.value)}>
                          <option value="new">New</option>
                          <option value="modified">Modified</option>
                          <option value="retained">Retained</option>
                          <option value="deleted">Deleted</option>
                        </Select>
                      </Field>
                      <Field label="Description" required full error={!isDeleted && showErrors && !note.description.trim() ? 'Enter the note details.' : undefined}>
                        <Textarea rows={2} placeholder="Note details…" value={note.description} disabled={isDeleted}
                          onChange={e => handleUpdateField(originalIndex, 'description', e.target.value)} />
                      </Field>
                    </FormGrid>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </Modal>
  );
}
