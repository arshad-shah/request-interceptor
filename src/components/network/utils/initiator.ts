/**
 * Initiator analysis for the request details panel
 */

import type { NetworkRequest } from '../../../types/network';

export interface InitiatorInfo {
  type: 'parser' | 'script' | 'preload' | 'preflight' | 'redirect' | 'other';
  description: string;
  url?: string;
  lineNumber?: number;
  stack?: Array<{
    functionName: string;
    url: string;
    lineNumber: number;
    columnNumber: number;
  }>;
}

/** Subset of the CDP `Network.Initiator` object, when the capture layer forwards it. */
interface CdpInitiator {
  type?: string;
  url?: string;
  lineNumber?: number;
  stack?: {
    callFrames?: Array<{
      functionName?: string;
      url?: string;
      lineNumber?: number;
      columnNumber?: number;
    }>;
  };
}

export function getInitiatorInfo(request: NetworkRequest): InitiatorInfo {
  // Typed as a string on NetworkRequest, but CDP delivers a structured object.
  const initiator = request.initiator as unknown as CdpInitiator | undefined;

  if (!initiator) {
    return {
      type: 'other',
      description: 'Unknown initiator',
    };
  }

  const type = (initiator.type || 'other') as InitiatorInfo['type'];
  let description = '';
  let stack: InitiatorInfo['stack'];

  switch (type) {
    case 'parser':
      description = `HTML parser${initiator.url ? ` (${initiator.url})` : ''}`;
      break;
    case 'script': {
      description = 'JavaScript execution';
      const callFrames = initiator.stack?.callFrames;
      if (callFrames && callFrames.length > 0) {
        stack = callFrames.slice(0, 8).map(frame => ({
          functionName: frame.functionName || '(anonymous)',
          url: frame.url || '',
          lineNumber: frame.lineNumber || 0,
          columnNumber: frame.columnNumber || 0,
        }));
      }
      break;
    }
    case 'preload':
      description = 'Resource preload hint';
      break;
    case 'preflight':
      description = 'CORS preflight request';
      break;
    case 'redirect':
      description = `Redirect from ${initiator.url || 'unknown'}`;
      break;
    default:
      description = initiator.url || 'Unknown source';
  }

  return {
    type,
    description,
    url: initiator.url,
    lineNumber: initiator.lineNumber,
    stack,
  };
}
