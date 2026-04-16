# Backend Security Implementation Guide

## Overview

This guide documents the security enhancements made to the Super Siesta API authentication system.

---

## 1. Enhanced Authentication Controller

### Location
[app/Http/Controllers/Api/AuthController.php](app/Http/Controllers/Api/AuthController.php)

### Security Features

#### Password Validation
- **Minimum 8 characters** with complexity requirements
- Uses Laravel's `Password` validator with rules:
  - Mixed case (uppercase and lowercase)
  - Numbers required
  - Symbols required

```php
Password::min(8)
    ->mixedCase()
    ->numbers()
    ->symbols()
```

#### Secure Email Handling
- Emails are normalized to lowercase before storage
- Prevents duplicate account creation with different cases
- Email validation per RFC 5322

#### Rate Limiting
- Authentication endpoints rate-limited to **5 attempts per 15 minutes**
- Applied per IP address (configurable)
- Helps prevent brute force attacks

#### Secure Error Handling
- Generic error messages don't reveal if email exists
- Log details for auditing without returning sensitive info
- All errors logged with IP addresses for monitoring

```php
// Generic error - doesn't reveal if user exists
"Email or password is incorrect"
```

#### Audit Logging
- All authentication events logged to `storage/logs/laravel.log`
- Events logged:
  - Successful registration
  - Successful login
  - Failed login attempts
  - Successful logout
  - Unauthorized access attempts

```php
Log::info('User login successful', [
    'user_id' => $user->id,
    'email' => $user->email,
    'role' => $roleName,
    'ip' => request()->ip(),
    'timestamp' => now()
]);
```

#### Token Management
- Tokens created using Laravel Sanctum
- Each token is unique and time-limited
- Tokens can be revoked per session
- Optional: Revoke previous tokens on new login (uncomment to enable)

```php
// Prevent concurrent sessions (optional)
// $user->tokens()->delete();
```

#### CSRF Protection
- New endpoint returns CSRF token
- Can be used for form submissions
- Stored in X-CSRF-Token header

---

## 2. Form Request Validation Classes

### RegisterRequest
**Location:** `app/Http/Requests/RegisterRequest.php`

Validates all registration inputs with detailed rules:

```php
'email' => [
    'required',
    'email',
    'unique:users,email',
    'max:255'
],
'password' => [
    'required',
    'confirmed',
    Password::min(8)->mixedCase()->numbers()->symbols()
],
'full_name' => [
    'required',
    'string',
    'min:3',
    'max:255',
    'regex:/^[a-zA-ZÀ-ÿ\s\'-]+$/'
],
'phone' => [
    'sometimes',
    'nullable',
    'regex:/^[+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/',
    'max:20'
],
'account_type' => [
    'required',
    'in:btoc,btob'
]
```

### LoginRequest
**Location:** `app/Http/Requests/LoginRequest.php`

Validates login inputs and prevents user enumeration through error messages:

```php
'email' => [
    'required',
    'email',
    'max:255'
],
'password' => [
    'required',
    'string',
    'min:8',
    'max:255'
]
```

---

## 3. API Rate Limiting

### Configuration
**Location:** `routes/api.php`

```php
Route::middleware('throttle:5,15')->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
});
```

**Rate Limit:** 5 requests per 15 minutes per IP address

To modify, edit the `throttle` middleware:
- First parameter: requests allowed
- Second parameter: time window in minutes

### Customization
**Location:** `config/telescope.php` or middleware settings

```php
// In config/telescope.php
'route_middleware' => [
    'throttle' => \Illuminate\Routing\Middleware\ThrottleRequests::class,
],
```

---

## 4. Security Headers

### Required Headers
Add to your web server or Laravel middleware:

**Kubernetes/Docker (nginx):**
```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Content-Security-Policy "default-src 'self'" always;
```

**Laravel (middleware):**
```php
// app/Http/Middleware/SecurityHeaders.php
public function handle($request, Closure $next)
{
    $response = $next($request);
    
    $response->header('X-Content-Type-Options', 'nosniff');
    $response->header('X-Frame-Options', 'DENY');
    $response->header('X-XSS-Protection', '1; mode=block');
    $response->header('Strict-Transport-Security', 'max-age=31536000');
    
    return $response;
}
```

---

## 5. CORS Configuration

### Setup
**Location:** `config/cors.php`

```php
'allowed_origins' => [
    'https://supersiesta.com',
    'https://app.supersiesta.com',
],
'allow_credentials' => true,
'max_age' => 3600,
```

### Security Settings
- Only allow specific origins (never use `*` with credentials)
- Enable credentials for cookie-based auth
- Set appropriate cache duration

---

## 6. Session Configuration

### Setup
**Location:** `config/session.php`

```php
'lifetime' => 30, // 30 minutes
'expire_on_close' => true,
'secure' => true, // HTTPS only
'http_only' => true, // No JavaScript access
'same_site' => 'Lax', // CSRF protection
```

---

## 7. Environment Variables

### Required Setup
**Location:** `.env` file

```bash
# App Configuration
APP_NAME=SuperSiesta
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.supersiesta.com

# Database
DB_CONNECTION=mysql
DB_HOST=db.example.com
DB_PORT=3306
DB_DATABASE=supersiesta
DB_USERNAME=user
DB_PASSWORD=secure_password

# Cache & Session
CACHE_DRIVER=redis
SESSION_DRIVER=database
QUEUE_CONNECTION=redis

# Authentication
AUTH_GUARD=sanctum

# Mail (for password reset emails)
MAIL_DRIVER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=587
MAIL_USERNAME=your_username
MAIL_PASSWORD=your_password
MAIL_FROM_ADDRESS=noreply@supersiesta.com
```

### Production Checklist
- [ ] `APP_DEBUG=false`
- [ ] `APP_ENV=production`
- [ ] `APP_URL` set to HTTPS domain
- [ ] Strong `APP_KEY` (run `php artisan key:generate`)
- [ ] Database credentials secure
- [ ] Cache driver configured (Redis recommended)
- [ ] Mail service configured

---

## 8. Database Security

### User Table
Ensure `users` table has:

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,  -- Always hashed with bcrypt
    email_verified_at TIMESTAMP NULL,
    login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL  -- For soft deletes
);

CREATE INDEX idx_email ON users(email);
CREATE INDEX idx_deleted_at ON users(deleted_at);
```

### Profile Table
```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NULL,
    account_type ENUM('btoc', 'btob') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Personal Access Tokens (from Sanctum)
```sql
CREATE TABLE personal_access_tokens (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    tokenable_type VARCHAR(255) NOT NULL,
    tokenable_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(255) NOT NULL,
    token VARCHAR(80) UNIQUE NOT NULL,
    abilities LONGTEXT NULL,
    last_used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tokenable ON personal_access_tokens(tokenable_type, tokenable_id);
CREATE INDEX idx_token ON personal_access_tokens(token);
```

---

## 9. Monitoring & Alerting

### Log Monitoring
Monitor these patterns in logs:

**Failed Logins:**
```
Failed login attempt - email: {email}, ip: {ip}
```

**Suspicious Activity:**
```
- Multiple failed attempts (>5/15min)
- Admin registration attempts by non-admins
- Token revocation patterns
```

**Infrastructure:**
```
- Response times slow
- Rate limits being hit
- Database connection issues
```

### Recommended Monitoring Tools
- **Laravel Telescope** - Local development debugging
- **Sentry** - Error tracking and monitoring
- **LogRocket** - Session replay for debugging
- **ELK Stack** - Log aggregation and analysis
- **New Relic** - Performance monitoring

---

## 10. Implementation Checklist

### Before Deployment

Frontend:
- [x] Password strength validator
- [x] Input validation on all forms
- [x] Client-side rate limiting
- [x] CSRF token integration
- [x] Auto-logout on inactivity
- [x] Secure error handling

Backend:
- [x] Enhanced AuthController
- [x] Form Request validation classes
- [x] Server-side rate limiting
- [x] Audit logging
- [x] CSRF token endpoint
- [ ] Email verification (optional)
- [ ] Password reset flow (optional)
- [ ] Account lockout after failed attempts
- [ ] 2FA support (optional)

Infrastructure:
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] CORS restricted to safe origins
- [ ] Database backups enabled
- [ ] Log rotation configured
- [ ] Monitoring alerts set up
- [ ] DDoS protection enabled
- [ ] Web Application Firewall (WAF) configured

---

## 11. Common Vulnerabilities & Mitigation

### SQL Injection
**Mitigation:** Using Laravel's query builder and Eloquent ORM
```php
// Safe - prevents SQL injection
$user = User::where('email', $email)->first();

// Avoid direct string interpolation
// BAD: "SELECT * FROM users WHERE email = '$email'"
```

### Cross-Site Scripting (XSS)
**Mitigation:** Blade template escaping
```blade
<!-- Safe - automatically escaped -->
{{ $user->email }}

<!-- Raw output (use cautiously)-->
{!! $html !!}
```

### Cross-Site Request Forgery (CSRF)
**Mitigation:** CSRF token validation
```php
// Automatic in Laravel forms
<input type="hidden" name="_token" value="{{csrf_token()}}">
```

### Brute Force Attacks
**Mitigation:** Rate limiting on auth endpoints
```php
Route::middleware('throttle:5,15')->group(function () {
    Route::post('/auth/login', ...);
});
```

### Password Exposure
**Mitigation:** Bcrypt hashing with salt
```php
$user->password = Hash::make($password);  // Safe
Hash::check($inputPassword, $user->password);  // Constant time comparison
```

---

## 12. Testing Security

### Manual Testing

```bash
# Test rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:8000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrongpass"}'
done

# Test CSRF token endpoint
curl http://localhost:8000/api/csrf-token

# Test with invalid token
curl -X POST http://localhost:8000/api/auth/login \
  -H "X-CSRF-Token: invalid" \
  -d '{"email":"test@test.com","password":"pass"}'
```

### Automated Testing

```php
// tests/Feature/AuthenticationTest.php

public function test_registration_requires_strong_password()
{
    $response = $this->post('/api/auth/register', [
        'email' => 'test@example.com',
        'password' => 'weak',  // Will fail validation
        'password_confirmation' => 'weak',
    ]);
    
    $response->assertStatus(422);
}

public function test_rate_limiting_blocks_excessive_requests()
{
    for ($i = 0; $i < 6; $i++) {
        $response = $this->post('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password'
        ]);
    }
    
    $response->assertStatus(429);  // Too Many Requests
}
```

---

## Support & Questions

For security issues: **security@supersiesta.com**

**Never publicly disclose security vulnerabilities.**

Report security issues privately to the security team.
