# Super Siesta API Documentation

## Overview

Complete REST API for Super Siesta e-commerce and CRM platform. This API replaces Supabase with a Laravel MySQL backend.

## Base URL

```
http://localhost:8000/api
```

## Authentication

The API uses Laravel Sanctum for authentication. Include the token in the `Authorization` header:

```
Authorization: Bearer YOUR_TOKEN_HERE
```

## Response Format

All responses are in JSON format:

```json
{
  "success": true,
  "data": {},
  "message": "Optional success message"
}
```

Error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

## Endpoints

### Products

#### Get All Products
```
GET /api/products
```

Query parameters:
- `categorie` - Filter by category (orthopédique, etc.)
- `fermete` - Filter by firmness (ferme, moyen, doux)
- `gamme` - Filter by gamme/line
- `in_promo` - Filter by promotion status (true/false)
- `per_page` - Items per page (default: 15)

Response: Paginated list of products with sizes

#### Get Product
```
GET /api/products/{id}
```

#### Create Product (Admin only)
```
POST /api/products
Content-Type: application/json

{
  "name": "string",
  "slug": "string (unique)",
  "categorie": "orthopédique",
  "fermete": "ferme",
  "gamme": "string (optional)",
  "image": "string (optional)",
  "images": ["array of urls (optional)"],
  "description": "string (optional)",
  "specs": ["array (optional)"],
  "badge": "string (optional)",
  "in_promo": boolean
}
```

#### Update Product (Admin only)
```
PUT /api/products/{id}
```

#### Delete Product (Admin only)
```
DELETE /api/products/{id}
```

### Product Sizes

#### Get Product Sizes
```
GET /api/products/{productId}/sizes
```

#### Create Product Size (Admin only)
```
POST /api/products/{productId}/sizes
Content-Type: application/json

{
  "label": "90x190",
  "price": 299.99,
  "reseller_price": 249.99 (optional),
  "original_price": 349.99 (optional)
}
```

#### Update Product Size (Admin only)
```
PUT /api/products/{productId}/sizes/{sizeId}
```

#### Delete Product Size (Admin only)
```
DELETE /api/products/{productId}/sizes/{sizeId}
```

### Orders

#### Get User Orders
```
GET /api/orders
```

Query parameters:
- `status` - Filter by status
- `per_page` - Items per page (default: 15)

#### Get Order Details
```
GET /api/orders/{id}
```

#### Create Order (Public)
```
POST /api/orders
Content-Type: application/json

{
  "full_name": "string",
  "phone": "string",
  "address": "string",
  "city": "string",
  "notes": "string (optional)",
  "items": [
    {
      "product_id": "uuid",
      "product_name": "string",
      "size_label": "90x190",
      "unit_price": 299.99,
      "quantity": 1
    }
  ]
}
```

Response includes generated order_number (ORD-{timestamp})

#### Update Order
```
PUT /api/orders/{id}
```

Parameters:
- `status` - en_attente, accepté, annulée
- Other fields from creation

#### Delete Order (Admin only)
```
DELETE /api/orders/{id}
```

### Blog Posts

#### Get Published Blog Posts
```
GET /api/blog-posts
```

Query parameters:
- `category` - Filter by category
- `per_page` - Items per page

Admins see all posts (published and draft).

#### Get Blog Post
```
GET /api/blog-posts/{id}
```

#### Create Blog Post (Admin only)
```
POST /api/blog-posts
Content-Type: application/json

{
  "title": "string",
  "slug": "string (unique)",
  "excerpt": "string (optional)",
  "content": "string (markdown)",
  "image_url": "url (optional)",
  "category": "blog",
  "tags": ["array (optional)"],
  "published": boolean
}
```

#### Update Blog Post (Admin only)
```
PUT /api/blog-posts/{id}
```

#### Delete Blog Post (Admin only)
```
DELETE /api/blog-posts/{id}
```

### Showrooms

#### Get Showrooms
```
GET /api/showrooms
```

#### Get Showroom
```
GET /api/showrooms/{id}
```

#### Create Showroom (Admin only)
```
POST /api/showrooms
```

#### Update Showroom (Admin only)
```
PUT /api/showrooms/{id}
```

#### Delete Showroom (Admin only)
```
DELETE /api/showrooms/{id}
```

### Hero Slides

#### Get Active Hero Slides
```
GET /api/hero-slides
```

#### Create Hero Slide (Admin only)
```
POST /api/hero-slides
Content-Type: application/json

{
  "title": "string (optional)",
  "subtitle": "string (optional)",
  "cta_text": "string",
  "cta_link": "string",
  "image_url": "string (required)",
  "sort_order": integer,
  "active": boolean
}
```

#### Update Hero Slide (Admin only)
```
PUT /api/hero-slides/{id}
```

#### Delete Hero Slide (Admin only)
```
DELETE /api/hero-slides/{id}
```

### Gammes

#### Get Gammes
```
GET /api/gammes
```

#### Get Gamme
```
GET /api/gammes/{id}
```

#### Create Gamme (Admin only)
```
POST /api/gammes
```

#### Update Gamme (Admin only)
```
PUT /api/gammes/{id}
```

#### Delete Gamme (Admin only)
```
DELETE /api/gammes/{id}
```

### Clients (CRM)

#### Get Clients (Admin only)
```
GET /api/clients
```

Query parameters:
- `search` - Search by name, email, or phone

#### Get Client (Admin only)
```
GET /api/clients/{id}
```

Returns client with related quotes, invoices, and orders.

#### Create Client (Admin only)
```
POST /api/clients
Content-Type: application/json

{
  "full_name": "string",
  "email": "email (unique, optional)",
  "phone": "string (optional)",
  "address": "string (optional)",
  "city": "string (optional)",
  "notes": "string (optional)",
  "tags": ["array (optional)"]
}
```

#### Update Client (Admin only)
```
PUT /api/clients/{id}
```

#### Delete Client (Admin only)
```
DELETE /api/clients/{id}
```

### Invoices

#### Get Invoices (Admin only)
```
GET /api/invoices
```

Query parameters:
- `status` - Filter by status
- `client_id` - Filter by client

#### Get Invoice (Admin only)
```
GET /api/invoices/{id}
```

#### Create Invoice (Admin only)
```
POST /api/invoices
Content-Type: application/json

{
  "invoice_number": "string (unique)",
  "client_id": "uuid",
  "quote_id": "uuid (optional)",
  "order_id": "uuid (optional)",
  "status": "brouillon|envoyée|payée|annulée",
  "total": number,
  "tax_rate": number,
  "notes": "string (optional)",
  "due_date": "date (optional)"
}
```

#### Convert Quote to Invoice (Admin only)
```
POST /api/quotes/{quoteId}/to-invoice
```

Creates invoice from quote, copying all items and client info.

#### Update Invoice (Admin only)
```
PUT /api/invoices/{id}
```

#### Delete Invoice (Admin only)
```
DELETE /api/invoices/{id}
```

### Quotes

#### Get Quotes (Admin only)
```
GET /api/quotes
```

Query parameters:
- `status` - Filter by status
- `client_id` - Filter by client

#### Get Quote (Admin only)
```
GET /api/quotes/{id}
```

#### Create Quote (Admin only)
```
POST /api/quotes
Content-Type: application/json

{
  "quote_number": "string (unique)",
  "client_id": "uuid",
  "status": "brouillon|envoyé|accepté|refusé|facturé",
  "total": number,
  "notes": "string (optional)",
  "valid_until": "date (optional)",
  "items": [
    {
      "description": "string",
      "quantity": integer,
      "unit_price": number
    }
  ]
}
```

#### Update Quote (Admin only)
```
PUT /api/quotes/{id}
```

#### Delete Quote (Admin only)
```
DELETE /api/quotes/{id}
```

### Delivery Notes

#### Get Delivery Notes (Admin only)
```
GET /api/delivery-notes
```

Query parameters:
- `status` - Filter by status
- `order_id` - Filter by order

#### Get Delivery Note (Admin only)
```
GET /api/delivery-notes/{id}
```

#### Create Delivery Note (Admin only)
```
POST /api/delivery-notes
Content-Type: application/json

{
  "delivery_number": "string (unique)",
  "order_id": "uuid (optional)",
  "client_id": "uuid (optional)",
  "status": "en_attente|en_cours|livrée|annulée",
  "delivery_address": "string (optional)",
  "delivery_city": "string (optional)",
  "full_name": "string",
  "phone": "string (optional)",
  "notes": "string (optional)",
  "items": [
    {
      "product_name": "string",
      "size_label": "string",
      "quantity": integer
    }
  ]
}
```

#### Update Delivery Note (Admin only)
```
PUT /api/delivery-notes/{id}
```

#### Delete Delivery Note (Admin only)
```
DELETE /api/delivery-notes/{id}
```

### Site Content (CMS)

#### Get Content
```
GET /api/site-content
```

Query parameters:
- `page` - Filter by page
- `section` - Filter by section

#### Get Content by Key
```
GET /api/site-content/{key}
```

#### Create Content (Admin only)
```
POST /api/site-content
```

#### Update Content (Admin only)
```
PUT /api/site-content/{id}
```

#### Delete Content (Admin only)
```
DELETE /api/site-content/{id}
```

### Treasury Entries

#### Get Entries (Admin only)
```
GET /api/treasury-entries
```

Query parameters:
- `type` - entrée or sortie
- `category` - Filter by category
- `start_date` & `end_date` - Filter by date range

#### Get Treasury Summary (Admin only)
```
GET /api/treasury-entries/summary
```

Query parameters:
- `start_date` & `end_date` - Optional date range

Returns:
```json
{
  "income": number,
  "expenses": number,
  "balance": number
}
```

#### Create Entry (Admin only)
```
POST /api/treasury-entries
```

#### Update Entry (Admin only)
```
PUT /api/treasury-entries/{id}
```

#### Delete Entry (Admin only)
```
DELETE /api/treasury-entries/{id}
```

## Migration from Supabase

### Step 1: Run Migrations
```bash
php artisan migrate
```

### Step 2: Seed Database
```bash
php artisan db:seed
```

This creates:
- 2 Gammes (Relax+, Tendresse+)
- 2 Sample Products with sizes
- 3 Showrooms
- 2 Hero Slides
- 2 Blog Posts
- 2 Admin and User accounts

### Step 3: Update Frontend

Replace all Supabase client initialization with API calls:

**Old:**
```typescript
import { supabase } from '@/integrations/supabase/client'
const { data } = await supabase.from('products').select('*')
```

**New:**
```typescript
const response = await fetch('/api/products')
const { data } = await response.json()
```

## Authentication Flow

### Register
```
POST /auth/register
{
  "name": "User Name",
  "email": "user@example.com",
  "password": "password"
}
```

### Login
```
POST /auth/login
{
  "email": "user@example.com",
  "password": "password"
}
```

Returns:
```json
{
  "token": "bearer_token",
  "user": { ... }
}
```

### Get Current User
```
GET /api/user
Authorization: Bearer token
```

## Authorization

### Public Endpoints
- GET /products
- GET /blog-posts (published only)
- GET /showrooms
- GET /hero-slides
- GET /gammes
- GET /site-content
- POST /orders (guest orders)

### User Endpoints
- GET /orders (own orders)
- PUT /orders/{id} (own orders)
- GET /user

### Admin Endpoints
All POST, PUT, DELETE operations for:
- Products
- Clients
- Invoices
- Quotes
- Blog Posts
- Delivery Notes
- Treasury Entries
- And more...

## Error Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Server Error

## Rate Limiting

No rate limiting implemented yet. Consider adding it in production.

## Versioning

API v1 - Current version

## Support

For issues or questions, contact the development team.
