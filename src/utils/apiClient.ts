/**
 * API Client for communication with the MueveCancun backend.
 * Features automatic JSON parsing, error handling, and authorization headers.
 */
export class ApiClient {
  private static get baseUrl() {
    // Determine base URL depending on the environment
    return import.meta.env.PUBLIC_API_URL || '/api';
  }

  private static getHeaders(customHeaders: HeadersInit = {}): HeadersInit {
    // Inject auth token if available (Phase 3/4)
    const token = typeof window !== 'undefined' ? localStorage.getItem('mc_token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...customHeaders,
    };
  }

  static async get<T>(endpoint: string, headers?: HeadersInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(headers),
    });
    return this.handleResponse<T>(response);
  }

  static async post<T>(endpoint: string, data: unknown, headers?: HeadersInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(headers),
      body: JSON.stringify(data),
    });
    return this.handleResponse<T>(response);
  }

  private static async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = 'An error occurred';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // Fallback if not JSON
        errorMessage = response.statusText;
      }
      throw new Error(errorMessage);
    }
    return response.json();
  }
}
