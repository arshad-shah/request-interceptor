/**
 * Cookie parsing for the request details panel
 */

import type { NetworkHeader } from '../../../types/network';

export interface ParsedCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: string;
  maxAge?: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite?: string;
  size: number;
}

export function parseCookies(
  requestHeaders: NetworkHeader[] | undefined,
  responseHeaders: NetworkHeader[] | undefined
): { request: ParsedCookie[]; response: ParsedCookie[] } {
  const requestCookies: ParsedCookie[] = [];
  const responseCookies: ParsedCookie[] = [];

  // Parse request Cookie header
  const cookieHeader = requestHeaders?.find(h => h.name.toLowerCase() === 'cookie');
  if (cookieHeader) {
    const pairs = cookieHeader.value.split(';').map(p => p.trim()).filter(Boolean);
    for (const pair of pairs) {
      const eqIndex = pair.indexOf('=');
      if (eqIndex > 0) {
        const name = pair.substring(0, eqIndex).trim();
        const value = pair.substring(eqIndex + 1).trim();
        requestCookies.push({
          name,
          value,
          httpOnly: false,
          secure: false,
          size: pair.length,
        });
      }
    }
  }

  // Parse response Set-Cookie headers
  const setCookieHeaders = responseHeaders?.filter(
    h => h.name.toLowerCase() === 'set-cookie'
  ) || [];

  for (const header of setCookieHeaders) {
    const parts = header.value.split(';').map(p => p.trim());
    const [nameValue, ...attributes] = parts;
    const eqIndex = nameValue.indexOf('=');

    if (eqIndex > 0) {
      const name = nameValue.substring(0, eqIndex).trim();
      const value = nameValue.substring(eqIndex + 1).trim();

      const cookie: ParsedCookie = {
        name,
        value,
        httpOnly: false,
        secure: false,
        size: header.value.length,
      };

      for (const attr of attributes) {
        const attrLower = attr.toLowerCase();
        const attrEqIndex = attr.indexOf('=');

        if (attrLower === 'httponly') {
          cookie.httpOnly = true;
        } else if (attrLower === 'secure') {
          cookie.secure = true;
        } else if (attrEqIndex > 0) {
          const attrName = attr.substring(0, attrEqIndex).trim().toLowerCase();
          const attrValue = attr.substring(attrEqIndex + 1).trim();

          switch (attrName) {
            case 'domain': cookie.domain = attrValue; break;
            case 'path': cookie.path = attrValue; break;
            case 'expires': cookie.expires = attrValue; break;
            case 'max-age': cookie.maxAge = attrValue; break;
            case 'samesite': cookie.sameSite = attrValue; break;
          }
        }
      }

      responseCookies.push(cookie);
    }
  }

  return { request: requestCookies, response: responseCookies };
}
