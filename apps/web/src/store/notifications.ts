import { create } from 'zustand'

export type PendingRequest = {
  userId: string
  userName: string
  requestedAt: string
}

export type AudienceRequestState = 'idle' | 'pending' | 'approved' | 'denied'

type NotificationStore = {
  pendingRequests: PendingRequest[]
  audienceState: AudienceRequestState
  setPendingRequests: (requests: PendingRequest[]) => void
  addPendingRequest: (request: PendingRequest) => void
  removePendingRequest: (userId: string) => void
  setAudienceState: (state: AudienceRequestState) => void
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  pendingRequests: [],
  audienceState: 'idle',
  setPendingRequests: (pendingRequests) => set({ pendingRequests }),
  addPendingRequest: (request) =>
    set((state) => {
      if (state.pendingRequests.some((r) => r.userId === request.userId)) {
        return state
      }
      return { pendingRequests: [request, ...state.pendingRequests] }
    }),
  removePendingRequest: (userId) =>
    set((state) => ({
      pendingRequests: state.pendingRequests.filter((r) => r.userId !== userId),
    })),
  setAudienceState: (audienceState) => set({ audienceState }),
}))
