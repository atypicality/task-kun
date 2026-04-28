from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# Supabase Setup
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

# Auth Models
class SignUpRequest(BaseModel):
    email: str
    password: str
    display_name: str

class SignInRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    user_id: str
    email: str
    display_name: str
    university: str | None = None
    major: str | None = None

class UpdateUserInfoRequest(BaseModel):
    display_name: Optional[str] = None
    university: Optional[str] = None
    major: Optional[str] = None

class UpdateUserSettingsRequest(BaseModel):
    assistant_voice: Optional[str] = None
    assistant_speaking_speed: Optional[float] = None
    assistant_volume: Optional[int] = None
    auto_voice_feedback: Optional[bool] = None
    default_task_sorting: Optional[str] = None
    interface_theme: Optional[str] = None
    mascot_soul_color: Optional[str] = None


# Create router
router = APIRouter(prefix="/auth", tags=["auth"])


def get_authenticated_user_id(auth_token: Optional[str]) -> str:
    """
    Resolve the user_id from the provided JWT via Supabase.
    Matches the same pattern used in tasks.py — identity is always
    derived from the token, never trusted from the URL.
    """
    if not auth_token:
        raise HTTPException(
            status_code=401,
            detail={"success": False, "error": "Authorization header is required"},
        )
    try:
        token = auth_token.removeprefix("Bearer ").strip()
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=401,
                detail={"success": False, "error": "Invalid or expired token"},
            )
        return user_response.user.id
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail={"success": False, "error": f"Authentication failed: {str(e)}"},
        )


# Auth Routes
@router.post("/signup")
async def signup(data: SignUpRequest):
    """Create a new user account"""
    try:
        auth_response = supabase.auth.sign_up({
            "email": data.email,
            "password": data.password,
        })

        user_id = auth_response.user.id

        supabase.table("Users").insert({
            "user_id": user_id,
            "email": data.email,
            "display_name": data.display_name,
        }).execute()

        supabase.table("User Settings").insert({
            "user_id": user_id,
            "assistant_voice": "Default",
            "assistant_speaking_speed": 1.0,
            "assistant_volume": 100,
            "auto_voice_feedback": True,
            "default_task_sorting": "Deadline",
            "interface_theme": "Light Mode",
            "mascot_soul_color": "task-kun",
        }).execute()

        session_data = None
        if hasattr(auth_response, "session") and auth_response.session:
            session_data = {"access_token": auth_response.session.access_token}

        return {
            "success": True,
            "user": {
                "user_id": user_id,
                "email": data.email,
                "display_name": data.display_name,
            },
            "session": session_data,
        }
    except Exception as e:
        error_msg = str(e)
        print(f"ERROR IN Sign Up Request: {error_msg}")
        error_lower = error_msg.lower()
        if "rate limit" in error_lower or "too many" in error_lower:
            status_code = 429
        elif "already registered" in error_lower or "duplicate" in error_lower:
            status_code = 409
        else:
            status_code = 400
        raise HTTPException(
            status_code=status_code,
            detail={"success": False, "error": error_msg},
        )


@router.post("/signin")
async def signin(data: SignInRequest):
    """Sign in a user"""
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password,
        })

        user_id = auth_response.user.id

        profile_response = (
            supabase.table("Users").select("*").eq("user_id", user_id).execute()
        )

        if not profile_response.data:
            raise HTTPException(
                status_code=404,
                detail={"success": False, "error": "User profile not found"},
            )

        profile = profile_response.data[0]

        settings_response = (
            supabase.table("User Settings").select("*").eq("user_id", user_id).execute()
        )
        settings = settings_response.data[0] if settings_response.data else None

        return {
            "success": True,
            "user": {
                "user_id": user_id,
                "email": profile["email"],
                "display_name": profile["display_name"],
                "university": profile.get("university"),
                "major": profile.get("major"),
            },
            "settings": settings,
            "session": {
                "access_token": auth_response.session.access_token,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Signin error: {e}")
        raise HTTPException(
            status_code=401,
            detail={"success": False, "error": str(e)},
        )


@router.get("/user/{user_id}")
async def get_user(user_id: str):
    """Get user profile and settings"""
    try:
        profile_response = (
            supabase.table("Users").select("*").eq("user_id", user_id).execute()
        )

        if not profile_response.data:
            raise HTTPException(
                status_code=404,
                detail={"success": False, "error": "User not found"},
            )

        profile = profile_response.data[0]

        settings_response = (
            supabase.table("User Settings").select("*").eq("user_id", user_id).execute()
        )
        settings = settings_response.data[0] if settings_response.data else None

        return {
            "success": True,
            "user": profile,
            "settings": settings,
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get user error: {e}")
        raise HTTPException(
            status_code=400,
            detail={"success": False, "error": str(e)},
        )


@router.put("/user/updateInfo/{user_id}")
async def update_user(
    user_id: str,
    data: UpdateUserInfoRequest,
    authorization: Optional[str] = Header(None),
):
    """
    Update display_name, university, and/or major for the authenticated user.
    The user_id path param is accepted for URL compatibility but the identity
    is always resolved from the JWT to prevent IDOR — same pattern as tasks.py.
    """
    # Derive user_id from JWT; ignore the path param entirely
    verified_user_id = get_authenticated_user_id(authorization)
    try:
        update_payload = {}
        if data.display_name is not None:
            update_payload["display_name"] = data.display_name
        if data.university is not None:
            update_payload["university"] = data.university
        if data.major is not None:
            update_payload["major"] = data.major

        if not update_payload:
            raise Exception("No fields to update")

        # BUG FIX: was "users" (lowercase) — must match the actual table name "Users"
        response = (
            supabase.table("Users")
            .update(update_payload)
            .eq("user_id", verified_user_id)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=404,
                detail={"success": False, "error": "User not found"},
            )

        user = response.data[0]

        return {"success": True, "user": user}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Update user information error: {e}")
        raise HTTPException(
            status_code=400,
            detail={"success": False, "error": str(e)},
        )


@router.put("/user/updateSettings/{user_id}")
async def update_user_settings(
    user_id: str,
    data: UpdateUserSettingsRequest,
    authorization: Optional[str] = Header(None),
):
    """
    Update the User Settings row for the authenticated user.
    Accepts any subset of settings fields (partial update).
    Identity is always resolved from the JWT, never from the path param.
    """
    verified_user_id = get_authenticated_user_id(authorization)
    try:
        update_payload = {}
        if data.assistant_voice is not None:
            update_payload["assistant_voice"] = data.assistant_voice
        if data.assistant_speaking_speed is not None:
            update_payload["assistant_speaking_speed"] = data.assistant_speaking_speed
        if data.assistant_volume is not None:
            update_payload["assistant_volume"] = data.assistant_volume
        if data.auto_voice_feedback is not None:
            update_payload["auto_voice_feedback"] = data.auto_voice_feedback
        if data.default_task_sorting is not None:
            update_payload["default_task_sorting"] = data.default_task_sorting
        if data.interface_theme is not None:
            update_payload["interface_theme"] = data.interface_theme
        if data.mascot_soul_color is not None:
            update_payload["mascot_soul_color"] = data.mascot_soul_color

        if not update_payload:
            raise Exception("No settings fields to update")

        response = (
            supabase.table("User Settings")
            .update(update_payload)
            .eq("user_id", verified_user_id)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=404,
                detail={"success": False, "error": "User settings not found"},
            )

        return {"success": True, "settings": response.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Update user settings error: {e}")
        raise HTTPException(
            status_code=400,
            detail={"success": False, "error": str(e)},
        )