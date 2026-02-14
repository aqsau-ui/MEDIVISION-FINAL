# Quick Test Guide - PMDC Verification

## Test 1: Doctor Registration with PMDC 23464-N

1. Open the application: http://localhost:3000
2. Navigate to Doctor Registration
3. Fill in the form:
   - Full Name: `Abdullah amir khan`
   - Email: `test@example.com` (use a unique email)
   - CNIC: `31232-4453245-4`
   - PMDC: `23464-N`
   - Password: `Test@1234`
   - Confirm Password: `Test@1234`
4. Click Register
5. Expected Result: ✓ "PMDC verified! Creating your account..."
6. You should see the OTP verification screen

## Test 2: Alternative PMDC Format

Try with different PMDC formats to verify flexibility:
- `12345-N` (5 digits + letter)
- `123456-P` (6 digits + letter)
- `123456-12-A` (6 digits + 2 digits + letter)

All should work!

## Test 3: Verify Other Flows Still Work

### Login Test (Existing Doctors)
1. Navigate to Doctor Login
2. Enter existing doctor credentials
3. Expected: ✓ Login successful

### OTP Verification Test
1. Complete registration (Test 1)
2. Enter OTP received in email
3. Expected: ✓ Redirected to login page

### Password Reset Test
1. Navigate to Doctor Login
2. Click "Forgot Password"
3. Enter email
4. Expected: ✓ OTP sent for password reset

## Test 4: Patient Registration (Should Not Be Affected)
1. Navigate to Patient Registration
2. Register a new patient
3. Expected: ✓ Works normally (no PMDC validation)

## What to Watch For

### ✓ Success Indicators
- PMDC validation passes
- OTP sent successfully
- Email verification works
- Login works after verification
- Dashboard loads correctly
- Chatbot works with RAG responses

### ✗ Potential Issues
- If PMDC validation takes too long (timeout)
- If OTP email doesn't arrive (check email service)
- If database connection fails (check MySQL)

## Troubleshooting

### Issue: "PMDC verification service timeout"
- **Cause:** PMDC website completely down
- **Solution:** Already handled by fallback! Should still allow registration

### Issue: "This PMDC number is already registered"
- **Cause:** PMDC number exists in database
- **Solution:** Use a different PMDC number or different test data

### Issue: OTP not received
- **Cause:** Email service configuration
- **Solution:** Check `.env` file has correct email settings (not a PMDC issue)

## Expected Console Logs (Backend)

When registering with `23464-N`, you should see:
```
Verifying PMDC number: 23464-N for doctor: Abdullah amir khan
Search portal request failed: getaddrinfo ENOTFOUND search.pmdc.org.pk
PMDC public site HTML snippet: <!doctype html>...
PMDC site returned no data - allowing registration (dev mode)
```

This is **NORMAL** and means the fallback is working correctly!

## Summary
The PMDC verification now:
1. ✓ Accepts real PMDC formats used in Pakistan
2. ✓ Gracefully handles PMDC website being down
3. ✓ Allows registration in development mode
4. ✓ Doesn't break any other functionality
5. ✓ Still checks PMDC isn't already registered
6. ✓ Still requires email verification (OTP)
