# Image Upload Configuration - Complete Setup

## Architecture

Images are uploaded directly to `/api/upload` endpoint and stored in `public/uploads/{folder}/` with subdirectories for organization.

### Flow

1. **Frontend**: User selects image in CRUD form
2. **ImageUpload Component**: Sends image to `/api/upload` via `uploadImage()` utility
3. **Backend**: UploadController saves file to `public/uploads/{folder}/{timestamp_filename}`
4. **Response**: Frontend receives public URL
5. **CRUD Save**: URL is saved with the rest of the model data

## File Structure

### Frontend

- **[imageUtils.ts](src/lib/imageUtils.ts)**
  - `uploadImage(file, folder)` - Upload single image
  - `uploadMultipleImages(fileList, folder)` - Upload multiple images
  - Direct fetch-based (bypasses JSON stringification issue)

- **[ImageUpload.tsx](src/components/ImageUpload.tsx)**
  - Single image upload with preview
  - Props: `value`, `onChange`, `folder`, `label`, `placeholder`
  - Auto-validates image MIME type

- **[MultiImageUpload.tsx](src/components/MultiImageUpload.tsx)**
  - Multiple image upload with grid display
  - Props: `value`, `onChange`, `folder`, `label`, `placeholder`
  - Shows numbered previews with remove buttons

### Backend

- **[UploadController.php](SuperSiestaApi/app/Http/Controllers/Api/UploadController.php)**
  - Handles `/api/upload` endpoint
  - Validates image files
  - Creates folder structure if needed
  - Returns JSON with public URL

- **[api.php routes](SuperSiestaApi/routes/api.php)**
  - Protected route: `POST /api/upload`
  - Requires authentication (Sanctum)

## Upload Paths

```
public/uploads/
├── produits/        # Product images
├── blog/           # Blog post images
├── banners/        # Hero slide images
├── cms/            # CMS block images
└── gammes/         # Gamme photos and 3D images
```

## CRUD Controllers

Controllers already support direct image uploads with their own handlers:

- **ProductController** (file: Product.php)
  - Field: `image` (single) - stored in `uploads/produits/`
  - Uses: `saveUploadedImage()`

- **BlogPostController** (file: BlogPost.php)
  - Field: `image_url` (single) - stored in `uploads/blog/`
  - Uses: `saveUploadedImage()`

- **HeroSlideController** (file: HeroSlide.php)
  - Field: `image_url` (single) - stored in `uploads/banners/`
  - Uses: `saveUploadedImage()`

- **GammeController** (file: Gamme.php)
  - Field: `photos` (array) - stored in `uploads/gammes/`
  - Field: `images_3d` (array) - stored in `uploads/gammes/`
  - Uses: `saveUploadedImages()`

## Usage in Components

### Single Image Upload

```tsx
<ImageUpload
  value={form.image_url}
  onChange={(url) => setForm({ ...form, image_url: url })}
  folder="blog"
  label="Image de l'article"
  placeholder="Glissez ou cliquez pour uploader"
/>
```

### Multiple Image Upload

```tsx
<MultiImageUpload
  value={form.photos}
  onChange={(urls) => setForm({ ...form, photos: urls })}
  folder="gammes"
  label="Photos"
  placeholder="Glissez ou cliquez pour uploader les images"
/>
```

## Key Features

✅ **Direct Storage** - Files stored in `public/uploads/{folder}/`
✅ **Auto Organization** - Subfolder structure by content type
✅ **Unique Names** - Timestamp + uniqid prevents collisions
✅ **Auth Protected** - Upload endpoint requires Sanctum token
✅ **Separate from CRUD** - Image upload happens first, URL saved with model
✅ **Better UX** - Upload progress shown immediately
✅ **Old Image Cleanup** - Automatically removes old files when updating

## Error Resolution

If you see "The file field is required":
1. Check authentication token is being sent
2. Verify file input's `accept="image/*"` attribute
3. Check browser console for network errors
4. Ensure FormData is being sent correctly (checked in imageUtils.ts)

## Future Improvements

- Add image compression before upload
- Add image cropping tool
- Add drag-and-drop zone for multi-file uploads
- Add progress bars for each file
- Add image metadata extraction (EXIF)
