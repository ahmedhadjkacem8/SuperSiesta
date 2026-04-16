# Image Upload - Testing & Troubleshooting Guide

## Quick Test Steps

### 1. Test Backend Upload Endpoint

```bash
# First, get an authentication token
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Copy the token from response

# Test upload endpoint with token
curl -X POST http://localhost:8000/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "file=@/path/to/image.jpg" \
  -F "folder=test"
```

**Expected Response:**
```json
{
  "url": "http://localhost:8000/uploads/test/1234567890_abcd1234.jpg",
  "path": "uploads/test/1234567890_abcd1234.jpg",
  "file_name": "1234567890_abcd1234.jpg"
}
```

### 2. Test Frontend Upload

1. Go to any CRUD form (e.g., Products, Blog Posts)
2. Use the ImageUpload component to select an image
3. Check browser DevTools → Network tab
4. Verify `POST /api/upload` request:
   - Headers should include `Authorization: Bearer {token}`
   - Body should be `multipart/form-data`
   - File field contains the binary image data

### 3. Check File System

After uploading, verify files are created:

```bash
# List uploads directory
ls -la public/uploads/

# Should see subdirectories like:
# drwxr-xr-x  blog
# drwxr-xr-x  produits
# drwxr-xr-x  gammes
# drwxr-xr-x  cms
# drwxr-xr-x  test (from our test)

# List files in a specific folder
ls -la public/uploads/blog/
```

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "The file field is required" | FormData not sent correctly | Check imageUtils.ts is being used, not apiClient |
| 404 on /api/upload | Route not protected or registered | Check api.php has `/api/upload` in auth:sanctum group |
| "CORS error" | Frontend and backend on different origins | Add CORS headers in Laravel config/cors.php |
| "file_uploads disabled" | PHP config issue | Check php.ini has `file_uploads = On` |
| "Permission denied" when saving | Storage directory permissions | Run `chmod 777 public/uploads/` |
| File saved but URL returns 404 | Symlink issue | Run `php artisan storage:link` |

## Debugging Tips

### 1. Check Auth Token

```javascript
// In browser console
localStorage.getItem('auth_token')
// Should return a non-empty token string
```

### 2. Monitor Network Requests

```javascript
// In browser console, add logging
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  console.log('🔵 Fetch Request:', args[0], args[1]);
  const response = await originalFetch(...args);
  console.log('🟢 Fetch Response:', response.status);
  return response;
};
```

### 3. Check Server Logs

```bash
# Laravel log
tail -f storage/logs/laravel.log

# Watch for any errors during upload
```

## Configuration Checks

### Frontend (.env or .env.local)

```
VITE_API_URL=http://localhost:8000
```

### Backend (.env)

```
APP_URL=http://localhost:8000
FILESYSTEM_DISK=public
```

### Laravel Storage

```bash
# Check if public disk is configured in config/filesystems.php
php artisan tinker
> config('filesystems.disks.public')
```

## Reset & Start Fresh

If you want to clean up and start over:

```bash
# Clear all uploaded files
rm -rf public/uploads/*

# Clear Laravel cache
php artisan cache:clear
php artisan config:clear
php artisan route:cache

# Recreate symlink
php artisan storage:link

# Restart server
php artisan serve
```

## Expected Behavior

### When Upload Works ✅

1. Select image → Component shows loading spinner
2. File uploads to `/api/upload` 
3. Get back JSON response with `url` field
4. Image preview displays immediately
5. URL is stored in form state
6. Submit form → URL saved in database
7. Check `public/uploads/{folder}/` → File exists

### After CRUD Save

```
Database record:
{
  "id": "uuid",
  "name": "Product Name",
  "image": "http://localhost:8000/uploads/produits/timestamp_filename.jpg",
  ...
}

File system:
public/uploads/produits/timestamp_filename.jpg  ✅
```

## Browser DevTools Inspection

### Request Headers (should have):
```
POST /api/upload HTTP/1.1
Authorization: Bearer eyJhb...
Content-Type: multipart/form-data; boundary=----...
Accept: application/json
```

### Response Headers (should have):
```
HTTP/1.1 201 Created
Content-Type: application/json
```

### Response Body:
```json
{
  "url": "http://localhost:8000/uploads/blog/1710907200_5f8a2b1c.jpg",
  "path": "uploads/blog/1710907200_5f8a2b1c.jpg",
  "file_name": "1710907200_5f8a2b1c.jpg"
}
```

## Success Indicators

✅ Image uploaded successfully when you see:
- ✓ File appears in `public/uploads/{folder}/`
- ✓ URL is valid and accessible
- ✓ Image preview displays in component
- ✓ URL saved in database after CRUD submit
- ✓ Image displays when viewing the record
