/**
 * Test utilities and setup
 */

import { vi } from 'vitest';

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Mock console methods to reduce noise in tests
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

// Restore console.error so we can see actual errors
// vi.spyOn(console, 'error').mockImplementation(() => {});

export const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  name: 'Test User',
};

export const TEST_ADMIN = {
  email: 'admin@example.com',
  password: 'AdminPassword123!',
  name: 'Admin User',
  isAdmin: true,
};

/**
 * Generate a mock JWT token for testing
 */
export function generateTestToken(userId: string, isAdmin = false): string {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { userId, isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

/**
 * Create authorization header
 */
export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
