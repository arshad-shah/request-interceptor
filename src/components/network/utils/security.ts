/**
 * Connection security summary for the request details panel
 */

import type { NetworkRequest } from '../../../types/network';

export interface SecurityInfo {
  protocol: string;
  issuer?: string;
  validFrom?: string;
  validTo?: string;
  keyExchange?: string;
  cipher?: string;
  subjectName?: string;
  isSecure: boolean;
}

/** CDP `Network.SecurityDetails` fields that may be attached to a captured request. */
interface CdpSecurityDetails {
  protocol?: string;
  issuer?: string;
  validFrom?: number;
  validTo?: number;
  keyExchange?: string;
  cipher?: string;
  subjectName?: string;
}

export function extractSecurityInfo(request: NetworkRequest): SecurityInfo {
  const isSecure = request.url.startsWith('https://');

  let hostname: string;
  try {
    hostname = new URL(request.url).hostname;
  } catch {
    hostname = 'unknown';
  }

  if (!isSecure) {
    return {
      protocol: 'HTTP (Insecure)',
      isSecure: false,
      subjectName: hostname,
    };
  }

  const securityDetails = (request as NetworkRequest & { securityDetails?: CdpSecurityDetails })
    .securityDetails;

  return {
    protocol: securityDetails?.protocol || 'TLS 1.2/1.3',
    issuer: securityDetails?.issuer,
    validFrom: securityDetails?.validFrom
      ? new Date(securityDetails.validFrom * 1000).toLocaleDateString()
      : undefined,
    validTo: securityDetails?.validTo
      ? new Date(securityDetails.validTo * 1000).toLocaleDateString()
      : undefined,
    keyExchange: securityDetails?.keyExchange || 'ECDHE',
    cipher: securityDetails?.cipher || 'AES_256_GCM',
    subjectName: securityDetails?.subjectName || hostname,
    isSecure: true,
  };
}
