import { useRouter } from 'next/router'
import { useEffect, useRef } from 'react'
import { Icon } from '~/components/Icon'
import { CreateTeamCard } from './CreateTeamCard'
import { TeamFaqCard } from './TeamFaqCard'
import { TeamInfoCard } from './TeamInfoCard'
import { TeamInvitesCard } from './TeamInvitesCard'
import { TeamMembersCard } from './TeamMembersCard'
import { TeamMemberView } from './TeamMemberView'
import { TeamSeatsCard } from './TeamSeatsCard'
import { useTeam } from './useTeam'

export function TeamTab() {
	const router = useRouter()
	const { team, isTeamLoading, isAdmin, acceptInviteMutation } = useTeam()
	const acceptedRef = useRef(false)

	const token = Array.isArray(router.query.token) ? router.query.token[0] : router.query.token

	// Auto-accept invite when ?token=XXX is present
	useEffect(() => {
		if (!token || acceptedRef.current) return
		if (acceptInviteMutation.isPending || acceptInviteMutation.isSuccess || acceptInviteMutation.isError) return

		acceptedRef.current = true
		void acceptInviteMutation.mutateAsync({ token }).then(() => {
			const { token: _ignored, ...nextQuery } = router.query
			void router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
		})
	}, [token, acceptInviteMutation, router])

	// Reset ref when token is removed from URL
	useEffect(() => {
		if (!token) {
			acceptedRef.current = false
		}
	}, [token])

	if (acceptInviteMutation.isPending) {
		return (
			<div className="flex flex-col items-center gap-4 py-16">
				<div className="h-8 w-8 animate-spin rounded-full border-2 border-(--sub-brand-primary) border-t-transparent" />
				<p className="text-sm text-(--sub-text-muted)">Accepting invite...</p>
			</div>
		)
	}

	if (acceptInviteMutation.isError && token) {
		return (
			<div className="flex flex-col items-center gap-4 py-16">
				<div className="flex h-16 w-16 items-center justify-center rounded-full bg-(--error)/10">
					<Icon name="alert-triangle" height={32} width={32} className="text-(--error)" />
				</div>
				<div className="flex flex-col gap-2 text-center">
					<h2 className="text-lg font-semibold text-(--sub-ink-primary) dark:text-white">Unable to Accept Invite</h2>
					<p className="text-sm text-(--sub-text-muted)">
						{acceptInviteMutation.error?.message ||
							'Something went wrong. The invite may have expired or already been used.'}
					</p>
				</div>
			</div>
		)
	}

	if (isTeamLoading) {
		return (
			<div className="flex h-64 items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-2 border-(--sub-brand-primary) border-t-transparent" />
			</div>
		)
	}

	if (!team) {
		return (
			<div className="flex flex-col gap-3">
				<CreateTeamCard />
				<TeamFaqCard />
			</div>
		)
	}

	if (!isAdmin) {
		return (
			<div className="flex flex-col gap-3">
				<TeamMemberView />
				<TeamFaqCard defaultOpenIndex={null} />
			</div>
		)
	}

	return (
		<div className="flex flex-col gap-3">
			<TeamInfoCard />
			<TeamSeatsCard />
			<TeamMembersCard />
			<TeamInvitesCard />
			<TeamFaqCard defaultOpenIndex={null} />
		</div>
	)
}
