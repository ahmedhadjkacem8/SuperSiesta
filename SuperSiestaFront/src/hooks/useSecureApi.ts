// SuperSiestaFront/src/hooks/useSecureApi.ts
// DEPRECATED: This hook is deprecated. Use SecureApiService from apiClient.ts instead.
// It provides all the same functionality with better type safety and error handling.

import { useCallback } from 'react'
import { api } from '@/lib/apiClient'

interface SecureApiOptions {
  timeout?: number
  retries?: number
}

/**
 * Custom hook for secure API calls
 * @deprecated Use SecureApiService from apiClient.ts instead
 *
 * The api object already includes:
 * - Token management and expiration
 * - CSRF token validation
 * - Automatic token refresh
 * - Rate limiting awareness
 * - Secure file uploads
 * - Proper error handling
 */
export const useSecureApi = (options: SecureApiOptions = {}) => {
  // Options are accepted for backward compatibility but the apiClient has built-in configuration
  // const timeout = options.timeout || 30000
  // const retries = options.retries || 3

  // Wrapper for file upload with validation
  const uploadFile = useCallback(
    async (file: File, folder: string = 'uploads') => {
      return api.uploadFile(file, folder)
    },
    []
  )

  // Wrapper for signed URLs
  const getSignedUrl = useCallback(
    async (filePath: string) => {
      return api.getSignedUrl(filePath)
    },
    []
  )

  return {
    api,
    uploadFile,
    getSignedUrl,
  }
}

