/**
 * Stored credentials are a fallback for ordinary API calls. A request-level
 * credential is authoritative, especially during login and secret rotation.
 */
export const shouldAttachStoredAdminToken = (
  storedToken: string | null,
  explicitHeader: unknown,
) => Boolean(storedToken) && (explicitHeader === undefined || explicitHeader === null)
