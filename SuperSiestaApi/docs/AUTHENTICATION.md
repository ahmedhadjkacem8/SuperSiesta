# Authentication API Guide

## Overview

The SuperSiesta API uses **Laravel Sanctum** for API token-based authentication. It supports two user types:
- **Clients (BtoC/BtoB)** - Regular users who can place orders
- **Admins (Administrateur)** - Administrative users with full access

---

## Authentication Endpoints

### POST `/api/auth/register`

Register a new user (client or admin).

**Public Endpoint** (No authentication required)

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "password_confirmation": "securePassword123",
  "full_name": "John Doe",
  "phone": "+216 71 000 000",
  "account_type": "btoc",
  "is_admin": false
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | User email (must be unique) |
| password | string | Yes | Minimum 8 characters |
| password_confirmation | string | Yes | Must match password |
| full_name | string | Yes | Full name (3-255 chars) |
| phone | string | No | Phone number |
| account_type | enum | Yes | `btoc` (B2C client) or `btob` (B2B client) |
| is_admin | boolean | No | Only existing admins can set `true` |

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "1|abc123xyz...",
    "token_type": "Bearer",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "Client",
      "account_type": "btoc",
      "profile": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "full_name": "John Doe",
        "email": "user@example.com",
        "phone": "+216 71 000 000",
        "account_type": "btoc"
      }
    }
  }
}
```

**Error Responses:**
```json
// Validation error
{
  "success": false,
  "message": "Validation Error",
  "data": {
    "email": ["The email has already been taken"]
  }
}

// Unauthorized admin registration
{
  "success": false,
  "message": "Unauthorized",
  "error": "Only admins can register other admins"
}
```

---

### POST `/api/auth/login`

Login user and receive authentication token.

**Public Endpoint** (No authentication required)

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Parameters:**
| Field | Type | Required |
|-------|------|----------|
| email | string | Yes |
| password | string | Yes |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "1|abc123xyz...",
    "token_type": "Bearer",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "Client",
      "account_type": "btoc",
      "profile": {
        "full_name": "John Doe",
        "email": "user@example.com",
        "phone": "+216 71 000 000",
        "account_type": "btoc"
      }
    }
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Authentication Failed",
  "error": "Email or password is incorrect"
}
```

---

### GET `/api/auth/user`

Get current authenticated user's information.

**Protected Endpoint** (Requires Bearer token)

**Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/auth/user
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "Client",
      "account_type": "btoc",
      "profile": {
        "full_name": "John Doe",
        "email": "user@example.com",
        "phone": "+216 71 000 000",
        "account_type": "btoc"
      }
    }
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Unauthenticated",
  "error": "No authenticated user"
}
```

---

### POST `/api/auth/logout`

Logout user and revoke authentication token.

**Protected Endpoint** (Requires Bearer token)

**Request:**
```bash
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/auth/logout
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Logout successful",
  "data": []
}
```

---

## Token Management

### Storing Token

Tokens are automatically stored in `localStorage` with the key `auth_token`:

```javascript
// Automatically stored after login/register
localStorage.getItem('auth_token') // Returns: "1|abc123xyz..."
```

### Using Token in Requests

Include token in Authorization header:

```javascript
const token = localStorage.getItem('auth_token');
const response = await fetch('http://localhost:8000/api/orders', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### Token Format

Tokens are in Sanctum format:
- Format: `{id}|{hash}`
- Expires after inactivity (configurable in Laravel)
- One token per device/client
- Automatically revoked on logout

---

## Frontend Usage

### Using useAuth Hook

```typescript
import { useAuth } from '@/hooks/useAuth';

function LoginPage() {
  const { login, user, isAuthenticated, error } = useAuth();

  const handleLogin = async () => {
    const result = await login('user@example.com', 'password123');
    if (result.success) {
      // Navigate to dashboard
    } else {
      console.error(result.error);
    }
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}
      <button onClick={handleLogin}>Login</button>
    </div>
  );
}
```

### Register Component

```typescript
import { useAuth } from '@/hooks/useAuth';

function RegisterPage() {
  const { register, error } = useAuth();

  const handleRegister = async () => {
    const result = await register(
      'newuser@example.com',
      'SecurePass123',
      'Jane Doe',
      '+216 71 000 000',
      'btoc'
    );
    
    if (result.success) {
      // Redirect to home
      window.location.href = '/';
    } else {
      console.error(result.error);
    }
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleRegister();
    }}>
      {/* Form fields */}
    </form>
  );
}
```

### Protected Routes

```typescript
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/connexion" />;
  }

  return <>{children}</>;
}
```

### Admin-Only Routes

```typescript
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}
```

---

## Security Features

### Password Requirements
- Minimum 8 characters
- Case-sensitive
- Hashed using Laravel's bcrypt

### Account Types
- **BtoC (btoc)** - Business to Consumer (regular customers)
- **BtoB (btob)** - Business to Business (corporate accounts)

### Role Types
- **Client** - Regular user (BtoC/BtoB)
- **Moderator** - Limited administrative access
- **Administrateur (Admin)** - Full administrative access

### Admin Registration Security
- Only existing admins can register new admins
- Requires `is_admin: true` in request
- Request will be rejected if user is not authenticated as admin

### Token Security
- Tokens are single-use (per registration/login)
- Automatically revoked on logout
- No token stored in database after revocation
- Sanctum provides CSRF protection

### Email Uniqueness
- Each user must have unique email
- Prevents duplicate accounts

---

## Use Cases

### Client Registration Flow
```
1. User fills registration form
2. POST /api/auth/register (BtoC or BtoB)
3. Receive token
4. Token stored in localStorage automatically by useAuth
5. User redirected to dashboard
6. User can access protected routes
```

### Admin Registration Flow
```
1. Existing admin logs in
2. Goes to admin user management
3. Enters new admin email and info
4. Sends registration request with is_admin: true
5. New admin receives token
6. Admin can access admin panel
```

### Login Flow
```
1. User enters email/password
2. POST /api/auth/login
3. Receive token if credentials valid
4. Token stored in localStorage by useAuth
5. Redirect to dashboard
6. GET /api/auth/user confirms identity
```

### Session Check
```
1. App loads
2. useAuth checks useAuth hook (checkAuthStatus)
3. If token exists, GET /api/auth/user
4. If valid, setUser with data
5. If invalid/expired, clear token
6. User sees appropriate UI (logged in or logged out)
```

### Logout Flow
```
1. User clicks logout
2. POST /api/auth/logout (with token)
3. Token revoked on server
4. Token cleared from localStorage
5. User redirected to home page
```

---

## Error Handling

### Common Errors

**422 Validation Error**
```json
{
  "success": false,
  "message": "Validation Error",
  "data": {
    "email": ["The email has already been taken"],
    "password": ["The password must be at least 8 characters"]
  }
}
```

**401 Unauthorized (Login)**
```json
{
  "success": false,
  "message": "Authentication Failed",
  "error": "Email or password is incorrect"
}
```

**401 Unauthorized (Bad Token)**
```json
{
  "success": false,
  "message": "Unauthenticated",
  "error": "No authenticated user"
}
```

**403 Forbidden (Admin Only)**
```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "Only admins can perform this action"
}
```

---

## Testing with cURL

### Register
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123",
    "password_confirmation": "TestPassword123",
    "full_name": "Test User",
    "phone": "+216 71 000 000",
    "account_type": "btoc"
  }'
```

### Login
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123"
  }'
```

### Get User
```bash
curl http://localhost:8000/api/auth/user \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Logout
```bash
curl -X POST http://localhost:8000/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Default Test Credentials

**Admin User:**
- Email: `admin@supersiesta.com`
- Password: `admin123` (change this in production!)
- Role: Administrateur
- Account Type: btoc

**Test User:**
- Email: `test@example.com`
- Password: `test123` (change this in production!)
- Role: Client
- Account Type: btoc

These are created by the database seeder. Change passwords in production!

---

## Production Checklist

- [ ] Change default seeder passwords
- [ ] Enable HTTPS for all auth endpoints
- [ ] Configure token expiration time
- [ ] Implement rate limiting on auth endpoints
- [ ] Enable email verification
- [ ] Add password reset functionality
- [ ] Configure CORS for production domain
- [ ] Enable secure cookie flags
- [ ] Monitor failed login attempts
- [ ] Implement session timeout warnings
