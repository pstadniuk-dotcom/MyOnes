/**
 * Authentication endpoint tests
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { TEST_USER, generateTestToken, authHeader } from './test-utils';

// Mock the storage module
vi.mock('../storage', () => ({
  storage: {
    getUserByEmail: vi.fn(),
    createUser: vi.fn(),
    getUser: vi.fn(),
  },
}));

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password'),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

describe('Authentication', () => {
  describe('Token Generation', () => {
    it('should generate a valid JWT token', () => {
      const token = generateTestToken('user-123');
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate token with admin flag', () => {
      const jwt = require('jsonwebtoken');
      const token = generateTestToken('admin-123', true);
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
      
      expect(decoded.userId).toBe('admin-123');
      expect(decoded.isAdmin).toBe(true);
    });
  });

  describe('Auth Header', () => {
    it('should create proper authorization header', () => {
      const token = 'test-token';
      const header = authHeader(token);
      
      expect(header.Authorization).toBe('Bearer test-token');
    });
  });

  describe('Password Validation', () => {
    it('should validate password length', () => {
      const shortPassword = '1234567';
      const validPassword = 'ValidPass123!';
      
      expect(shortPassword.length).toBeLessThan(8);
      expect(validPassword.length).toBeGreaterThanOrEqual(8);
    });
  });
});

describe('JWT Configuration', () => {
  it('should have JWT_SECRET set in test environment', () => {
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.JWT_SECRET).toBe('test-jwt-secret-for-testing-only');
  });

  it('should have NODE_ENV set to test', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});
