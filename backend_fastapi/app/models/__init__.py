"""Models module initialization"""
from .schemas import (
    PatientRegisterRequest,
    PatientLoginRequest,
    VerifyOTPRequest,
    ResendOTPRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    DoctorRegisterRequest,
    DoctorLoginRequest,
    ValidatePMDCRequest,
    PatientProfileSubmit,
    ChatMessageRequest,
    SuccessResponse,
    ErrorResponse,
    LoginResponse,
    OTPResponse
)

__all__ = [
    "PatientRegisterRequest",
    "PatientLoginRequest",
    "VerifyOTPRequest",
    "ResendOTPRequest",
    "ForgotPasswordRequest",
    "ResetPasswordRequest",
    "DoctorRegisterRequest",
    "DoctorLoginRequest",
    "ValidatePMDCRequest",
    "PatientProfileSubmit",
    "ChatMessageRequest",
    "SuccessResponse",
    "ErrorResponse",
    "LoginResponse",
    "OTPResponse"
]
