import { useState } from 'react'
import { Icon } from '~/components/Icon'
import { useAuthContext } from '~/containers/Subscription/auth'
import { ConfirmActionModal } from './ConfirmActionModal'
import type { TeamMember } from './types'
import { useTeam } from './useTeam'

function getSubscriptionLabel(type: string | null): string {
	if (type === 'api') return 'API'
	if (type === 'llamafeed') return 'Pro'
	return 'Not assigned'
}

function ReadOnlyMemberRow({ member, isCurrentUser }: { member: TeamMember; isCurrentUser: boolean }) {
	const hasSubscription = member.subscriptionType !== null

	return (
		<div className="flex items-center gap-3 rounded-lg border border-(--sub-border-slate-100) p-3 dark:border-(--sub-border-strong)">
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="truncate text-sm text-(--sub-ink-primary) dark:text-white">{member.email}</span>
					{member.isAdmin && (
						<span className="shrink-0 rounded-full bg-(--sub-brand-primary)/10 px-2 py-0.5 text-[10px] font-medium text-(--sub-brand-primary)">
							Admin
						</span>
					)}
					{isCurrentUser && <span className="shrink-0 text-[10px] text-(--sub-text-muted)">(you)</span>}
				</div>
				<div className="mt-1">
					<span
						className={`text-xs ${
							hasSubscription ? 'text-(--sub-green-600) dark:text-(--sub-green-400)' : 'text-(--sub-text-muted)'
						}`}
					>
						{getSubscriptionLabel(member.subscriptionType)}
					</span>
				</div>
			</div>
		</div>
	)
}

export function TeamMemberView() {
	const { user } = useAuthContext()
	const { team, members, leaveTeamMutation } = useTeam()
	const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

	if (!team) return null

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-col gap-4 rounded-2xl border border-(--sub-border-slate-100) bg-white p-4 dark:border-(--sub-border-strong) dark:bg-(--sub-surface-dark)">
				<div className="flex items-center gap-2">
					<Icon name="users" height={28} width={28} className="text-(--sub-ink-primary) dark:text-white" />
					<span className="text-base leading-5 font-medium text-(--sub-ink-primary) dark:text-white">Team</span>
				</div>

				<div className="flex flex-col gap-3">
					<div className="flex items-center gap-2">
						<span className="shrink-0 text-xs leading-4 text-(--sub-text-muted)">Team name</span>
						<div className="h-0 min-w-0 flex-1 border-b border-dashed border-(--sub-border-slate-100) dark:border-(--sub-border-strong)" />
						<span className="shrink-0 text-xs leading-4 text-(--sub-ink-primary) dark:text-white">{team.name}</span>
					</div>

					<div className="flex items-center gap-2">
						<span className="shrink-0 text-xs leading-4 text-(--sub-text-muted)">Your role</span>
						<div className="h-0 min-w-0 flex-1 border-b border-dashed border-(--sub-border-slate-100) dark:border-(--sub-border-strong)" />
						<span className="shrink-0 text-xs leading-4 text-(--sub-ink-primary) dark:text-white">
							{team.isAdmin ? 'Admin' : 'Member'}
						</span>
					</div>

					<div className="flex items-center gap-2">
						<span className="shrink-0 text-xs leading-4 text-(--sub-text-muted)">Subscription</span>
						<div className="h-0 min-w-0 flex-1 border-b border-dashed border-(--sub-border-slate-100) dark:border-(--sub-border-strong)" />
						<span
							className={`shrink-0 text-xs leading-4 ${
								team.subscriptionType ? 'text-(--sub-green-600) dark:text-(--sub-green-400)' : 'text-(--sub-text-muted)'
							}`}
						>
							{getSubscriptionLabel(team.subscriptionType)}
						</span>
					</div>
				</div>

				<button
					onClick={() => setShowLeaveConfirm(true)}
					className="flex h-8 w-fit items-center gap-1.5 rounded-lg border border-(--sub-border-muted) px-3 text-xs font-medium text-(--error) dark:border-(--sub-border-strong)"
				>
					<Icon name="sign-out" height={14} width={14} />
					Leave Team
				</button>
			</div>

			{members.length > 0 && (
				<div className="flex flex-col gap-4 rounded-2xl border border-(--sub-border-slate-100) bg-white p-4 dark:border-(--sub-border-strong) dark:bg-(--sub-surface-dark)">
					<div className="flex items-center gap-2">
						<Icon name="users" height={20} width={20} className="text-(--sub-ink-primary) dark:text-white" />
						<span className="text-base leading-5 font-medium text-(--sub-ink-primary) dark:text-white">
							Members ({members.length})
						</span>
					</div>
					<div className="flex flex-col gap-2">
						{members.map((member) => (
							<ReadOnlyMemberRow key={member.id} member={member} isCurrentUser={user?.id === member.userId} />
						))}
					</div>
				</div>
			)}

			<ConfirmActionModal
				isOpen={showLeaveConfirm}
				onClose={() => setShowLeaveConfirm(false)}
				onConfirm={() => {
					void leaveTeamMutation.mutateAsync().then(() => setShowLeaveConfirm(false))
				}}
				isLoading={leaveTeamMutation.isPending}
				title="Leave Team"
				description="Are you sure you want to leave this team? Your team subscription will be revoked and you will lose access to any team-managed features."
				confirmLabel="Leave Team"
				confirmVariant="danger"
			/>
		</div>
	)
}
