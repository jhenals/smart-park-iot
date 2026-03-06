import os
import time
from datetime import datetime, timedelta

import requests
from fastapi import APIRouter, Depends, HTTPException, Request, Response, Security, status
from fastapi.security import HTTPBearer, OAuth2PasswordBearer, OAuth2PasswordRequestForm
from firebase_admin import auth as firebase_auth
from pydantic import BaseModel

from app.database import get_firestore_db, init_firebase
from app.models import UserLoginRequest, UserRegisterRequest


router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer()

# OAuth2 scheme for Swagger UI
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

# Firebase-only configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours
SESSION_COOKIE_NAME = os.getenv("SESSION_COOKIE_NAME", "session")
SESSION_EXPIRE_DAYS = int(os.getenv("SESSION_EXPIRE_DAYS", "5"))
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"


def get_db():
    return get_firestore_db()


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_role: str


class MessageResponse(BaseModel):
    message: str


class RegisterResponse(BaseModel):
    uid: str
    email: str
    message: str


class SessionLoginRequest(BaseModel):
    id_token: str


class SessionStatusResponse(BaseModel):
    uid: str
    email: str
    role: str


def _get_admin_user(uid: str) -> dict:
    print(f"Fetching user data for UID: {uid}")
    user_doc = get_db().collection("users").document(uid).get()

    if not user_doc.exists():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin user not found in database",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_data = user_doc.to_dict()

    # Allow both admin and visitor roles for session creation
    if user_data.get("role") not in ["admin", "visitor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid user role. Only admin and visitor roles are accepted."
        )

    return {
        "uid": uid,
        "role": user_data.get("role"),
        "email": user_data.get("email")
    }


def get_firebase_admin_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    FIREBASE ADMIN ONLY AUTHENTICATION
    Validates Firebase ID token and enforces admin role from Firestore.

    Used as a dependency for all admin-protected endpoints.
    """
    try:
        init_firebase()
        # Verify Firebase ID token
        decoded_token = firebase_auth.verify_id_token(token)
        uid = decoded_token.get("uid")

        return _get_admin_user(uid)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Firebase token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e


def get_admin_session_user(request: Request) -> dict:
    """Verify user from Authorization Bearer token."""
    init_firebase()
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        try:
            decoded_token = firebase_auth.verify_id_token(token)
            uid = decoded_token.get("uid")
            return _get_admin_user(uid)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            ) from e

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing authorization header",
        headers={"WWW-Authenticate": "Bearer"},
    )


# Shared login logic to avoid code duplication
def _authenticate_firebase_user(email: str, password: str) -> TokenResponse:
    """
    Shared Firebase authentication logic.
    Verifies credentials and enforces admin role.
    """
    try:
        user = firebase_auth.get_user_by_email(email)
        uid = user.uid

        # Verify password using Firebase REST API
        api_key = os.getenv("FIREBASE_API_KEY")

        response = requests.post(
            f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}",
            json={
                "email": email,
                "password": password,
                "returnSecureToken": True
            },
            timeout=10
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        data = response.json()
        access_token = data.get("idToken")

        # Get user role from Firestore and ENFORCE admin role
        user_doc = get_db().collection("users").document(uid).get()

        if not user_doc.exists():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User not found in admin database"
            )

        user_data = user_doc.to_dict()
        user_role = user_data.get("role", "visitor")

        # Strict admin enforcement
        if user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Firebase admin users can access this API. Your account does not have admin privileges."
            )

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user_role=user_role
        )

    except HTTPException:
        raise
    except firebase_auth.UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Firebase email not registered"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Login failed: {str(e)}"
        ) from e


@router.post("/login/firebase", response_model=TokenResponse)
def login_firebase(req: UserLoginRequest):
    """
    Firebase Admin Login Endpoint (JSON)

    Login with Firebase email and password. User MUST have admin role in Firestore.
    Returns access token to use in protected endpoints.

    Steps:
    1. Enter your Firebase admin email and password
    2. You'll receive an access_token
    3. Use this token as: Authorization: Bearer <access_token>
    4. All protected endpoints will validate your admin role in Firebase
    """
    return _authenticate_firebase_user(req.email, req.password)


@router.get("/session-status", response_model=SessionStatusResponse)
def session_status(request: Request):
    """Get current user info from Bearer token."""
    admin_user = get_admin_session_user(request)
    return SessionStatusResponse(
        uid=admin_user["uid"],
        email=admin_user.get("email", ""),
        role=admin_user["role"],
    )


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(req: UserRegisterRequest):
    """
    Firebase User Registration Endpoint

    Register a new user account in Firebase.

    - **email**: User's email (must be unique)
    - **password**: Password (minimum 6 characters)

    Steps:
    1. Provide email and password. Display name will be derived automatically from email.
    2. User will be created in Firebase Authentication
    3. User profile stored in Firestore with 'visitor' role
    """
    try:
        # Check if email already exists in Firebase
        try:
            existing_user = firebase_auth.get_user_by_email(req.email)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        except firebase_auth.UserNotFoundError:
            # This is expected - user should not exist
            pass

        user = firebase_auth.create_user(
            email=req.email,
            password=req.password,
            display_name=req.email.split("@")[0]
        )

        # Store user data in Firestore
        db = get_db()
        user_data = {
            "uid": user.uid,
            "email": req.email,
            "display_name": req.email.split("@")[0],
            "role": "visitor",  # Default role for new users
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        db.collection("users").document(user.uid).set(user_data)

        return {
            "uid": user.uid,
            "email": req.email,
            "message": "User registered successfully. You can now login."
        }

    except HTTPException:
        raise
    except firebase_auth.EmailAlreadyExistsError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


@router.post("/token", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    OAuth2 Login Endpoint for Swagger UI (Form Data)

    This endpoint enables the Swagger UI 'Authorize' button.

    - Enter your Firebase email in the 'username' field
    - Enter your password in the 'password' field
    - User MUST have 'admin' role in Firestore to access protected endpoints

    The token will be automatically used by Swagger UI for all authenticated requests.
    """
    # OAuth2 form uses 'username' field, but we expect email
    return _authenticate_firebase_user(form_data.username, form_data.password)
