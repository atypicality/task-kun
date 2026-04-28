const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

/**
 * Get the auth token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('token');
}

/**
 * Get common headers with auth token
 */
function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

export interface Task {
  task_id?: string;
  user_id: string;
  task_title: string;
  priority: 'low' | 'medium' | 'high';
  deadline?: string;
  time?: string;
  notes?: string;
  completed: boolean;
}

export interface TaskResponse {
  task_id: string;
  user_id: string;
  task_title: string;
  priority: string;
  deadline?: string;
  time?: string;
  notes?: string;
  completed: boolean;
}

/**
 * Create a new task in Supabase
 */
export async function createTask(task: Task): Promise<TaskResponse> {
  // Ensure time format is HH:MM:SS for Pydantic time type
  const formatTime = (timeStr?: string): string | undefined => {
    if (!timeStr) return undefined;
    // If time is in HH:MM format, convert to HH:MM:SS
    if (timeStr.match(/^\d{2}:\d{2}$/)) {
      return `${timeStr}:00`;
    }
    return timeStr;
  };

  const payload: any = {
    user_id: task.user_id,
    task_title: task.task_title,
    priority: task.priority,
    deadline: task.deadline || null,
    notes: task.notes || null,
    completed: task.completed,
  };

  // Only include time if provided
  if (task.time) {
    payload.time = formatTime(task.time);
  }

  console.log("Creating task with payload:", payload);

  const response = await fetch(`${BACKEND_URL}/tasks/`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Task creation error details:", errorData);
    throw new Error(errorData.detail?.error || JSON.stringify(errorData));
  }

  const data = await response.json();
  return data.task;
}

/**
 * Get all tasks for a user from Supabase
 */
export async function getUserTasks(userId: string): Promise<TaskResponse[]> {
  const response = await fetch(`${BACKEND_URL}/tasks/by-user/${userId}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail?.error || 'Failed to fetch tasks');
  }

  const data = await response.json();
  return data.tasks;
}

/**
 * Get a specific task by ID
 */
export async function getTask(taskId: string): Promise<TaskResponse> {
  const response = await fetch(`${BACKEND_URL}/tasks/${taskId}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail?.error || 'Failed to fetch task');
  }

  const data = await response.json();
  return data.task;
}

/**
 * Update a task in Supabase
 */
export async function updateTask(
  taskId: string,
  updates: Partial<Omit<Task, 'user_id' | 'task_id'>>
): Promise<TaskResponse> {
  // Ensure time format is HH:MM:SS for Pydantic time type
  const formatTime = (timeStr?: string): string | undefined => {
    if (!timeStr) return undefined;
    // If time is in HH:MM format, convert to HH:MM:SS
    if (timeStr.match(/^\d{2}:\d{2}$/)) {
      return `${timeStr}:00`;
    }
    return timeStr;
  };

  const payload: any = {
    task_title: updates.task_title,
    priority: updates.priority,
    deadline: updates.deadline,
    notes: updates.notes,
    completed: updates.completed,
  };

  // Only include time if provided
  if (updates.time) {
    payload.time = formatTime(updates.time);
  }

  console.log("Updating task with payload:", payload);

  const response = await fetch(`${BACKEND_URL}/tasks/${taskId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail?.error || 'Failed to update task');
  }

  const data = await response.json();
  return data.task;
}

/**
 * Delete a task from Supabase
 */
export async function deleteTask(taskId: string): Promise<void> {
  const response = await fetch(`${BACKEND_URL}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail?.error || 'Failed to delete task');
  }
}
