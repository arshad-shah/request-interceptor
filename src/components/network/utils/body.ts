/**
 * Request body parsing (JSON, multipart form data, URL-encoded)
 */

export interface ParsedFormField {
  name: string;
  value: string;
  filename?: string;
  contentType?: string;
  isFile?: boolean;
}

export type BodyParseType = 'json' | 'form-data' | 'url-encoded' | 'text' | 'binary';

export interface ParsedBody {
  type: BodyParseType;
  parsed: ParsedFormField[] | Record<string, unknown> | string | null;
  raw: string;
  error?: string;
}

/**
 * Detect the type of request body based on content and headers
 */
export function detectBodyType(body: string, contentType?: string): BodyParseType {
  const ct = contentType?.toLowerCase() || '';
  
  // Check content-type header first
  if (ct.includes('application/json')) return 'json';
  if (ct.includes('multipart/form-data')) return 'form-data';
  if (ct.includes('application/x-www-form-urlencoded')) return 'url-encoded';
  
  // Fallback: detect from content
  if (body.startsWith('{') || body.startsWith('[')) {
    try {
      JSON.parse(body);
      return 'json';
    } catch {
      // Not valid JSON
    }
  }
  
  // Check for multipart boundary
  if (body.startsWith('------') || body.startsWith('--')) {
    return 'form-data';
  }
  
  // Check for URL-encoded format
  if (/^[\w-]+=/.test(body) && body.includes('&')) {
    return 'url-encoded';
  }
  
  return 'text';
}

/**
 * Parse multipart form data body
 */
export function parseFormData(body: string): ParsedFormField[] {
  const fields: ParsedFormField[] = [];
  
  // Find the boundary
  const boundaryMatch = body.match(/^-+([^\r\n]+)/);
  if (!boundaryMatch) return fields;
  
  const boundary = boundaryMatch[0];
  const parts = body.split(boundary).filter(part => 
    part.trim() && !part.trim().startsWith('--')
  );
  
  for (const part of parts) {
    // Parse Content-Disposition header
    const dispositionMatch = part.match(/Content-Disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]+)")?/i);
    if (!dispositionMatch) continue;
    
    const name = dispositionMatch[1];
    const filename = dispositionMatch[2];
    
    // Parse Content-Type if present
    const contentTypeMatch = part.match(/Content-Type:\s*([^\r\n]+)/i);
    const contentType = contentTypeMatch ? contentTypeMatch[1].trim() : undefined;
    
    // Extract value (after the blank line)
    const valueMatch = part.split(/\r?\n\r?\n/);
    let value = valueMatch.length > 1 ? valueMatch.slice(1).join('\n\n').trim() : '';
    
    // Clean up trailing boundary characters
    value = value.replace(/^-+$/, '').trim();
    
    fields.push({
      name,
      value: filename ? `[File: ${filename}]` : value,
      filename,
      contentType,
      isFile: !!filename,
    });
  }
  
  return fields;
}

/**
 * Parse URL-encoded form data
 */
export function parseUrlEncoded(body: string): ParsedFormField[] {
  const fields: ParsedFormField[] = [];
  
  try {
    const params = new URLSearchParams(body);
    for (const [name, value] of params) {
      fields.push({ name, value: decodeURIComponent(value) });
    }
  } catch {
    // Manual parsing if URLSearchParams fails
    const pairs = body.split('&');
    for (const pair of pairs) {
      const eqIndex = pair.indexOf('=');
      if (eqIndex > 0) {
        const name = decodeURIComponent(pair.substring(0, eqIndex));
        const value = decodeURIComponent(pair.substring(eqIndex + 1));
        fields.push({ name, value });
      }
    }
  }
  
  return fields;
}

/**
 * Parse request body into structured format
 */
export function parseRequestBody(body: string, contentType?: string): ParsedBody {
  if (!body) {
    return { type: 'text', parsed: null, raw: body };
  }
  
  const type = detectBodyType(body, contentType);
  
  switch (type) {
    case 'json':
      try {
        const parsed = JSON.parse(body);
        return { type, parsed, raw: body };
      } catch (e) {
        return { type, parsed: null, raw: body, error: 'Invalid JSON' };
      }
    
    case 'form-data':
      return { type, parsed: parseFormData(body), raw: body };
    
    case 'url-encoded':
      return { type, parsed: parseUrlEncoded(body), raw: body };
    
    default:
      return { type: 'text', parsed: body, raw: body };
  }
}

/**
 * Get a user-friendly label for body type
 */
export function getBodyTypeLabel(type: BodyParseType): string {
  switch (type) {
    case 'json': return 'JSON';
    case 'form-data': return 'Form Data';
    case 'url-encoded': return 'URL Encoded';
    case 'binary': return 'Binary';
    default: return 'Text';
  }
}
