export let csrf = '';
export function setCsrf(value: string) {
  csrf = value;
}
export async function request<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && options.body)
    headers.set('Content-Type', 'application/json');
  if (csrf) headers.set('x-csrf-token', csrf);
  const response = await fetch(`/api/v1/${url}`, { ...options, headers, credentials: 'include' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || '请求失败') as Error & { status: number };
    error.status = response.status;
    if (response.status === 401 && url !== 'auth/login' && url !== 'auth/me')
      window.dispatchEvent(new Event('session-expired'));
    throw error;
  }
  return data;
}
export const privateImage = (key: string) => `/api/v1/media/private/${key}`;
