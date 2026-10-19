/**
 * Network panel utilities
 * Parsing, analyzing, and processing network request data
 */

export type ExtendedDetailTab =
  | 'headers'
  | 'payload'
  | 'response'
  | 'timing'
  | 'cookies'
  | 'initiator'
  | 'insights'
  | 'messages';

export { parseCookies, type ParsedCookie } from './cookies';
export { extractSecurityInfo, type SecurityInfo } from './security';
export { decodeJwt, findJwtTokens, type DecodedJwt } from './jwt';
export { getInitiatorInfo, type InitiatorInfo } from './initiator';
export { analyzePerformance, type PerformanceInsight } from './insights';
export { highlightSearchTerm, getLanguageFromMime } from './text';
export {
  detectBodyType,
  parseFormData,
  parseUrlEncoded,
  parseRequestBody,
  getBodyTypeLabel,
  type ParsedFormField,
  type BodyParseType,
  type ParsedBody,
} from './body';
export { generateFetchSnippet } from './snippets';
