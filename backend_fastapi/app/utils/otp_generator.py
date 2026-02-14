"""OTP Generation and Validation Utilities"""
import random
import time
from typing import Dict, Tuple
from datetime import datetime, timedelta

def generate_otp() -> str:
    """Generate a 6-digit numeric OTP"""
    return str(random.randint(100000, 999999))

def create_otp(expiry_minutes: int = 5) -> Dict:
    """
    Create OTP data with expiry timestamp
    
    Args:
        expiry_minutes: Minutes until OTP expires (default: 5)
    
    Returns:
        Dictionary containing OTP, timestamps, and expiry info
    """
    otp = generate_otp()
    created_at = int(time.time() * 1000)  # milliseconds
    expires_at = created_at + (expiry_minutes * 60 * 1000)
    
    return {
        "otp": otp,
        "created_at": created_at,
        "expires_at": expires_at,
        "expiry_minutes": expiry_minutes
    }

def is_otp_valid(expires_at: int) -> bool:
    """
    Check if OTP is still valid (not expired)
    
    Args:
        expires_at: Expiry timestamp in milliseconds
    
    Returns:
        True if OTP is still valid
    """
    return int(time.time() * 1000) < expires_at

def validate_otp(input_otp: str, stored_otp: str, expires_at: int) -> Dict:
    """
    Validate if OTP matches and is still valid
    
    Args:
        input_otp: OTP entered by user
        stored_otp: OTP stored in database
        expires_at: Expiry timestamp in milliseconds
    
    Returns:
        Validation result with success flag and message
    """
    # Convert both to strings and strip whitespace
    input_otp_str = str(input_otp).strip()
    stored_otp_str = str(stored_otp).strip()
    
    # Check if OTP has expired
    if not is_otp_valid(expires_at):
        return {
            "success": False,
            "message": "OTP has expired. Please request a new one."
        }
    
    # Check if OTP matches
    if input_otp_str != stored_otp_str:
        return {
            "success": False,
            "message": f"Invalid OTP. Please check and try again. (Expected length: {len(stored_otp_str)}, got: {len(input_otp_str)})"
        }
    
    return {
        "success": True,
        "message": "OTP verified successfully."
    }

def check_resend_cooldown(last_sent_at: int, cooldown_seconds: int = 30) -> Dict:
    """
    Check if resend cooldown period has passed
    
    Args:
        last_sent_at: Timestamp when OTP was last sent (milliseconds)
        cooldown_seconds: Cooldown period in seconds (default: 30)
    
    Returns:
        Dictionary with canResend flag and remaining seconds
    """
    now = int(time.time() * 1000)
    time_since_last_sent = now - last_sent_at
    cooldown_ms = cooldown_seconds * 1000
    
    if time_since_last_sent < cooldown_ms:
        remaining_seconds = int((cooldown_ms - time_since_last_sent) / 1000) + 1
        return {
            "can_resend": False,
            "remaining_seconds": remaining_seconds,
            "message": f"Please wait {remaining_seconds} seconds before requesting a new OTP."
        }
    
    return {
        "can_resend": True,
        "remaining_seconds": 0,
        "message": "You can request a new OTP."
    }

def get_remaining_time(expires_at: int) -> int:
    """
    Get remaining time until OTP expires
    
    Args:
        expires_at: Expiry timestamp in milliseconds
    
    Returns:
        Remaining seconds (0 if expired)
    """
    now = int(time.time() * 1000)
    remaining_ms = expires_at - now
    
    if remaining_ms <= 0:
        return 0
    
    return int(remaining_ms / 1000)
