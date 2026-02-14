"""Pydantic models for request/response validation"""
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime
import re

# ============= Patient Models =============

class PatientRegisterRequest(BaseModel):
    full_name: str = Field(..., alias="fullName", min_length=2)
    email: EmailStr
    password: str = Field(..., min_length=8)
    gender: str
    city: str
    
    @validator('password')
    def validate_password(cls, v):
        if not re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$', v):
            raise ValueError('Password must be at least 8 characters and include uppercase, lowercase, number and special character')
        return v
    
    @validator('gender')
    def validate_gender(cls, v):
        if v.lower() not in ['male', 'female', 'other']:
            raise ValueError('Gender must be male, female, or other')
        return v.lower()
    
    class Config:
        populate_by_name = True

class PatientLoginRequest(BaseModel):
    email: EmailStr
    password: str

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)

class ResendOTPRequest(BaseModel):
    email: EmailStr

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., alias="newPassword", min_length=8)
    
    @validator('new_password')
    def validate_password(cls, v):
        if not re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$', v):
            raise ValueError('Password must be at least 8 characters and include uppercase, lowercase, number and special character')
        return v
    
    class Config:
        populate_by_name = True

# ============= Doctor Models =============

class ValidatePMDCRequest(BaseModel):
    pmdc_number: str = Field(..., alias="pmdcNumber")
    full_name: Optional[str] = Field(None, alias="fullName")
    
    class Config:
        populate_by_name = True

class DoctorRegisterRequest(BaseModel):
    full_name: str = Field(..., alias="fullName", min_length=2)
    email: EmailStr
    password: str = Field(..., min_length=8)
    pmdc_number: str = Field(..., alias="pmdcNumber")
    cnic_number: str = Field(..., alias="cnicNumber")
    
    @validator('password')
    def validate_password(cls, v):
        if not re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$', v):
            raise ValueError('Password must be at least 8 characters and include uppercase, lowercase, number and special character')
        return v
    
    class Config:
        populate_by_name = True

class DoctorLoginRequest(BaseModel):
    email: EmailStr
    password: str

# ============= Patient Profile Models =============

class PatientProfileSubmit(BaseModel):
    email: EmailStr
    full_name: str = Field(..., alias="fullName")
    age: int
    gender: str
    symptoms: str
    duration: str
    disease_type: str = Field(..., alias="diseaseType")
    severity: str
    xray_filename: Optional[str] = Field(None, alias="xrayFilename")
    diagnosis: Optional[str] = None
    recommendations: Optional[str] = None
    
    class Config:
        populate_by_name = True

# ============= Chat Models =============

class ChatMessageRequest(BaseModel):
    message: str
    sessionId: Optional[str] = None
    session_id: Optional[str] = None
    reportContext: Optional[str] = None
    
    class Config:
        populate_by_name = True
        extra = "allow"  # Allow extra fields

# ============= Response Models =============

class SuccessResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None

class ErrorResponse(BaseModel):
    success: bool = False
    message: str
    errors: Optional[List[dict]] = None

class LoginResponse(BaseModel):
    success: bool
    message: str
    user: Optional[dict] = None
    doctor: Optional[dict] = None

class OTPResponse(BaseModel):
    success: bool
    message: str
    email: str
