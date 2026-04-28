import { useEffect, useState } from 'react';
import './AddTask.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://task-kun-s9rt.onrender.com';

async function generateTaskWithAI(): Promise<{ title: string; description: string; priority: 'low' | 'medium' | 'high'; daysFromNow: number } | null> {
  const prompt = `You are helping a student use a task manager. Generate one realistic, specific student task. Return ONLY valid JSON with these exact fields:
{
  "title": "short task title (max 60 chars)",
  "description": "2-3 sentence description of what needs to be done",
  "priority": "low" or "medium" or "high",
  "daysFromNow": a number 1-14
}
Be creative and varied — could be any subject, assignment type, or student activity.`;

  try {
    const res = await fetch(`${BACKEND_URL}/generate-gemini`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: prompt }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data.response as string;
    // strip markdown code fences if present
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    if (typeof parsed.title === 'string' && typeof parsed.priority === 'string') return parsed;
    return null;
  } catch {
    return null;
  }
}

interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  dueDate: string;
  dueTime: string;
}

interface AddTaskProps {
  onAdd: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  editingTask?: Task | null;
  onEditComplete?: () => void;
  onUpdate?: (task: Task) => void;

  inModal?: boolean;
  onCloseModal?: () => void;
}

export function AddTask({
  onAdd,
  editingTask,
  onEditComplete,
  onUpdate,
  inModal = false,
  onCloseModal,
}: AddTaskProps) {
  const [title, setTitle] = useState(editingTask?.title || '');
  const [description, setDescription] = useState(editingTask?.description || '');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(editingTask?.priority || 'medium');

  const [dueDate, setDueDate] = useState<string>(editingTask?.dueDate || '');
  const [dueTime, setDueTime] = useState<string>(editingTask?.dueTime || '23:59');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    setTitle(editingTask?.title || '');
    setDescription(editingTask?.description || '');
    setPriority(editingTask?.priority || 'medium');
    setDueDate(editingTask?.dueDate || '');
    setDueTime(editingTask?.dueTime || '23:59');
  }, [editingTask]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('Please enter a task title');
      return;
    }
    if (!dueDate) {
      alert('Please select a due date');
      return;
    }

    const finalDueTime = dueTime?.trim() ? dueTime : '23:59';

    if (editingTask && onUpdate) {
      onUpdate({
        ...editingTask,
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate,
        dueTime: finalDueTime,
      });
      onEditComplete?.();
    } else {
      onAdd({
        title: title.trim(),
        description: description.trim(),
        completed: false,
        priority,
        dueDate,
        dueTime: finalDueTime,
      });
    }

    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueDate('');
    setDueTime('23:59');

    if (inModal) onCloseModal?.();
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const result = await generateTaskWithAI();
    if (result) {
      setTitle(result.title);
      setDescription(result.description);
      setPriority(result.priority);
      const d = new Date();
      d.setDate(d.getDate() + (result.daysFromNow ?? 7));
      setDueDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
    setGenerating(false);
  };

  const handleCancel = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueDate('');
    setDueTime('23:59');
    onEditComplete?.();
    if (inModal) onCloseModal?.();
  };

  return (
    <form id="addTaskForm" className={`add-task-form ${inModal ? "modal-form" : ""}`} onSubmit={handleSubmit}>
      {!editingTask && (
        <button
          type="button"
          className={`at-generate-btn ${generating ? 'loading' : ''}`}
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <><span className="at-dots"><span /><span /><span /></span> Generating…</>
          ) : (
            <>Generate a task for me</>
          )}
        </button>
      )}

      <div className="form-group">
        <label htmlFor="title">Task Title</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Research Paper on Cognitive Bias"
          maxLength={100}
        />
      </div>

      <div className="form-group">
        <label htmlFor="priority">Priority</label>
        <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className="priority-select">
          <option value="low">🟢 Low</option>
          <option value="medium">🟡 Medium</option>
          <option value="high">🔴 High</option>
        </select>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="dueDate">Deadline</label>
          <input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="dueTime">
            Time <span className="optional">(defaults to 11:59 PM)</span>
          </label>
          <input
            id="dueTime"
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="description">Additional Notes</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What needs to be done? Add steps, links, or context..."
          rows={4}
          maxLength={500}
        />
      </div>

      {/* Hide internal buttons when in modal - modal footer controls save/cancel */}
      {!inModal && (
        <div className="form-actions">
          <button type="submit" className="btn-submit">
            {editingTask ? '💾 Update Task' : '✨ Add Task'}
          </button>

          {editingTask && (
            <button type="button" className="btn-cancel" onClick={handleCancel}>
              ❌ Cancel
            </button>
          )}
        </div>
      )}
    </form>
  );
}