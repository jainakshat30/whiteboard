/**
 * Ephemeral In-Memory Service for Access Requests, Rate Limiting, & TTL Cleanup
 */
class AccessRequestService {
  constructor() {
    // boardId -> Map(requesterUserId -> { userId, userName, requestedAt, timer })
    this.pendingRequests = new Map()
    // `${boardId}:${userId}` -> lastRequestTime (ms)
    this.rateLimitMap = new Map()

    this.RATE_LIMIT_MS = 30 * 1000 // 30 seconds
    this.REQUEST_TTL_MS = 5 * 60 * 1000 // 5 minutes
  }

  /**
   * Adds an access request for a board.
   */
  addRequest(boardId, userId, userName, onExpire) {
    if (!boardId || !userId) {
      return { success: false, reason: 'Invalid board or user ID' }
    }

    const rateKey = `${boardId}:${userId}`
    const now = Date.now()
    const lastRequest = this.rateLimitMap.get(rateKey)

    if (lastRequest && now - lastRequest < this.RATE_LIMIT_MS) {
      const waitSec = Math.ceil((this.RATE_LIMIT_MS - (now - lastRequest)) / 1000)
      return {
        success: false,
        reason: 'rate_limited',
        message: `Please wait ${waitSec} seconds before requesting again`,
      }
    }

    if (!this.pendingRequests.has(boardId)) {
      this.pendingRequests.set(boardId, new Map())
    }

    const boardMap = this.pendingRequests.get(boardId)

    if (boardMap.has(userId)) {
      return {
        success: false,
        reason: 'already_pending',
        message: 'You already have a pending access request for this board',
      }
    }

    // Set rate limit timestamp
    this.rateLimitMap.set(rateKey, now)

    // Set 5-minute auto-expiration timer
    const timer = setTimeout(() => {
      this.removeRequest(boardId, userId)
      if (typeof onExpire === 'function') {
        onExpire(boardId, userId)
      }
    }, this.REQUEST_TTL_MS)

    const requestData = {
      userId,
      userName: userName || 'Anonymous',
      requestedAt: new Date(now).toISOString(),
      timer,
    }

    boardMap.set(userId, requestData)

    return {
      success: true,
      request: {
        userId: requestData.userId,
        userName: requestData.userName,
        requestedAt: requestData.requestedAt,
      },
    }
  }

  /**
   * Removes a pending request.
   */
  removeRequest(boardId, userId) {
    const boardMap = this.pendingRequests.get(boardId)
    if (!boardMap) return null

    const req = boardMap.get(userId)
    if (req) {
      if (req.timer) clearTimeout(req.timer)
      boardMap.delete(userId)
      if (boardMap.size === 0) {
        this.pendingRequests.delete(boardId)
      }
      return req
    }
    return null
  }

  /**
   * Approves a pending request.
   */
  approveRequest(boardId, userId) {
    return this.removeRequest(boardId, userId)
  }

  /**
   * Denies a pending request.
   */
  denyRequest(boardId, userId) {
    return this.removeRequest(boardId, userId)
  }

  /**
   * Retrieves all pending requests for a given board.
   */
  getPendingRequests(boardId) {
    const boardMap = this.pendingRequests.get(boardId)
    if (!boardMap) return []

    return Array.from(boardMap.values()).map((req) => ({
      userId: req.userId,
      userName: req.userName,
      requestedAt: req.requestedAt,
    }))
  }

  /**
   * Cleans up requests when a requester disconnects.
   * Returns array of affected { boardId, userId }
   */
  handleUserDisconnect(userId) {
    if (!userId) return []
    const affected = []

    for (const [boardId, boardMap] of this.pendingRequests.entries()) {
      if (boardMap.has(userId)) {
        this.removeRequest(boardId, userId)
        affected.push({ boardId, userId })
      }
    }

    return affected
  }
}

export const accessRequestService = new AccessRequestService()
