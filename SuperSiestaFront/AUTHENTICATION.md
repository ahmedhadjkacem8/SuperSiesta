# Frontend Authentication Integration Guide

## Overview

This guide shows how to integrate the authentication system in your React frontend application.

---

## Setup

### 1. Wrap Your App with AuthProvider

In `src/main.tsx`:

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from '@/hooks/useAuth'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)
```

In `src/App.tsx`:

```typescript
import { AuthProvider } from '@/hooks/useAuth'
import { BrowserRouter } from 'react-router-dom'
import Router from '@/router' // Your routes

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Router />
      </BrowserRouter>
    </AuthProvider>
  )
}
```

### 2. Environment Setup

Ensure `.env.local` has:

```bash
VITE_API_URL=http://localhost:8000
```

---

## Common Usage Patterns

### Login Page Component

```typescript
// src/pages/Connexion.tsx
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'

export default function Connexion() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, error, isLoading } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await login(email, password)
    if (result.success) {
      navigate('/')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Mot de passe"
        required
      />
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Connexion...' : 'Se connecter'}
      </button>
    </form>
  )
}
```

### Registration Page Component

```typescript
// src/pages/Register.tsx
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    accountType: 'btoc' as const,
  })
  const { register, error, isLoading } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      alert('Les mots de passe ne correspondent pas')
      return
    }

    const result = await register(
      formData.email,
      formData.password,
      formData.fullName,
      formData.phone,
      formData.accountType
    )

    if (result.success) {
      navigate('/')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        name="email"
        value={formData.email}
        onChange={handleChange}
        placeholder="Email"
        required
      />
      <input
        type="text"
        name="fullName"
        value={formData.fullName}
        onChange={handleChange}
        placeholder="Nom complet"
        required
      />
      <input
        type="tel"
        name="phone"
        value={formData.phone}
        onChange={handleChange}
        placeholder="Téléphone (optionnel)"
      />
      <select
        name="accountType"
        value={formData.accountType}
        onChange={handleChange}
      >
        <option value="btoc">Client (B2C)</option>
        <option value="btob">Professionnel (B2B)</option>
      </select>
      <input
        type="password"
        name="password"
        value={formData.password}
        onChange={handleChange}
        placeholder="Mot de passe (min. 8 caractères)"
        required
      />
      <input
        type="password"
        name="confirmPassword"
        value={formData.confirmPassword}
        onChange={handleChange}
        placeholder="Confirmer le mot de passe"
        required
      />
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Inscription...' : 'S\'inscrire'}
      </button>
    </form>
  )
}
```

### Navbar with Auth Status

```typescript
// src/components/Navbar.tsx
import { useAuth } from '@/hooks/useAuth'
import { Link, useNavigate } from 'react-router-dom'

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <nav>
      <div className="logo">Super Siesta</div>
      <div className="nav-links">
        <Link to="/">Accueil</Link>
        <Link to="/boutique">Boutique</Link>
        <Link to="/blog">Blog</Link>

        {isAuthenticated ? (
          <>
            <Link to="/mon-compte">Mon Compte</Link>
            {isAdmin && <Link to="/admin">Admin Panel</Link>}
            <button onClick={handleLogout}>Déconnexion</button>
          </>
        ) : (
          <>
            <Link to="/connexion">Connexion</Link>
            <Link to="/register">S'inscrire</Link>
          </>
        )}
      </div>
      {user && <div className="user-info">{user.name}</div>}
    </nav>
  )
}
```

---

## Route Protection

### Protected Route Component

```typescript
// src/components/ProtectedRoute.tsx
import { useAuth } from '@/hooks/useAuth'
import { Navigate } from 'react-router-dom'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/connexion" replace />
  }

  return <>{children}</>
}
```

### Admin Route Component

```typescript
// src/components/AdminRoute.tsx
import { useAuth } from '@/hooks/useAuth'
import { Navigate } from 'react-router-dom'

interface AdminRouteProps {
  children: React.ReactNode
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { isAdmin, isLoading } = useAuth()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
```

### Router Configuration

```typescript
// src/router/index.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ProtectedRoute, AdminRoute } from '@/components/RouteGuards'

// Pages
import Home from '@/pages/Index'
import Shop from '@/pages/Boutique'
import Blog from '@/pages/Blog'
import BlogPost from '@/pages/BlogPost'
import Connexion from '@/pages/Connexion'
import Register from '@/pages/Register'
import MyAccount from '@/pages/MonCompte'
import AdminDashboard from '@/pages/admin/Dashboard'

export default function AppRouter() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />
      <Route path="/boutique" element={<Shop />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:slug" element={<BlogPost />} />
      <Route path="/connexion" element={<Connexion />} />
      <Route path="/register" element={<Register />} />

      {/* Protected routes */}
      <Route
        path="/mon-compte"
        element={
          <ProtectedRoute>
            <MyAccount />
          </ProtectedRoute>
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin/*"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
    </Routes>
  )
}
```

---

## User Profile Access

### Get Current User Information

```typescript
// src/pages/MonCompte.tsx
import { useAuth } from '@/hooks/useAuth'

export default function MonCompte() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <div>Not authenticated</div>
  }

  return (
    <div className="account-container">
      <h1>Mon Compte</h1>
      <div className="profile">
        <p><strong>Nom:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Nom Complet:</strong> {user.profile?.full_name}</p>
        <p><strong>Téléphone:</strong> {user.profile?.phone}</p>
        <p><strong>Type de Compte:</strong> {user.account_type === 'btoc' ? 'Client' : 'Professionnel'}</p>
        <p><strong>Rôle:</strong> {user.role}</p>
      </div>
    </div>
  )
}
```

---

## Using API Client with Authentication

### Making Authenticated Requests

```typescript
import { apiClient } from '@/lib/apiClient'
import { useAuth } from '@/hooks/useAuth'
import { useEffect, useState } from 'react'

export function UserOrders() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])

  useEffect(() => {
    if (user) {
      apiClient.getOrders().then(setOrders)
    }
  }, [user])

  return (
    <div>
      <h2>Mes Commandes</h2>
      {orders.map((order) => (
        <div key={order.id}>
          <p>Order: {order.order_number}</p>
          <p>Status: {order.status}</p>
        </div>
      ))}
    </div>
  )
}
```

---

## Automatic Token Refresh

### Token Persistence

The `useAuth` hook automatically:

1. Checks localStorage for token on app load
2. Calls GET `/api/auth/user` to validate token
3. If token is invalid/expired, clears it automatically
4. Updates state accordingly

```typescript
// This happens automatically in useAuth
useEffect(() => {
  checkAuthStatus() // Called on mount
}, [])
```

### Manual Token Check (if needed)

```typescript
function MyComponent() {
  const { checkAuthStatus } = useAuth()

  const handleRefresh = async () => {
    checkAuthStatus()
  }

  return <button onClick={handleRefresh}>Refresh Auth</button>
}
```

---

## Logout Implementation

### Simple Logout Button

```typescript
function LogoutButton() {
  const { logout, isLoading } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <button onClick={handleLogout} disabled={isLoading}>
      {isLoading ? 'Déconnexion...' : 'Déconnexion'}
    </button>
  )
}
```

### Session Timeout

```typescript
import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

const TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

export function SessionTimeout() {
  const { logout } = useAuth()
  let timeoutId: NodeJS.Timeout

  useEffect(() => {
    const resetTimeout = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        logout()
      }, TIMEOUT_MS)
    }

    window.addEventListener('mousemove', resetTimeout)
    window.addEventListener('click', resetTimeout)
    window.addEventListener('keypress', resetTimeout)

    return () => {
      window.removeEventListener('mousemove', resetTimeout)
      window.removeEventListener('click', resetTimeout)
      window.removeEventListener('keypress', resetTimeout)
      clearTimeout(timeoutId)
    }
  }, [logout])

  return null
}
```

---

## Error Handling

### Display Auth Errors

```typescript
function LoginForm() {
  const { login, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await login(email, password)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}
      <button type="submit">Login</button>
    </form>
  )
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Email or password is incorrect" | Wrong credentials | Check email/password |
| "The email has already been taken" | Email exists | Use different email |
| "The password must be at least 8 characters" | Password too short | Use longer password |
| "No authenticated user" | Invalid/expired token | User needs to login again |
| "Only admins can perform this action" | User not admin | Switch to admin account |

---

## Admin Panel Integration

### Admin Dashboard Example

```typescript
// src/pages/admin/Dashboard.tsx
import { useAuth } from '@/hooks/useAuth'

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth()

  if (!isAdmin) {
    return <div>Unauthorized</div>
  }

  return (
    <div className="admin-dashboard">
      <h1>Admin Panel</h1>
      <p>Welcome, {user?.name}</p>
      <nav className="admin-nav">
        <Link to="/admin/users">Users</Link>
        <Link to="/admin/products">Products</Link>
        <Link to="/admin/orders">Orders</Link>
        <Link to="/admin/blog">Blog</Link>
      </nav>
    </div>
  )
}
```

---

## TypeScript Types

### User Type

```typescript
interface User {
  id: string
  email: string
  name: string
  role: string // "Client", "Modérateur", "Administrateur"
  account_type: "btoc" | "btob"
  profile?: {
    id: string
    full_name: string
    phone?: string
    account_type: string
  }
}
```

### useAuth Context Type

```typescript
interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isAdmin: boolean
  isLoading: boolean
  error: string | null
  register: (...) => Promise<{ success: boolean; error?: string }>
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  checkAuthStatus: () => void
}
```

---

## Best Practices

1. **Always wrap with AuthProvider** - Place at root of app
2. **Check isLoading** - Show loading spinner while checking auth
3. **Use ProtectedRoute** - Protect sensitive pages
4. **Store token securely** - Use localStorage (can also use sessionStorage for extra security)
5. **Clear token on logout** - Always call logout() function
6. **Handle 401 errors** - Automatically handled by useAuth
7. **Show user feedback** - Display error messages for failed actions
8. **Check permissions** - Verify user role before showing admin features
9. **Validate forms** - Check password confirmation on register
10. **Handle network errors** - Add error boundaries for network issues

---

## Testing

### Test Login

```typescript
// src/__tests__/auth.test.ts
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuth } from '@/hooks/useAuth'

describe('useAuth', () => {
  it('should login user', async () => {
    const { result } = renderHook(() => useAuth())

    await act(async () => {
      const res = await result.current.login(
        'test@example.com',
        'TestPassword123'
      )
      expect(res.success).toBe(true)
    })

    expect(result.current.user).toBeDefined()
    expect(result.current.isAuthenticated).toBe(true)
  })
})
```

---

## Production Checklist

- [ ] Configure VITE_API_URL for production
- [ ] Test login/register flows
- [ ] Implement password reset
- [ ] Add email verification
- [ ] Configure HTTPS only tokens
- [ ] Implement session timeout UI
- [ ] Add rate limiting warnings
- [ ] Test admin routes security
- [ ] Implement audit logging
- [ ] Set up error reporting/monitoring
