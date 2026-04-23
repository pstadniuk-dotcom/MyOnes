import { lookup } from 'dns/promises';
import { isIP } from 'net';

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;
const DEFAULT_MAX_REDIRECTS = 3;

type ResolveHostname = (hostname: string) => Promise<Array<{ address: string }>>;

export interface TrustedRemoteMediaOptions {
  allowedHosts?: string[];
  resolveHostname?: ResolveHostname;
}

export interface DownloadTrustedRemoteMediaOptions extends TrustedRemoteMediaOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  fetchImpl?: typeof fetch;
}

export function getTrustedMediaHostAllowlist(): string[] {
  const configuredHosts = (process.env.TRUSTED_REMOTE_MEDIA_HOSTS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const defaults = [
    '*.fal.ai',
    '*.fal.media',
    'fal.ai',
    'fal.media',
  ];

  const supabaseHostname = getHostnameFromUrl(process.env.SUPABASE_URL);
  if (supabaseHostname) {
    defaults.push(supabaseHostname);
  }

  return Array.from(new Set([...defaults, ...configuredHosts]));
}

export async function assertTrustedRemoteMediaUrl(
  rawUrl: string,
  options: TrustedRemoteMediaOptions = {},
): Promise<URL> {
  const url = parseAndValidateHttpsUrl(rawUrl);
  const allowedHosts = normalizeAllowedHosts(options.allowedHosts ?? getTrustedMediaHostAllowlist());

  if (!isHostnameAllowed(url.hostname, allowedHosts)) {
    throw new Error(`Remote host is not allowlisted: ${url.hostname}`);
  }

  const resolver = options.resolveHostname ?? defaultResolveHostname;
  const addresses = isIP(url.hostname)
    ? [{ address: url.hostname }]
    : await resolver(url.hostname);

  if (!addresses.length) {
    throw new Error(`Unable to resolve remote host: ${url.hostname}`);
  }

  for (const { address } of addresses) {
    if (isPrivateOrLoopbackAddress(address)) {
      throw new Error(`Remote host resolves to a private or loopback address: ${url.hostname}`);
    }
  }

  return url;
}

export async function downloadTrustedRemoteMedia(
  rawUrl: string,
  options: DownloadTrustedRemoteMediaOptions = {},
): Promise<{ url: URL; contentType: string | null; buffer: Buffer }> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  let currentUrl = rawUrl;

  for (let redirects = 0; redirects <= maxRedirects; redirects++) {
    const trustedUrl = await assertTrustedRemoteMediaUrl(currentUrl, options);
    const response = await fetchImpl(trustedUrl, {
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (isRedirectStatus(response.status)) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error(`Redirect response missing location header: ${trustedUrl.toString()}`);
      }

      currentUrl = new URL(location, trustedUrl).toString();
      continue;
    }

    if (!response.ok) {
      throw new Error(`Failed to download remote media: ${response.status}`);
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const parsed = Number.parseInt(contentLength, 10);
      if (Number.isFinite(parsed) && parsed > maxBytes) {
        throw new Error(`Remote media exceeds max size of ${maxBytes} bytes`);
      }
    }

    const buffer = await readResponseBody(response, maxBytes);
    return {
      url: trustedUrl,
      contentType: response.headers.get('content-type'),
      buffer,
    };
  }

  throw new Error(`Too many redirects while fetching remote media`);
}

function parseAndValidateHttpsUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Invalid remote URL');
  }

  if (url.protocol !== 'https:') {
    throw new Error('Only https remote URLs are allowed');
  }

  if (!url.hostname) {
    throw new Error('Remote URL hostname is required');
  }

  return url;
}

function normalizeAllowedHosts(hosts: string[]): string[] {
  return hosts
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function isHostnameAllowed(hostname: string, allowedHosts: string[]): boolean {
  const normalizedHost = hostname.toLowerCase();

  return allowedHosts.some((entry) => {
    if (entry.startsWith('*.')) {
      const suffix = entry.slice(1);
      return normalizedHost.endsWith(suffix) && normalizedHost !== suffix.slice(1);
    }

    return normalizedHost === entry;
  });
}

async function defaultResolveHostname(hostname: string): Promise<Array<{ address: string }>> {
  const results = await lookup(hostname, { all: true, verbatim: true });
  return results.map((result) => ({ address: result.address }));
}

function isPrivateOrLoopbackAddress(address: string): boolean {
  if (isIPv4Address(address)) {
    return isPrivateOrLoopbackIPv4(address);
  }

  return isPrivateOrLoopbackIPv6(address);
}

function isIPv4Address(address: string): boolean {
  return isIP(address) === 4;
}

function isPrivateOrLoopbackIPv4(address: string): boolean {
  const octets = address.split('.').map((part) => Number.parseInt(part, 10));
  if (octets.length !== 4 || octets.some((value) => Number.isNaN(value) || value < 0 || value > 255)) {
    return true;
  }

  const [a, b] = octets;

  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;

  return false;
}

function isPrivateOrLoopbackIPv6(address: string): boolean {
  const normalized = address.toLowerCase();

  if (normalized === '::' || normalized === '::1') {
    return true;
  }

  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) {
    return true;
  }

  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }

  const mappedIpv4 = extractMappedIPv4(normalized);
  if (mappedIpv4) {
    return isPrivateOrLoopbackIPv4(mappedIpv4);
  }

  return false;
}

function extractMappedIPv4(address: string): string | null {
  const marker = '::ffff:';
  const index = address.lastIndexOf(marker);
  if (index === -1) {
    return null;
  }

  const candidate = address.slice(index + marker.length);
  return isIPv4Address(candidate) ? candidate : null;
}

async function readResponseBody(response: Response, maxBytes: number): Promise<Buffer> {
  if (!response.body) {
    return Buffer.alloc(0);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      throw new Error(`Remote media exceeds max size of ${maxBytes} bytes`);
    }

    chunks.push(value);
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}

function isRedirectStatus(status: number): boolean {
  return status >= 300 && status < 400;
}

function getHostnameFromUrl(value?: string): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

