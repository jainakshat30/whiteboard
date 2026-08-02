/**
 * Validates WebSocket stateless message payloads.
 */
export function parseAndValidateMessage(payload) {
  if (!payload || typeof payload !== 'string') {
    return { valid: false, error: 'Payload must be a non-empty string' }
  }

  let parsed
  try {
    parsed = JSON.parse(payload)
  } catch (e) {
    return { valid: false, error: 'Invalid JSON payload' }
  }

  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, error: 'Payload must be a JSON object' }
  }

  const validTypes = [
    'get_role',
    'request_access',
    'approve_access',
    'deny_access',
    'get_pending_requests',
  ]

  if (!parsed.type || !validTypes.includes(parsed.type)) {
    return { valid: false, error: `Invalid or unknown message type: ${parsed.type}` }
  }

  return { valid: true, data: parsed }
}
