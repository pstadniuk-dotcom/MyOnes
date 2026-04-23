import { describe, expect, it } from 'vitest';
import {
  assertTrustedRemoteMediaUrl,
  downloadTrustedRemoteMedia,
} from '../utils/trustedRemoteMedia';

describe('trustedRemoteMedia', () => {
  it('rejects non-https URLs', async () => {
    await expect(
      assertTrustedRemoteMediaUrl('http://cdn.example.com/file.jpg', {
        allowedHosts: ['cdn.example.com'],
      }),
    ).rejects.toThrow('Only https remote URLs are allowed');
  });

  it('rejects non-allowlisted hosts', async () => {
    await expect(
      assertTrustedRemoteMediaUrl('https://evil.example.com/file.jpg', {
        allowedHosts: ['cdn.example.com'],
      }),
    ).rejects.toThrow('Remote host is not allowlisted');
  });

  it('rejects hosts that resolve to private addresses', async () => {
    await expect(
      assertTrustedRemoteMediaUrl('https://cdn.example.com/file.jpg', {
        allowedHosts: ['cdn.example.com'],
        resolveHostname: async () => [{ address: '127.0.0.1' }],
      }),
    ).rejects.toThrow('private or loopback');
  });

  it('accepts allowlisted hosts that resolve publicly', async () => {
    const url = await assertTrustedRemoteMediaUrl('https://cdn.example.com/file.jpg', {
      allowedHosts: ['cdn.example.com'],
      resolveHostname: async () => [{ address: '93.184.216.34' }],
    });

    expect(url.hostname).toBe('cdn.example.com');
  });

  it('rejects oversized downloads from content-length', async () => {
    await expect(
      downloadTrustedRemoteMedia('https://cdn.example.com/file.jpg', {
        allowedHosts: ['cdn.example.com'],
        resolveHostname: async () => [{ address: '93.184.216.34' }],
        maxBytes: 4,
        fetchImpl: async () =>
          new Response('abcdef', {
            status: 200,
            headers: {
              'content-length': '6',
              'content-type': 'image/jpeg',
            },
          }),
      }),
    ).rejects.toThrow('Remote media exceeds max size');
  });

  it('validates redirect targets before following them', async () => {
    let callCount = 0;

    await expect(
      downloadTrustedRemoteMedia('https://cdn.example.com/file.jpg', {
        allowedHosts: ['cdn.example.com'],
        resolveHostname: async (hostname) => {
          if (hostname === 'cdn.example.com') return [{ address: '93.184.216.34' }];
          return [{ address: '93.184.216.35' }];
        },
        fetchImpl: async () => {
          callCount += 1;
          return new Response(null, {
            status: 302,
            headers: { location: 'https://evil.example.com/next.jpg' },
          });
        },
      }),
    ).rejects.toThrow('Remote host is not allowlisted');

    expect(callCount).toBe(1);
  });
});
