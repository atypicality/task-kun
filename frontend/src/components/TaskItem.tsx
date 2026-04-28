import { useState } from 'react';
import './TaskItem.css';

interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;

  dueDate: string;
  dueTime: string; // default 23:59
}

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}

export function TaskItem({ task, onToggle, onDelete, onEdit }: TaskItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#ff6b6b';
      case 'medium':
        return '#ffbe0b';
      case 'low':
        return '#00ff88';
      default:
        return '#b8c5d6';
    }
  };

  const dueLabel = `📅 Due: ${task.dueDate}${task.dueTime ? ` ${task.dueTime}` : ''}`;

  return (
    <div
      className={`task-item ${task.completed ? 'completed' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="task-checkbox">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggle(task.id)}
          className="checkbox"
        />
      </div>

      <div className="task-content">
        <div className="task-header">
          <h3 className="task-title">{task.title}</h3>
          <span className="priority-badge" style={{ backgroundColor: getPriorityColor(task.priority) }}>
            {task.priority}
          </span>
        </div>

        {task.description && <p className="task-description">{task.description}</p>}
        <p className="task-description">{dueLabel}</p>
      </div>

      {isHovered && (
        <div className="task-actions">
          <button className="action-btn edit-btn" onClick={() => onEdit(task)} title="Edit task">
            ✏️
          </button>
          <button className="action-btn delete-btn" onClick={() => onDelete(task.id)} title="Delete task">
            🗑️
          </button>
        </div>
      )}
    </div>
  );
}