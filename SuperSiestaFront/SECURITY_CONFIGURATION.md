/**
 * Security Configuration Guide
 * 
 * This document provides security recommendations and setup instructions
 * for the Super Siesta Authentication System
 */

# Security Configuration Guide

## Overview

This authentication system implements multiple security layers to protect user accounts and data:

1. **Client-Side Security**
2. **Server-Side Security** 
3. **Data Protection**
4. **Session Management**

---

## 1. Client-Side Security

### Password Validation

- **Minimum 8 characters** with complexity requirements:
  - At least one uppercase letter (A-Z)
  - At least one lowercase letter (a-z)
  - At least one digit (0-9)
  - At least one special character (!@#$%^&*, etc.)

**File:** `src/lib/validators.ts`

```typescript
// Example usage
import { validatePasswordStrength } from '@/lib/validators'

const validation = validatePasswordStrength(userPassword)
if (!validation.isValid) {
  console.log(validation.feedback) // Show requirements to user
}
```

### Input Validation

All form inputs are validated before submission:

- **Email:** RFC 5322 compliant format, max 255 characters
- **Full Name:** 3-255 characters, letters/spaces/hyphens only
- **Phone:** Optional, 6+ digits when provided
- **Password Confirmation:** Must match password exactly

### Rate Limiting

Client-side rate limiting prevents brute force attacks:

- **Max 5 attempts per email** within 15-minute window
- Applies to both login and registration
- Automatically resets on successful authentication

**File:** `src/lib/validators.ts` - `checkRateLimit()` function

### CSRF Protection

Cross-Site Request Forgery protection:

- Frontend fetches CSRF token from backend before auth requests
- Token included in `X-CSRF-Token` header
- Token stored in localStorage (requires backend support)

---

## 2. Server-Side Security Requirements

### CSRF Token Endpoint

The backend SHOULD implement:

```php
// Laravel example
Route::get('/api/csrf-token', function () {
    return response()->json([
        'csrf_token' => csrf_token()
    ]);
});
```

### Rate Limiting

```php
// In routes/api.php
Route::middleware('throttle:5,15')->group(function () {
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/register', [AuthController::class, 'register']);
});
```

### Password Hashing

Ensure passwords are ALWAYS hashed with bcrypt:

```php
// Correct
$user->password = Hash::make($password); // Uses bcrypt

// Wrong - Never do this
$user->password = md5($password);      // Never! Use hash_password
```

### Session Timeout

Implement server-side session timeout:

```php
// config/session.php
'lifetime' => 30, // 30 minutes
'expire_on_close' => true,
```

### HTTPS Only

- **Production:** Force HTTPS in `.env`
- **Staging:** Use HTTPS
- **Development:** Can use HTTP locally

```php
// config/app.php
'url' => env('APP_URL', 'https://api.supersiesta.com'),
'force_https' => true,
```

### CORS Configuration

Restrict API access to your frontend:

```php
// config/cors.php
'allowed_origins' => [
    'https://supersiesta.com',
    'https://app.supersiesta.com',
],
'allow_credentials' => true,
'max_age' => 3600,
```

### Secure Headers

Add security headers:

```php
// Middleware
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Strict-Transport-Security: max-age=31536000');
```

---

## 3. Data Protection

### Token Storage

**Current approach:** Tokens stored in `localStorage`

**Risks:**
- Vulnerable to XSS attacks
- Persists across browser sessions

**Recommended improvement:**
- Use HttpOnly cookies with `Secure` and `SameSite` flags
- Requires backend to set cookies instead of returning tokens

**Implementation (Backend):**

```php
// After successful login
return response()->json([
    'success' => true,
    'user' => $user
])->cookie(
    'auth_token',
    $token,
    minutes: 30,
    path: '/',
    domain: '.supersiesta.com',
    secure: true,
    httpOnly: true,
    sameSite: 'Lax'
);
```

### Refresh Token Mechanism

Current system uses single-token approach. For production, consider:

1. **Short-lived Access Tokens** (15 minutes)
2. **Long-lived Refresh Tokens** (7 days)

```typescript
// Example implementation
const { accessToken, refreshToken } = await login(email, password)
localStorage.setItem('refresh_token', refreshToken)
// Store access token in memory or httpOnly cookie
```

---

## 4. Session Management

### Auto-logout on Inactivity

Frontend automatically logs out users after 30 minutes of inactivity:

```typescript
// In useAuthSecure.tsx
const SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

// Activity tracked on: mousemove, keypress, click
```

### Concurrent Session Prevention

Backend should prevent multiple concurrent logins:

```php
// Revoke previous tokens when user logs in again
$user->tokens()->delete();
$token = $user->createToken('auth_token')->plainTextToken;
```

---

## 5. Implementation Checklist

### Backend Setup

- [ ] Implement `GET /api/csrf-token` endpoint
- [ ] Add rate limiting middleware to auth routes
- [ ] Configure CORS with specific allowed origins
- [ ] Enable HTTPS and secure headers
- [ ] Set session timeout to 30 minutes
- [ ] Implement password reset functionality
- [ ] Add email verification (optional but recommended)
- [ ] Log authentication attempts for security monitoring
- [ ] Implement account lockout after failed attempts
- [ ] Add 2FA support (optional, for advanced security)

### Frontend

- [x] Password strength validator
- [x] Input validation for all fields
- [x] Client-side rate limiting
- [x] CSRF token integration
- [x] Auto-logout on inactivity
- [x] Secure error handling
- [x] Password confirmation on registration
- [ ] Remember me functionality (if needed)
- [ ] Login history/sessions view (if needed)
- [ ] 2FA setup page (if needed)

### Testing

- [ ] Test rate limiting with rapid requests
- [ ] Test password validation with weak passwords
- [ ] Test session timeout after inactivity
- [ ] Test CSRF protection with invalid tokens
- [ ] Test concurrent logins
- [ ] Test password reset flow
- [ ] Load test authentication endpoints

---

## 6. Environmental Variables

### Frontend (.env.local)

```bash
VITE_API_URL=https://api.supersiesta.com
VITE_ENABLE_RATE_LIMIT=true
VITE_SESSION_TIMEOUT=1800000  # 30 minutes in milliseconds
```

### Backend (.env)

```bash
APP_URL=https://api.supersiesta.com
APP_DEBUG=false  # Never true in production
SESSION_LIFETIME=30
SESSION_EXPIRE_ON_CLOSE=true

# Add password reset timeout
RESET_TOKEN_TIMEOUT=3600  # 1 hour

# Add 2FA (optional)
ENABLE_2FA=false
```

---

## 7. Monitoring & Logging

### Failed Login Attempts

Log all authentication failures:

```php
\Log::warning('Failed login attempt', [
    'email' => $email,
    'ip' => request()->ip(),
    'timestamp' => now()
]);
```

### Suspicious Activity

Alert administrators for:
- Multiple failed login attempts (>5 in 15 minutes)
- Login from new IP addresses
- Impossible travel (login from different countries in short time)
- Admin access changes

---

## 8. Additional Security Measures

### Password Reset Flow

Secure password reset should:

1. Accept email address
2. Send reset link to email (NOT reset in response)
3. Link includes one-time token (valid 1 hour)
4. User sets new password via link
5. Old tokens invalidated on reset

### Email Verification

Consider requiring email verification:

```typescript
// Send verification email after signup
await sendVerificationEmail(user.email)
```

### Account Lockout

Lock account after failed attempts:

```php
// After 10 failed attempts in 1 hour
if ($failedAttempts >= 10) {
    $user->update(['locked_until' => now()->addHour()]);
}
```

### Two-Factor Authentication (2FA)

Optional but recommended:

```typescript
// After entering credentials
if (user.has_2fa_enabled) {
    return { requires_2fa: true }
}
```

---

## 9. Compliance

### GDPR Compliance

- [ ] User can export their data
- [ ] User can delete their account (right to be forgotten)
- [ ] Privacy policy clearly explains data usage
- [ ] Consent for marketing emails

### PCI-DSS (if handling payments)

- [ ] Never store full credit card numbers
- [ ] Use approved payment gateway
- [ ] Encrypt sensitive data in transit
- [ ] Regular security audits

---

## 10. Security Headers Reference

Ensure these headers are set by your server:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

---

## Support & Questions

For security issues, contact: security@supersiesta.com

Never publicly disclose security vulnerabilities.
