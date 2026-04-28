from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from datetime import date, time
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# Supabase Setup
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

def get_supabase_client(auth_token: str) -> Client:
    """
    Get a Supabase client with the user's JWT applied so RLS is enforced.
    auth_token is required — all task routes are authenticated.
    Uses postgrest.auth() which is the correct approach for supabase-py v2+.
    """
    client = create_client(url, key)
    token = auth_token.removeprefix("Bearer ").strip()
    # set_auth() was removed in supabase-py v2; postgrest.auth() is the v2+ equivalent
    client.postgrest.auth(token)
    return client

def get_authenticated_user_id(auth_token: str) -> str:
    """
    Resolve the user_id from the provided JWT via Supabase.
    Raises HTTP 401 if the token is missing or invalid.
    """
    if not auth_token:
        raise HTTPException(
            status_code=401,
            detail={"success": False, "error": "Authorization header is required"}
        )
    try:
        client = get_supabase_client(auth_token)
        token = auth_token.removeprefix("Bearer ").strip()
        user_response = client.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=401,
                detail={"success": False, "error": "Invalid or expired token"}
            )
        return user_response.user.id
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail={"success": False, "error": f"Authentication failed: {str(e)}"}
        )

# Task Models
class CreateTaskRequest(BaseModel):
    # user_id is intentionally omitted — it is derived from the JWT, never trusted from the client
    task_title: str
    priority: str
    deadline: Optional[date] = None
    time: Optional[time] = None
    notes: Optional[str] = None
    completed: bool = False

class UpdateTaskRequest(BaseModel):
    task_title: Optional[str] = None
    priority: Optional[str] = None
    deadline: Optional[date] = None
    time: Optional[time] = None
    notes: Optional[str] = None
    completed: Optional[bool] = None

class TaskResponse(BaseModel):
    task_id: str
    user_id: str
    task_title: str
    priority: str
    deadline: Optional[date] = None
    time: Optional[time] = None
    notes: Optional[str] = None
    completed: bool

# Create router
router = APIRouter(prefix="/tasks", tags=["tasks"])

# Task Routes

@router.get("/")
def root():
    return {"status": "Tasks endpoint is working"}

@router.post("/")
async def create_task(data: CreateTaskRequest, authorization: Optional[str] = Header(None)):
    """Create a new task owned by the authenticated user"""
    user_id = get_authenticated_user_id(authorization)
    try:
        supabase = get_supabase_client(authorization)

        response = supabase.table("tasks").insert({
            "user_id": user_id,           # always set from token, never from request body
            "task_title": data.task_title,
            "priority": data.priority,
            "deadline": str(data.deadline) if data.deadline else None,
            "time": str(data.time) if data.time else None,
            "notes": data.notes,
            "completed": data.completed,
        }).execute()

        if not response.data:
            raise Exception("Failed to create task")

        task = response.data[0]

        return {
            "success": True,
            "task": {
                "task_id": task["task_id"],
                "user_id": task["user_id"],
                "task_title": task["task_title"],
                "priority": task["priority"],
                "deadline": task["deadline"],
                "time": task["time"],
                "notes": task["notes"],
                "completed": task["completed"],
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        print(f"ERROR IN Create Task Request: {error_msg}")
        raise HTTPException(
            status_code=400,
            detail={"success": False, "error": error_msg}
        )

@router.get("/by-user/{user_id}")
async def get_user_tasks(user_id: str, authorization: Optional[str] = Header(None)):
    """Get all tasks belonging to the authenticated user.
    The user_id path param is accepted for URL compatibility but intentionally
    ignored — identity is always resolved from the JWT to prevent IDOR.
    """
    user_id = get_authenticated_user_id(authorization)
    try:
        supabase = get_supabase_client(authorization)
        response = supabase.table("tasks").select("*").eq("user_id", user_id).execute()

        return {
            "success": True,
            "tasks": response.data or []
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get user tasks error: {e}")
        raise HTTPException(
            status_code=400,
            detail={"success": False, "error": str(e)}
        )

@router.get("/{task_id}")
async def get_task(task_id: str, authorization: Optional[str] = Header(None)):
    """Get a specific task — only accessible by its owner"""
    user_id = get_authenticated_user_id(authorization)
    try:
        supabase = get_supabase_client(authorization)
        response = (
            supabase.table("tasks")
            .select("*")
            .eq("task_id", task_id)
            .eq("user_id", user_id)   # ownership filter (defense-in-depth alongside RLS)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=404,
                detail={"success": False, "error": "Task not found"}
            )

        task = response.data[0]

        return {
            "success": True,
            "task": {
                "task_id": task["task_id"],
                "user_id": task["user_id"],
                "task_title": task["task_title"],
                "priority": task["priority"],
                "deadline": task["deadline"],
                "time": task["time"],
                "notes": task["notes"],
                "completed": task["completed"],
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get task error: {e}")
        raise HTTPException(
            status_code=400,
            detail={"success": False, "error": str(e)}
        )

@router.put("/{task_id}")
async def update_task(task_id: str, data: UpdateTaskRequest, authorization: Optional[str] = Header(None)):
    """Update a task — only the owner may update it"""
    user_id = get_authenticated_user_id(authorization)
    try:
        supabase = get_supabase_client(authorization)

        # Build update payload with only non-None fields
        update_payload = {}
        if data.task_title is not None:
            update_payload["task_title"] = data.task_title
        if data.priority is not None:
            update_payload["priority"] = data.priority
        if data.deadline is not None:
            update_payload["deadline"] = str(data.deadline)
        if data.time is not None:
            update_payload["time"] = str(data.time)
        if data.notes is not None:
            update_payload["notes"] = data.notes
        if data.completed is not None:
            update_payload["completed"] = data.completed

        if not update_payload:
            raise Exception("No fields to update")

        response = (
            supabase.table("tasks")
            .update(update_payload)
            .eq("task_id", task_id)
            .eq("user_id", user_id)   # ownership filter (defense-in-depth alongside RLS)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=404,
                detail={"success": False, "error": "Task not found"}
            )

        task = response.data[0]

        return {
            "success": True,
            "task": {
                "task_id": task["task_id"],
                "user_id": task["user_id"],
                "task_title": task["task_title"],
                "priority": task["priority"],
                "deadline": task["deadline"],
                "time": task["time"],
                "notes": task["notes"],
                "completed": task["completed"],
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Update task error: {e}")
        raise HTTPException(
            status_code=400,
            detail={"success": False, "error": str(e)}
        )

@router.delete("/{task_id}")
async def delete_task(task_id: str, authorization: Optional[str] = Header(None)):
    """Delete a task — only the owner may delete it"""
    user_id = get_authenticated_user_id(authorization)
    try:
        supabase = get_supabase_client(authorization)
        supabase.table("tasks").delete().eq("task_id", task_id).eq("user_id", user_id).execute()

        return {
            "success": True,
            "message": "Task deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Delete task error: {e}")
        raise HTTPException(
            status_code=400,
            detail={"success": False, "error": str(e)}
        )