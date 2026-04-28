from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from supabase import create_client, Client
 
load_dotenv()
 
# Supabase Setup
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)
 
# Settings Models
class UserSettingsResponse(BaseModel):
    user_id: str
    assistant_voice: str | None = None
    assistant_speaking_speed: float | None = None
    assistant_volume: int | None = None
    auto_voice_feedback: bool | None = None
    default_task_sorting: str | None = None
    interface_theme: str | None = None
    mascot_soul_color: str | None = None
 
class UpdateSettingsRequest(BaseModel):
    """All fields are optional — send only the fields you want to update."""
    assistant_voice: str | None = None
    assistant_speaking_speed: float | None = None
    assistant_volume: int | None = None
    auto_voice_feedback: bool | None = None
    default_task_sorting: str | None = None
    interface_theme: str | None = None
    mascot_soul_color: str | None = None
 
# Create router
router = APIRouter(prefix="/settings", tags=["settings"])
 
 
# -------------------------
# GET /settings/{user_id}
# -------------------------
 
@router.get("/{user_id}")
async def get_settings(user_id: str):
    """Get all settings for a user"""
    try:
        response = supabase.table("User Settings").select("*").eq("user_id", user_id).execute()
 
        if not response.data:
            raise HTTPException(
                status_code=404,
                detail={"success": False, "error": "Settings not found for this user"}
            )
 
        return {
            "success": True,
            "settings": response.data[0],
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get settings error: {e}")
        raise HTTPException(
            status_code=400,
            detail={"success": False, "error": str(e)}
        )
 
 
# -------------------------
# PUT /settings/{user_id}
# Replaces the full settings row.
# -------------------------
 
@router.put("/{user_id}")
async def replace_settings(user_id: str, data: UpdateSettingsRequest):
    """
    Full replacement of user settings.
    Any field left as None will be written as NULL in the database.
    Use PATCH if you only want to update specific fields.
    """
    try:
        # Verify the user exists
        user_check = supabase.table("Users").select("user_id").eq("user_id", user_id).execute()
        if not user_check.data:
            raise HTTPException(
                status_code=404,
                detail={"success": False, "error": "User not found"}
            )
 
        update_payload = {
            "assistant_voice": data.assistant_voice,
            "assistant_speaking_speed": data.assistant_speaking_speed,
            "assistant_volume": data.assistant_volume,
            "auto_voice_feedback": data.auto_voice_feedback,
            "default_task_sorting": data.default_task_sorting,
            "interface_theme": data.interface_theme,
            "mascot_soul_color": data.mascot_soul_color,
        }
 
        response = (
            supabase.table("User Settings")
            .update(update_payload)
            .eq("user_id", user_id)
            .execute()
        )
 
        if not response.data:
            raise HTTPException(
                status_code=404,
                detail={"success": False, "error": "Settings not found for this user"}
            )
 
        return {
            "success": True,
            "settings": response.data[0],
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Replace settings error: {e}")
        raise HTTPException(
            status_code=400,
            detail={"success": False, "error": str(e)}
        )
 
 
# -------------------------
# PATCH /settings/{user_id}
# Updates only the provided fields.
# -------------------------
 
@router.patch("/{user_id}")
async def update_settings(user_id: str, data: UpdateSettingsRequest):
    """
    Partial update of user settings.
    Only fields that are explicitly provided (non-None) will be updated.
    Omitted fields are left unchanged in the database.
    """
    try:
        # Verify the user exists
        user_check = supabase.table("Users").select("user_id").eq("user_id", user_id).execute()
        if not user_check.data:
            raise HTTPException(
                status_code=404,
                detail={"success": False, "error": "User not found"}
            )
 
        # Build payload from only the fields that were explicitly provided
        update_payload = {
            key: value
            for key, value in data.model_dump().items()
            if value is not None
        }
 
        if not update_payload:
            raise HTTPException(
                status_code=400,
                detail={"success": False, "error": "No fields provided to update"}
            )
 
        response = (
            supabase.table("User Settings")
            .update(update_payload)
            .eq("user_id", user_id)
            .execute()
        )
 
        if not response.data:
            raise HTTPException(
                status_code=404,
                detail={"success": False, "error": "Settings not found for this user"}
            )
 
        return {
            "success": True,
            "updated_fields": list(update_payload.keys()),
            "settings": response.data[0],
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Update settings error: {e}")
        raise HTTPException(
            status_code=400,
            detail={"success": False, "error": str(e)}
        )