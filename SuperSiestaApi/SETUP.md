# Super Siesta - MySQL & Laravel Migration Setup

## Overview

This guide walks you through setting up the Laravel API backend to replace Supabase with MySQL.

## Prerequisites

- PHP 8.2+
- MySQL 8.0+
- Composer
- Node.js & npm/bun (for frontend)

## Backend Setup

### 1. Environment Configuration

Create `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Update these critical settings:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=supersiesta
DB_USERNAME=root
DB_PASSWORD=your_password

APP_KEY=base64:YOUR_GENERATED_KEY

# API Configuration
API_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173

# Mail (optional, for password reset)
MAIL_DRIVER=smtp
MAIL_HOST=smtp.mailtrap.io
```

Generate APP_KEY:
```bash
php artisan key:generate
```

### 2. Database Setup

#### Create MySQL Database

```bash
mysql -u root -p
CREATE DATABASE supersiesta CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

#### Run Migrations

```bash
php artisan migrate
```

This creates all 18 tables necessary for the application.

#### Seed Sample Data

```bash
php artisan db:seed --class=DatabaseSeeder
```

This creates:
- Admin user (admin@supersiesta.com / password)
- Test user (test@example.com / password)
- 2 Gammes
- 2 Products with sizes
- 3 Showrooms
- 2 Hero slides
- 2 Blog posts
- Site content entries

### 3. Composer Dependencies

```bash
composer install
```

### 4. Start Development Server

```bash
php artisan serve
```

Server will run at `http://localhost:8000`

## Frontend Setup

### 1. Remove Supabase Dependencies

In `SuperSiestaFront`:

```bash
npm uninstall @supabase/supabase-js @supabase/auth-helpers-react
# or
bun remove @supabase/supabase-js @supabase/auth-helpers-react
```

### 2. Update Environment Variables

Create `.env.local`:

```env
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=Super Siesta
```

### 3. Create API Client

Replace the Supabase client with a simple fetch-based API client.

**`src/lib/api.ts`:**

```typescript
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function apiCall<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const token = localStorage.getItem('auth_token')
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options?.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}/api${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.data || data
}

// Quick methods
export const api = {
  get: <T,>(endpoint: string) => apiCall<T>(endpoint),
  post: <T,>(endpoint: string, body: any) =>
    apiCall<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: <T,>(endpoint: string, body: any) =>
    apiCall<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T,>(endpoint: string) =>
    apiCall<T>(endpoint, { method: 'DELETE' }),
}
```

### 4. Update Hooks

Replace Supabase hooks with API-based hooks.

**`src/hooks/useProducts.tsx`:**

```typescript
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export function useProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await api.get('/products')
        setProducts(data)
      } catch (err) {
        console.error('Error fetching products:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  return { products, loading }
}
```

**`src/hooks/useAuth.tsx`:**

```typescript
import { useContext } from 'react'
import { api } from '@/lib/api'

export function useAuth() {
  const register = async (email: string, password: string, name: string) => {
    const response = await api.post('/auth/register', {
      email,
      password,
      password_confirmation: password,
      name,
    })
    localStorage.setItem('auth_token', response.token)
    return response
  }

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', {
      email,
      password,
    })
    localStorage.setItem('auth_token', response.token)
    return response
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
  }

  const getUser = async () => {
    return await api.get('/user')
  }

  return { register, login, logout, getUser }
}
```

### 5. Update API Calls Throughout Frontend

Replace all Supabase calls:

**Old (Supabase):**
```typescript
const { data } = await supabase
  .from('products')
  .select('*')
  .eq('categorie', category)
```

**New (API):**
```typescript
const data = await api.get(`/products?categorie=${category}`)
```

### 6. Install Dependencies

```bash
npm install
# or
bun install
```

### 7. Start Development Server

```bash
npm run dev
# or
bun dev
```

Frontend will run at `http://localhost:5173`

## Database Schema

### Main Tables

1. **profiles** - User profiles (email, phone, account_type)
2. **user_roles** - User role assignments (admin, moderator, user)
3. **products** - Product catalog with slug, category, firmness, gamme
4. **product_sizes** - Product variants with BtoB/BtoC pricing
5. **orders** - Customer orders with status tracking
6. **order_items** - Order line items
7. **quotes** - Sales quotes (Devis)
8. **invoices** - Billing invoices (Factures)
9. **invoice_items** - Invoice line items
10. **delivery_notes** - Delivery tracking
11. **clients** - CRM client database
12. **blog_posts** - Published blog content
13. **showrooms** - Physical store locations
14. **hero_slides** - Homepage carousel slides
15. **gammes** - Product line/gamme definitions
16. **site_content** - CMS editable content
17. **treasury_entries** - Financial tracking
18. **user_roles** - Role assignments

## Key Features Implemented

✅ Complete CRUD API for all entities
✅ Role-based authorization (Admin, Moderator, User)
✅ Product catalog with sizes and pricing
✅ Order management with guest checkout
✅ CRM (Clients, Quotes, Invoices)
✅ Blog system with publishing workflow
✅ Delivery tracking
✅ Financial treasury module
✅ Content management system (CMS)
✅ Showroom directory
✅ Product gammes/lines

## API Endpoints

See `API_DOCUMENTATION.md` for complete endpoint documentation.

Quick start:
- `GET /api/products` - List products
- `POST /api/orders` - Create order (no auth needed)
- `GET /api/blog-posts` - List blog posts
- `GET /api/showrooms` - List showrooms
- `GET /api/hero-slides` - List homepage slides

## Testing

### Manual API Testing

Use Postman or curl:

```bash
# Get products
curl http://localhost:8000/api/products

# Create order
curl -X POST http://localhost:8000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Doe",
    "phone": "+216 71 000 000",
    "address": "123 Main St",
    "city": "Tunis",
    "items": [
      {
        "product_id": "uuid",
        "product_name": "Matelas Top Relax",
        "size_label": "90x190",
        "unit_price": 299.99,
        "quantity": 1
      }
    ]
  }'
```

### Unit Testing

```bash
php artisan test
```

## Production Deployment

### 1. Environment Setup

```bash
cp .env.example .env.production
# Update production settings
```

### 2. Install Dependencies

```bash
composer install --optimize-autoloader --no-dev
```

### 3. Cache Configuration

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### 4. Database Migration

```bash
php artisan migrate --force
php artisan db:seed --force
```

### 5. Set Permissions

```bash
chmod -R 755 storage bootstrap/cache
```

### 6. Web Server Configuration

Configure web server to point to `public` directory.

**Nginx:**
```nginx
root /path/to/SuperSiestaApi/public;
location / {
    try_files $uri $uri/ /index.php?$query_string;
}
```

**Apache:**
```apache
<Directory /path/to/SuperSiestaApi>
    AllowOverride All
    Require all granted
</Directory>
```

## Troubleshooting

### Database Connection Error

Ensure MySQL is running and credentials in `.env` are correct:
```bash
mysql -u root -p -e "SELECT 1"
```

### Migration Errors

Check table structure:
```bash
php artisan migrate:status
php artisan migrate:reset
php artisan migrate
```

### API Port Already in Use

Change port:
```bash
php artisan serve --port=8001
```

### CORS Issues

Update `CORS_ALLOWED_ORIGINS` in `config/cors.php`:
```php
'allowed_origins' => ['http://localhost:5173'],
```

## Additional Resources

- [Laravel Documentation](https://laravel.com/docs)
- [Eloquent ORM](https://laravel.com/docs/eloquent)
- [API Authentication](https://laravel.com/docs/sanctum)
- [MySQL Documentation](https://dev.mysql.com/doc/)

## Support

For issues, check:
1. Laravel logs: `storage/logs/laravel.log`
2. Database logs: MySQL error logs
3. API responses for detailed error messages

---

**Last Updated:** March 2024
**Version:** 1.0
