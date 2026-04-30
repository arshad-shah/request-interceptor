/**
 * GraphQL operation name matching for intercepted requests.
 */

/**
 * Check if a request body matches a GraphQL operation name.
 * Handles both single and batched (array) operations.
 *
 * @param body - The request body (string or object)
 * @param operationName - The operation name to match
 * @returns true if operation matches or no filter is specified
 */
export function matchesGraphqlOperation(body: any, operationName: string): boolean {
  if (!operationName || !body) return true; // No filter = match all

  try {
    let parsed: any;
    if (typeof body === 'string') {
      parsed = JSON.parse(body);
    } else if (typeof body === 'object') {
      parsed = body;
    } else {
      return false;
    }

    // Handle batched queries (array of operations)
    if (Array.isArray(parsed)) {
      return parsed.some((op: any) => op.operationName === operationName);
    }

    return parsed.operationName === operationName;
  } catch {
    return false;
  }
}
