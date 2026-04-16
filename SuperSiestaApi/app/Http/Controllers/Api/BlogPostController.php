<?php

namespace App\Http\Controllers\Api;

use App\Models\BlogPost;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class BlogPostController extends BaseController
{
    public function index(Request $request): JsonResponse
    {
        $query = BlogPost::query();

        if (!$request->user() || !$request->user()->roles()->where('role', 'admin')->exists()) {
            $query->published();
        }

        if ($request->has('category')) {
            $query->where('category', $request->category);
        }
        
        if ($request->has('is_favorite')) {
            $query->where('is_favorite', $request->is_favorite);
        }

        $posts = $query->orderBy('published_at', 'desc')->paginate($request->get('per_page', 10));

        return $this->sendResponse($posts, 'Blog posts retrieved successfully');
    }

    public function show(BlogPost $post): JsonResponse
    {
        if (!$post->published && (!auth()->user() || !auth()->user()->roles()->where('role', 'admin')->exists())) {
            return $this->sendError('Not found', 404);
        }

        return $this->sendResponse($post, 'Blog post retrieved successfully');
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', BlogPost::class);

        $validated = $request->validate([
            'title'     => 'required|string|max:255',
            'slug'      => 'required|string|unique:blog_posts',
            'excerpt'   => 'nullable|string',
            'content'   => 'required|string',
            'image_url' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'category'  => 'string',
            'tags'      => 'nullable|array',
            'published' => 'boolean',
            'is_favorite' => 'boolean',
        ]);

        $validated['published_at'] = isset($validated['published']) && $validated['published'] ? now() : null;

        $post = new BlogPost($validated);

        if ($request->hasFile('image_url')) {
            $post->image_url = $post->saveUploadedImage($request->file('image_url'));
        }

        $post->save();

        return $this->sendResponse($post, 'Blog post created successfully', 201);
    }

    public function update(Request $request, BlogPost $post): JsonResponse
    {
        $this->authorize('update', $post);

        $validated = $request->validate([
            'title'     => 'string|max:255',
            'slug'      => 'string|unique:blog_posts,slug,' . $post->id,
            'excerpt'   => 'nullable|string',
            'content'   => 'string',
            'image_url' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'category'  => 'string',
            'tags'      => 'nullable|array',
            'published' => 'boolean',
            'is_favorite' => 'boolean',
            'published_at' => 'nullable|date',
        ]);

        if (array_key_exists('published', $validated)) {
            if ($validated['published']) {
                $validated['published_at'] = $validated['published_at'] ?? now();
            } else {
                $validated['published_at'] = null;
            }
        }

        if ($request->hasFile('image_url')) {
            $validated['image_url'] = $post->saveUploadedImage(
                $request->file('image_url'),
                $post->image_url
            );
        }

        $post->update($validated);

        return $this->sendResponse($post, 'Blog post updated successfully');
    }

    public function destroy(BlogPost $post): JsonResponse
    {
        $this->authorize('delete', $post);

        $post->delete();

        return $this->sendResponse(null, 'Blog post deleted successfully');
    }
}
