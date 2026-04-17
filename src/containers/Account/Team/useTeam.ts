import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { AUTH_SERVER } from '~/constants'
import { useAuthContext } from '~/containers/Subscription/auth'
import { handleSimpleFetchResponse } from '~/utils/async'
import type { PurchaseSeatsResponse, Team } from './types'

const normalizeHttpErrorMessage = (message: string | undefined, fallbackMessage: string): string => {
	if (!message) return fallbackMessage
	if (!message.startsWith('[HTTP] [error]')) return message
	const colonIndex = message.indexOf(':')
	if (colonIndex === -1) return fallbackMessage
	const details = message.slice(colonIndex + 1).trim()
	return details || fallbackMessage
}

const getErrorMessage = (error: unknown, fallbackMessage: string): string =>
	error instanceof Error ? normalizeHttpErrorMessage(error.message, fallbackMessage) : fallbackMessage

export const useTeam = () => {
	const { user, isAuthenticated, authorizedFetch } = useAuthContext()!
	const queryClient = useQueryClient()
	const teamQueryKey = ['team', user?.id]

	/** Snapshot current team cache, apply an optimistic transform, return the snapshot for rollback. */
	const optimistic = (updater: (old: Team) => Team) => {
		const previous = queryClient.getQueryData<Team | null>(teamQueryKey)
		if (previous) {
			queryClient.setQueryData<Team | null>(teamQueryKey, updater(previous))
		}
		return { previous }
	}

	const rollback = (_err: unknown, _vars: unknown, context: { previous?: Team | null } | undefined) => {
		if (context?.previous !== undefined) {
			queryClient.setQueryData<Team | null>(teamQueryKey, context.previous)
		}
	}

	const refetch = () => {
		void queryClient.invalidateQueries({ queryKey: teamQueryKey })
	}

	// ── Query: GET /team ──
	const teamQuery = useQuery({
		queryKey: teamQueryKey,
		queryFn: async (): Promise<Team | null> => {
			if (!isAuthenticated) return null

			const response = await authorizedFetch(`${AUTH_SERVER}/team`)
			if (!response) return null

			const data = await handleSimpleFetchResponse(response).then((res) => res.json())
			return data?.team ?? null
		},
		enabled: isAuthenticated,
		staleTime: 1000 * 60 * 5,
		refetchOnWindowFocus: false
	})

	const team = teamQuery.data ?? null
	const isTeamLoading = teamQuery.isLoading
	const isTeamError = teamQuery.isError
	const isAdmin = team?.isAdmin === true
	const members = team?.members ?? []
	const pendingInvites = team?.pendingInvites ?? []
	const teamSubscriptions = team?.subscriptions ?? []

	// ── Mutation: POST /team/create ──
	const createTeamMutation = useMutation({
		mutationFn: async ({ name }: { name: string }) => {
			const response = await authorizedFetch(`${AUTH_SERVER}/team/create`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name })
			})
			if (!response) throw new Error('Not authenticated')
			const normalized = await handleSimpleFetchResponse(response).catch((error) => {
				throw new Error(getErrorMessage(error, 'Failed to create team'))
			})
			return normalized.json()
		},
		onSuccess: () => {
			toast.success('Team created successfully!')
			refetch()
			void queryClient.invalidateQueries({ queryKey: ['auth', 'status'] })
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, 'Failed to create team'))
		}
	})

	// ── Mutation: POST /team/update ──
	const updateTeamMutation = useMutation({
		mutationFn: async ({ name }: { name: string }) => {
			const response = await authorizedFetch(`${AUTH_SERVER}/team/update`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name })
			})
			if (!response) throw new Error('Not authenticated')
			const normalized = await handleSimpleFetchResponse(response).catch((error) => {
				throw new Error(getErrorMessage(error, 'Failed to update team'))
			})
			return normalized.json()
		},
		onMutate: async ({ name }) => {
			await queryClient.cancelQueries({ queryKey: teamQueryKey })
			return optimistic((old) => ({ ...old, name }))
		},
		onError: (error, _vars, context) => {
			rollback(error, _vars, context)
			toast.error(getErrorMessage(error, 'Failed to update team'))
		},
		onSettled: () => refetch()
	})

	// ── Mutation: POST /team/seats/purchase ──
	const purchaseSeatsMutation = useMutation({
		mutationFn: async (data: {
			subscriptionType: string
			seatCount: number
			billingInterval: 'month' | 'year'
			redirectUrl: string
			cancelUrl: string
		}): Promise<PurchaseSeatsResponse> => {
			const response = await authorizedFetch(`${AUTH_SERVER}/team/seats/purchase`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			})
			if (!response) throw new Error('Not authenticated')
			const normalized = await handleSimpleFetchResponse(response).catch((error) => {
				throw new Error(getErrorMessage(error, 'Failed to purchase seats'))
			})
			return normalized.json()
		},
		onSuccess: (data) => {
			if (data.action === 'seats_added') {
				toast.success(`${data.seatsAdded} seat(s) added successfully!`)
				refetch()
			}
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, 'Failed to purchase seats'))
		}
	})

	// ── Mutation: POST /team/seats/upgrade ──
	// No optimistic update: billingInterval flips on the team sub and all assigned member subs.
	const upgradeSeatsMutation = useMutation({
		mutationFn: async (data: { subscriptionType: string }) => {
			const response = await authorizedFetch(`${AUTH_SERVER}/team/seats/upgrade`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			})
			if (!response) throw new Error('Not authenticated')
			const normalized = await handleSimpleFetchResponse(response).catch((error) => {
				throw new Error(getErrorMessage(error, 'Failed to upgrade subscription'))
			})
			return normalized.json()
		},
		onSuccess: () => {
			toast.success('Subscription upgraded to yearly billing')
			refetch()
			void queryClient.invalidateQueries({ queryKey: ['subscription'] })
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, 'Failed to upgrade subscription'))
		}
	})

	// ── Mutation: POST /team/seats ──
	const setSeatsMutation = useMutation({
		mutationFn: async (data: { subscriptionType: string; seatCount: number }) => {
			const response = await authorizedFetch(`${AUTH_SERVER}/team/seats`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			})
			if (!response) throw new Error('Not authenticated')
			const normalized = await handleSimpleFetchResponse(response).catch((error) => {
				throw new Error(getErrorMessage(error, 'Failed to update seats'))
			})
			return normalized.json()
		},
		onMutate: async ({ subscriptionType, seatCount }) => {
			await queryClient.cancelQueries({ queryKey: teamQueryKey })
			// seatCount=0 cancels at period end on the backend; skip optimistic update so
			// the canonical canceledAtPeriodEnd/effectiveAt state comes from the refetch.
			if (seatCount === 0) return { previous: queryClient.getQueryData<Team | null>(teamQueryKey) }
			return optimistic((old) => ({
				...old,
				subscriptions: old.subscriptions.map((sub) =>
					sub.type === subscriptionType
						? {
								...sub,
								seats: {
									...sub.seats,
									seatCount,
									availableSeats: seatCount - sub.seats.occupiedSeats
								}
							}
						: sub
				)
			}))
		},
		onError: (error, _vars, context) => {
			rollback(error, _vars, context)
			toast.error(getErrorMessage(error, 'Failed to update seats'))
		},
		onSuccess: (_data, { seatCount }) => {
			if (seatCount === 0) toast.success('Subscription will cancel at the end of the current period')
		},
		onSettled: () => refetch()
	})

	// ── Mutation: POST /team/member/assign ──
	const assignMemberMutation = useMutation({
		mutationFn: async (data: { userId: string; subscriptionType: string }) => {
			const response = await authorizedFetch(`${AUTH_SERVER}/team/member/assign`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			})
			if (!response) throw new Error('Not authenticated')
			const normalized = await handleSimpleFetchResponse(response).catch((error) => {
				throw new Error(getErrorMessage(error, 'Failed to assign member'))
			})
			return normalized.json()
		},
		onMutate: async ({ userId, subscriptionType }) => {
			await queryClient.cancelQueries({ queryKey: teamQueryKey })
			return optimistic((old) => ({
				...old,
				members: old.members.map((m) => (m.userId === userId ? { ...m, subscriptionType } : m)),
				subscriptions: old.subscriptions.map((sub) =>
					sub.type === subscriptionType
						? {
								...sub,
								seats: {
									...sub.seats,
									occupiedSeats: sub.seats.occupiedSeats + 1,
									availableSeats: sub.seats.availableSeats - 1
								}
							}
						: sub
				)
			}))
		},
		onError: (error, _vars, context) => {
			rollback(error, _vars, context)
			toast.error(getErrorMessage(error, 'Failed to assign member'))
		},
		onSuccess: () => {
			toast.success('Subscription assigned successfully!')
			void queryClient.invalidateQueries({ queryKey: ['subscription'] })
		},
		onSettled: () => refetch()
	})

	// ── Mutation: POST /team/member/unassign ──
	const unassignMemberMutation = useMutation({
		mutationFn: async (data: { userId: string }) => {
			const response = await authorizedFetch(`${AUTH_SERVER}/team/member/unassign`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			})
			if (!response) throw new Error('Not authenticated')
			const normalized = await handleSimpleFetchResponse(response).catch((error) => {
				throw new Error(getErrorMessage(error, 'Failed to unassign member'))
			})
			return normalized.json()
		},
		onMutate: async ({ userId }) => {
			await queryClient.cancelQueries({ queryKey: teamQueryKey })
			const previous = queryClient.getQueryData<Team | null>(teamQueryKey)
			const member = previous?.members.find((m) => m.userId === userId)
			const prevSubType = member?.subscriptionType

			if (previous) {
				queryClient.setQueryData<Team | null>(teamQueryKey, {
					...previous,
					members: previous.members.map((m) => (m.userId === userId ? { ...m, subscriptionType: null } : m)),
					subscriptions: previous.subscriptions.map((sub) =>
						prevSubType && sub.type === prevSubType
							? {
									...sub,
									seats: {
										...sub.seats,
										occupiedSeats: sub.seats.occupiedSeats - 1,
										availableSeats: sub.seats.availableSeats + 1
									}
								}
							: sub
					)
				})
			}
			return { previous }
		},
		onError: (error, _vars, context) => {
			rollback(error, _vars, context)
			toast.error(getErrorMessage(error, 'Failed to unassign member'))
		},
		onSuccess: () => {
			toast.success('Subscription removed from member')
			void queryClient.invalidateQueries({ queryKey: ['subscription'] })
		},
		onSettled: () => refetch()
	})

	// ── Mutation: POST /team/invite ──
	const inviteMemberMutation = useMutation({
		mutationFn: async (data: { email: string }) => {
			const response = await authorizedFetch(`${AUTH_SERVER}/team/invite`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			})
			if (!response) throw new Error('Not authenticated')
			const normalized = await handleSimpleFetchResponse(response).catch((error) => {
				throw new Error(getErrorMessage(error, 'Failed to send invite'))
			})
			return normalized.json()
		},
		onMutate: async ({ email }) => {
			await queryClient.cancelQueries({ queryKey: teamQueryKey })
			const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
			return optimistic((old) => ({
				...old,
				pendingInvites: [
					...old.pendingInvites,
					{
						id: `optimistic-${Date.now()}`,
						email,
						status: 'pending' as const,
						createdAt: new Date().toISOString(),
						expiresAt
					}
				]
			}))
		},
		onError: (error, _vars, context) => {
			rollback(error, _vars, context)
			toast.error(getErrorMessage(error, 'Failed to send invite'))
		},
		onSuccess: () => {
			toast.success('Invite sent successfully!')
		},
		onSettled: () => refetch()
	})

	// ── Mutation: POST /team/invite/resend ──
	const resendInviteMutation = useMutation({
		mutationFn: async (data: { inviteId: string }) => {
			const response = await authorizedFetch(`${AUTH_SERVER}/team/invite/resend`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			})
			if (!response) throw new Error('Not authenticated')
			const normalized = await handleSimpleFetchResponse(response).catch((error) => {
				throw new Error(getErrorMessage(error, 'Failed to resend invite'))
			})
			return normalized.json()
		},
		onSuccess: () => {
			toast.success('Invite resent')
			refetch()
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, 'Failed to resend invite'))
		}
	})

	// ── Mutation: POST /team/invite/revoke ──
	const revokeInviteMutation = useMutation({
		mutationFn: async (data: { inviteId: string }) => {
			const response = await authorizedFetch(`${AUTH_SERVER}/team/invite/revoke`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			})
			if (!response) throw new Error('Not authenticated')
			const normalized = await handleSimpleFetchResponse(response).catch((error) => {
				throw new Error(getErrorMessage(error, 'Failed to revoke invite'))
			})
			return normalized.json()
		},
		onMutate: async ({ inviteId }) => {
			await queryClient.cancelQueries({ queryKey: teamQueryKey })
			return optimistic((old) => ({
				...old,
				pendingInvites: old.pendingInvites.filter((inv) => inv.id !== inviteId)
			}))
		},
		onError: (error, _vars, context) => {
			rollback(error, _vars, context)
			toast.error(getErrorMessage(error, 'Failed to revoke invite'))
		},
		onSuccess: () => {
			toast.success('Invite revoked')
		},
		onSettled: () => refetch()
	})

	// ── Mutation: POST /team/member/remove ──
	const removeMemberMutation = useMutation({
		mutationFn: async (data: { userId: string }) => {
			const response = await authorizedFetch(`${AUTH_SERVER}/team/member/remove`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			})
			if (!response) throw new Error('Not authenticated')
			const normalized = await handleSimpleFetchResponse(response).catch((error) => {
				throw new Error(getErrorMessage(error, 'Failed to remove member'))
			})
			return normalized.json()
		},
		onMutate: async ({ userId }) => {
			await queryClient.cancelQueries({ queryKey: teamQueryKey })
			const previous = queryClient.getQueryData<Team | null>(teamQueryKey)
			const member = previous?.members.find((m) => m.userId === userId)
			const prevSubType = member?.subscriptionType

			if (previous) {
				queryClient.setQueryData<Team | null>(teamQueryKey, {
					...previous,
					members: previous.members.filter((m) => m.userId !== userId),
					subscriptions: previous.subscriptions.map((sub) =>
						prevSubType && sub.type === prevSubType
							? {
									...sub,
									seats: {
										...sub.seats,
										occupiedSeats: sub.seats.occupiedSeats - 1,
										availableSeats: sub.seats.availableSeats + 1
									}
								}
							: sub
					)
				})
			}
			return { previous }
		},
		onError: (error, _vars, context) => {
			rollback(error, _vars, context)
			toast.error(getErrorMessage(error, 'Failed to remove member'))
		},
		onSuccess: () => {
			toast.success('Member removed from team')
		},
		onSettled: () => refetch()
	})

	// ── Mutation: POST /team/leave ──
	const leaveTeamMutation = useMutation({
		mutationFn: async () => {
			const response = await authorizedFetch(`${AUTH_SERVER}/team/leave`, {
				method: 'POST'
			})
			if (!response) throw new Error('Not authenticated')
			const normalized = await handleSimpleFetchResponse(response).catch((error) => {
				throw new Error(getErrorMessage(error, 'Failed to leave team'))
			})
			return normalized.json()
		},
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey: teamQueryKey })
			const previous = queryClient.getQueryData<Team | null>(teamQueryKey)
			queryClient.setQueryData<Team | null>(teamQueryKey, null)
			return { previous }
		},
		onError: (error, _vars, context) => {
			rollback(error, _vars, context)
			toast.error(getErrorMessage(error, 'Failed to leave team'))
		},
		onSuccess: () => {
			toast.success('You have left the team')
			void queryClient.invalidateQueries({ queryKey: ['auth', 'status'] })
			void queryClient.invalidateQueries({ queryKey: ['subscription'] })
		},
		onSettled: () => refetch()
	})

	// ── Mutation: POST /team/invite/accept ──
	const acceptInviteMutation = useMutation({
		mutationFn: async (data: { token: string }) => {
			const response = await authorizedFetch(`${AUTH_SERVER}/team/invite/accept`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			})
			if (!response) throw new Error('Not authenticated')
			const normalized = await handleSimpleFetchResponse(response).catch((error) => {
				throw new Error(getErrorMessage(error, 'Failed to accept invite'))
			})
			return normalized.json()
		},
		onSuccess: () => {
			toast.success('You have joined the team!')
			refetch()
			void queryClient.invalidateQueries({ queryKey: ['auth', 'status'] })
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, 'Failed to accept invite'))
		}
	})

	return {
		// Query state
		team,
		isTeamLoading,
		isTeamError,
		isAdmin,
		members,
		pendingInvites,
		teamSubscriptions,
		refetchTeam: teamQuery.refetch,

		// Mutations
		createTeamMutation,
		updateTeamMutation,
		purchaseSeatsMutation,
		upgradeSeatsMutation,
		setSeatsMutation,
		assignMemberMutation,
		unassignMemberMutation,
		inviteMemberMutation,
		resendInviteMutation,
		revokeInviteMutation,
		removeMemberMutation,
		leaveTeamMutation,
		acceptInviteMutation
	}
}
