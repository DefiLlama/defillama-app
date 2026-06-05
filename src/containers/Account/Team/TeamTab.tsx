import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { Icon } from '~/components/Icon'
import { CreateTeamCard } from './CreateTeamCard'
import { TeamFaqCard } from './TeamFaqCard'
import { TeamInfoCard } from './TeamInfoCard'
import { TeamInvitesCard } from './TeamInvitesCard'
import { TeamMembersCard } from './TeamMembersCard'
import { TeamMemberView } from './TeamMemberView'
import { TeamSeatsCard } from './TeamSeatsCard'
import { useTeam } from './useTeam'

const getQueryParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

export function TeamTab() {
	const router = useRouter()
	const token = router.isReady ? getQueryParam(router.query.token) : undefined
	const { team, isTeamLoading, isAdmin, inviteAcceptance } = useTeam({ inviteToken: token })

	useEffect(() => {
		if (!router.isReady || !token || !inviteAcceptance.isSuccess) return
		const { token: _ignored, ...nextQuery } = router.query
		void router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
	}, [inviteAcceptance.isSuccess, router, token])

	if (inviteAcceptance.isFetching && token) {
		return (
			<div className="flex flex-col items-center gap-4 py-16">
				<div className="size-8 animate-spin rounded-full border-2 border-(--sub-brand-primary) border-t-transparent" />
				<p className="text-sm text-(--sub-text-muted)">Accepting invite...</p>
			</div>
		)
	}

	if (inviteAcceptance.isError && token) {
		return (
			<div className="flex flex-col items-center gap-4 py-16">
				<div className="flex size-16 items-center justify-center rounded-full bg-(--error)/10">
					<Icon name="alert-triangle" height={32} width={32} className="text-(--error)" />
				</div>
				<div className="flex flex-col gap-2 text-center">
					<h2 className="text-lg font-semibold text-(--sub-ink-primary) dark:text-white">Unable to Accept Invite</h2>
					<p className="text-sm text-(--sub-text-muted)">
						{inviteAcceptance.error?.message ||
							'Something went wrong. The invite may have expired or already been used.'}
					</p>
					<p className="text-sm text-(--sub-text-muted)">
						Make sure you&apos;re signed in with the email address the invite was sent to.
					</p>
				</div>
			</div>
		)
	}

	if (isTeamLoading) {
		return (
			<div className="flex h-64 items-center justify-center">
				<div className="size-8 animate-spin rounded-full border-2 border-(--sub-brand-primary) border-t-transparent" />
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
