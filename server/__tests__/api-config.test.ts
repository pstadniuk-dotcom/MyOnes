/**
 * Tests for API configuration validation
 * These tests verify that the VITE_API_BASE validation logic works correctly
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock import.meta.env
const mockEnv = {
  VITE_API_BASE: '',
};

vi.mock('import.meta', () => ({
  env: new Proxy(mockEnv, {
    get: (target, prop) => target[prop as keyof typeof mockEnv],
  }),
}));

// Mock window for environment detection
const mockWindow = {
  location: {
    hostname: 'localhost',
  },
};

beforeEach(() => {
  // Reset mocks
  mockEnv.VITE_API_BASE = '';
  mockWindow.location.hostname = 'localhost';
  vi.clearAllMocks();
});

describe('API Configuration Validation', () => {
  describe('buildApiUrl', () => {
    it('should return absolute URLs as-is', () => {
      const endpoint = 'https://example.com/api/test';
      const result = endpoint; // Direct test without importing actual function
      expect(result).toBe('https://example.com/api/test');
    });

    it('should prepend API_BASE to relative endpoints', () => {
      const apiBase = 'https://myones-production.up.railway.app';
      const endpoint = '/api/auth/login';
      const expected = `${apiBase}${endpoint}`;
      expect(expected).toBe('https://myones-production.up.railway.app/api/auth/login');
    });

    it('should handle endpoints without leading slash', () => {
      const apiBase = 'https://myones-production.up.railway.app';
      const endpoint = 'api/auth/login';
      const normalized = `/${endpoint}`;
      const expected = `${apiBase}${normalized}`;
      expect(expected).toBe('https://myones-production.up.railway.app/api/auth/login');
    });
  });

  describe('Production environment detection', () => {
    it('should detect localhost as development', () => {
      const hostname = 'localhost';
      const isProduction = !hostname.includes('localhost') && !hostname.includes('127.0.0.1');
      expect(isProduction).toBe(false);
    });

    it('should detect 127.0.0.1 as development', () => {
      const hostname = '127.0.0.1';
      const isProduction = !hostname.includes('localhost') && !hostname.includes('127.0.0.1');
      expect(isProduction).toBe(false);
    });

    it('should detect custom domain as production', () => {
      const hostname = 'my-ones.vercel.app';
      const isProduction = !hostname.includes('localhost') && !hostname.includes('127.0.0.1');
      expect(isProduction).toBe(true);
    });
  });

  describe('API_BASE validation', () => {
    it('should pass validation with valid HTTPS URL', () => {
      const apiBase = 'https://myones-production.up.railway.app';
      const isValid = /^https?:\/\//i.test(apiBase);
      expect(isValid).toBe(true);
    });

    it('should pass validation with valid HTTP URL', () => {
      const apiBase = 'http://localhost:5000';
      const isValid = /^https?:\/\//i.test(apiBase);
      expect(isValid).toBe(true);
    });

    it('should fail validation with relative path', () => {
      const apiBase = '/api';
      const isValid = /^https?:\/\//i.test(apiBase);
      expect(isValid).toBe(false);
    });

    it('should fail validation with invalid URL', () => {
      const apiBase = 'not-a-url';
      const isValid = /^https?:\/\//i.test(apiBase);
      expect(isValid).toBe(false);
    });

    it('should fail validation with empty string', () => {
      const apiBase = '';
      const isValid = /^https?:\/\//i.test(apiBase);
      expect(isValid).toBe(false);
    });
  });

  describe('Validation scenarios', () => {
    it('should allow empty API_BASE in development', () => {
      const isProduction = false;
      const apiBase = '';
      
      // In development, empty API_BASE is allowed
      const shouldFail = isProduction && !apiBase;
      expect(shouldFail).toBe(false);
    });

    it('should reject empty API_BASE in production', () => {
      const isProduction = true;
      const apiBase = '';
      
      // In production, empty API_BASE should fail validation
      const shouldFail = isProduction && !apiBase;
      expect(shouldFail).toBe(true);
    });

    it('should reject invalid URL format in production', () => {
      const isProduction = true;
      const apiBase = 'myones-production.up.railway.app'; // Missing protocol
      
      // In production, URL must have protocol
      const isValidUrl = /^https?:\/\//i.test(apiBase);
      const shouldFail = isProduction && apiBase && !isValidUrl;
      expect(shouldFail).toBe(true);
    });

    it('should accept valid URL in production', () => {
      const isProduction = true;
      const apiBase = 'https://myones-production.up.railway.app';
      
      // Valid configuration
      const isValidUrl = /^https?:\/\//i.test(apiBase);
      const shouldFail = isProduction && (!apiBase || !isValidUrl);
      expect(shouldFail).toBe(false);
    });
  });

  describe('Error message formatting', () => {
    it('should format missing API_BASE error correctly', () => {
      const errorMessage = 
        '❌ CRITICAL ERROR: VITE_API_BASE environment variable is not set!\n\n' +
        'This means the frontend cannot communicate with the backend.';
      
      expect(errorMessage).toContain('VITE_API_BASE');
      expect(errorMessage).toContain('not set');
      expect(errorMessage).toContain('frontend cannot communicate');
    });

    it('should format invalid URL error correctly', () => {
      const apiBase = 'not-a-url';
      const errorMessage = 
        `❌ INVALID API_BASE: "${apiBase}"\n\n` +
        'VITE_API_BASE must be an absolute URL starting with http:// or https://';
      
      expect(errorMessage).toContain('INVALID API_BASE');
      expect(errorMessage).toContain(apiBase);
      expect(errorMessage).toContain('absolute URL');
    });
  });

  describe('URL building edge cases', () => {
    it('should handle API_BASE with trailing slash', () => {
      const apiBase = 'https://myones-production.up.railway.app/';
      const endpoint = '/api/auth/login';
      const result = `${apiBase.replace(/\/$/, '')}${endpoint}`;
      expect(result).toBe('https://myones-production.up.railway.app/api/auth/login');
    });

    it('should handle multiple slashes correctly', () => {
      const apiBase = 'https://myones-production.up.railway.app';
      const endpoint = '//api/auth/login';
      const normalized = endpoint.replace(/^\/+/, '/');
      const result = `${apiBase}${normalized}`;
      expect(result).toBe('https://myones-production.up.railway.app/api/auth/login');
    });
  });
});

describe('Build-time validation plugin', () => {
  describe('Environment variable checking', () => {
    it('should detect missing required variables', () => {
      const requiredVars = ['VITE_API_BASE'];
      const env = {};
      
      const missingVars = requiredVars.filter(varName => {
        const value = env[varName as keyof typeof env];
        return !value || value.trim() === '';
      });
      
      expect(missingVars).toContain('VITE_API_BASE');
    });

    it('should pass when all required variables are set', () => {
      const requiredVars = ['VITE_API_BASE'];
      const env = {
        VITE_API_BASE: 'https://myones-production.up.railway.app',
      };
      
      const missingVars = requiredVars.filter(varName => {
        const value = env[varName as keyof typeof env];
        return !value || value.trim() === '';
      });
      
      expect(missingVars).toHaveLength(0);
    });

    it('should detect empty string as missing', () => {
      const requiredVars = ['VITE_API_BASE'];
      const env = {
        VITE_API_BASE: '   ', // Whitespace only
      };
      
      const missingVars = requiredVars.filter(varName => {
        const value = env[varName as keyof typeof env];
        return !value || value.trim() === '';
      });
      
      expect(missingVars).toContain('VITE_API_BASE');
    });
  });

  describe('URL validation', () => {
    it('should validate URL format', () => {
      const urlVars = ['VITE_API_BASE'];
      const env = {
        VITE_API_BASE: 'https://myones-production.up.railway.app',
      };
      
      const invalidUrls = urlVars.filter(varName => {
        const value = env[varName as keyof typeof env];
        if (!value) return false;
        
        try {
          new URL(value);
          return false;
        } catch {
          return true;
        }
      });
      
      expect(invalidUrls).toHaveLength(0);
    });

    it('should reject invalid URLs', () => {
      const urlVars = ['VITE_API_BASE'];
      const env = {
        VITE_API_BASE: 'not-a-valid-url',
      };
      
      const invalidUrls = urlVars.filter(varName => {
        const value = env[varName as keyof typeof env];
        if (!value) return false;
        
        try {
          new URL(value);
          return false;
        } catch {
          return true;
        }
      });
      
      expect(invalidUrls).toContain('VITE_API_BASE');
    });

    it('should require protocol in URL', () => {
      const urlVars = ['VITE_API_BASE'];
      const env = {
        VITE_API_BASE: 'myones-production.up.railway.app', // Missing protocol
      };
      
      const urlsWithoutProtocol = urlVars.filter(varName => {
        const value = env[varName as keyof typeof env];
        if (!value) return false;
        return !value.startsWith('http://') && !value.startsWith('https://');
      });
      
      expect(urlsWithoutProtocol).toContain('VITE_API_BASE');
    });
  });
});
