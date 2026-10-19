/**
 * JWT detection and decoding for the request details panel
 */

import type { NetworkRequest } from '../../../types/network';

export interface DecodedJwt {
  location: string;
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  isExpired: boolean;
  expiresAt?: Date;
  issuedAt?: Date;
  issuer?: string;
  subject?: string;
}

function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

export function decodeJwt(token: string): {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
} | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));

    return { header, payload, signature: parts[2] };
  } catch {
    return null;
  }
}

export function findJwtTokens(request: NetworkRequest): DecodedJwt[] {
  const tokens: DecodedJwt[] = [];
  const jwtPattern = /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
  const seenSignatures = new Set<string>();

  const addToken = (token: string, location: string) => {
    const decoded = decodeJwt(token);
    if (decoded && !seenSignatures.has(decoded.signature)) {
      seenSignatures.add(decoded.signature);

      const exp = decoded.payload.exp as number | undefined;
      const iat = decoded.payload.iat as number | undefined;
      const expiresAt = exp ? new Date(exp * 1000) : undefined;
      const issuedAt = iat ? new Date(iat * 1000) : undefined;

      tokens.push({
        location,
        header: decoded.header,
        payload: decoded.payload,
        signature: decoded.signature,
        isExpired: expiresAt ? expiresAt < new Date() : false,
        expiresAt,
        issuedAt,
        issuer: decoded.payload.iss as string | undefined,
        subject: decoded.payload.sub as string | undefined,
      });
    }
  };

  // Check Authorization header
  const authHeader = request.requestHeaders?.find(
    h => h.name.toLowerCase() === 'authorization'
  );
  if (authHeader?.value) {
    const bearerMatch = authHeader.value.match(/^Bearer\s+(.+)$/i);
    if (bearerMatch) {
      addToken(bearerMatch[1], 'Authorization Header');
    }
  }

  // Check cookies for JWT
  const cookieHeader = request.requestHeaders?.find(
    h => h.name.toLowerCase() === 'cookie'
  );
  if (cookieHeader) {
    const matches = cookieHeader.value.match(jwtPattern);
    matches?.forEach(match => addToken(match, 'Cookie'));
  }

  // Check URL query params
  const urlMatches = request.url.match(jwtPattern);
  urlMatches?.forEach(match => addToken(match, 'URL Parameter'));

  // Check request body
  if (request.postData) {
    const bodyMatches = request.postData.match(jwtPattern);
    bodyMatches?.forEach(match => addToken(match, 'Request Body'));
  }

  return tokens;
}
