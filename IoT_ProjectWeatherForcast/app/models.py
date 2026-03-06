from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class User(BaseModel):
    """User model for Firebase"""
    email: str = Field(..., description="User email")
    role: str = Field(default="visitor",
                      description="User role (admin/visitor)")
    uid: Optional[str] = Field(None, description="Firebase UID")
    created_at: Optional[str] = Field(
        None, description="Account creation timestamp")


class UserInDB(User):
    """User as stored in Firestore"""
    uid: str


class UserRegisterRequest(BaseModel):
    """Registration request"""
    email: str = Field(..., description="User email")
    password: str = Field(..., min_length=6,
                          description="Password (min 6 characters)")


class UserLoginRequest(BaseModel):
    """Login request"""
    email: str = Field(..., description="User email")
    password: str = Field(..., description="User password")
