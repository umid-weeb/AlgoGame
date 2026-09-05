/**
 * API Client - Handles all backend communication
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

class APIClient {
  constructor() {
    this.accessToken = localStorage.getItem('access_token');
    this.refreshToken = localStorage.getItem('refresh_token');
  }

  /**
   * Make API request with authentication
   */
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 - try to refresh token
    if (response.status === 401 && this.refreshToken) {
      await this.refreshAccessToken();
      return this.request(endpoint, options);
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || JSON.stringify(error));
    }

    return response.json();
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken() {
    const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: this.refreshToken }),
    });

    if (!response.ok) {
      this.logout();
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    this.accessToken = data.access;
    localStorage.setItem('access_token', data.access);
  }

  /**
   * Register new user
   */
  async register(username, email, password, passwordConfirm, firstName = '', lastName = '') {
    return this.request('/auth/register/', {
      method: 'POST',
      body: JSON.stringify({
        username,
        email,
        password,
        password_confirm: passwordConfirm,
        first_name: firstName,
        last_name: lastName,
      }),
    });
  }

  /**
   * Login user
   */
  async login(username, password) {
    const data = await this.request('/auth/token/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    this.accessToken = data.access;
    this.refreshToken = data.refresh;
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);

    return data;
  }

  /**
   * Logout user
   */
  logout() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  /**
   * Get current user profile
   */
  async getCurrentUser() {
    return this.request('/users/me/');
  }

  /**
   * Get all published courses
   */
  async getCourses() {
    return this.request('/courses/');
  }

  /**
   * Get course details with hierarchy
   */
  async getCourseHierarchy(courseId) {
    return this.request(`/courses/${courseId}/hierarchy/`);
  }

  /**
   * Get level details
   */
  async getLevel(levelId) {
    return this.request(`/levels/${levelId}/`);
  }

  /**
   * Submit level attempt
   */
  async submitAttempt(levelId, code) {
    return this.request(`/levels/${levelId}/attempt/`, {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  /**
   * Get user's progress for a level
   */
  async getLevelProgress(levelId) {
    return this.request(`/progress/?level=${levelId}`);
  }

  /**
   * Get all user's submissions
   */
  async getSubmissions(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/submissions/?${queryString}`);
  }

  /**
   * Get user's enrollments
   */
  async getEnrollments() {
    return this.request('/enrollments/');
  }

  /**
   * Create enrollment (start free course or after payment)
   */
  async createEnrollment(courseId, transactionId = null) {
    return this.request('/enrollments/', {
      method: 'POST',
      body: JSON.stringify({
        course: courseId,
        transaction: transactionId,
      }),
    });
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.accessToken;
  }
}

export const apiClient = new APIClient();
export default apiClient;
