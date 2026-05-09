import { useState } from 'react'
import { Icon } from '~/components/Icon'
import { useAuthContext } from '~/containers/Subscription/auth'
import { AssignSubscriptionModal } from './AssignSubscriptionModal'
import { ConfirmActionModal } from './ConfirmActionModal'
import type { TeamMember } from './types'
import { useTeam } from './useTeam'

function getSubscriptionLabel(type: string | null): string {
	if (type === 'api') return 'API'
	if (type === 'llamafeed') return 'Pro'
	return 'Unassigned'
}

export function MemberRow({ member }: { member: TeamMember }) {
	const { user } = useAuthContext()
	const { isAdmin, teamSubscriptions, unassignMemberMutation, removeMemberMutation } = useTeam()
	const [showAssignModal, setShowAssignModal] = useState(false)
	const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
	const [showUnassignConfirm, setShowUnassignConfirm] = useState(false)

	const isCurrentUser = user?.id === member.userId
	const isAdminMember = member.isAdmin
	const hasSubscription = member.subscriptionType !== null
	const hasAvailableSeats = teamSubscriptions.some((sub) => sub.seats.availableSeats > 0)

	return (
		<>
			<div className="flex items-center gap-3 rounded-lg border border-(--sub-border-slate-100) p-3 dark:border-(--sub-border-strong)">
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<span className="truncate text-sm text-(--sub-ink-primary) dark:text-white">{member.email}</span>
						{isAdminMember && (
							<span className="shrink-0 rounded-full bg-(--sub-brand-primary)/10 px-2 py-0.5 text-[10px] font-medium text-(--sub-brand-primary)">
								Admin
							</span>
						)}
						{isCurrentUser && <span className="shrink-0 text-[10px] text-(--sub-text-muted)">(you)</span>}
					</div>
					<div className="mt-1 flex items-center gap-2">
						<span
							className={`text-xs ${
								hasSubscription ? 'text-(--sub-green-600) dark:text-(--sub-green-400)' : 'text-(--sub-text-muted)'
							}`}
						>
							{getSubscriptionLabel(member.subscriptionType)}
						</span>
					</div>
				</div>

				{isAdmin && (
					<div className="flex shrink-0 items-center gap-1">
						{!hasSubscription ? (
							hasAvailableSeats && (
								<button
									onClick={() => setShowAssignModal(true)}
									className="flex h-7 items-center gap-1 rounded-md border border-(--sub-border-muted) px-2 text-xs font-medium text-(--sub-ink-primary) transition-colors hover:bg-(--sub-brand-primary)/5 dark:border-(--sub-border-strong) dark:text-white"
									title="Assign subscription"
								>
									<Icon name="plus" height={12} width={12} />
									Assign
								</button>
							)
						) : (
							<button
								onClick={() => setShowUnassignConfirm(true)}
								className="flex h-7 items-center gap-1 rounded-md border border-(--sub-border-muted) px-2 text-xs font-medium text-(--sub-text-muted) transition-colors hover:border-(--error) hover:text-(--error) dark:border-(--sub-border-strong)"
								title="Unassign subscription"
							>
								<Icon name="x" height={12} width={12} />
								Unassign
							</button>
						)}
						{!isCurrentUser && !isAdminMember && (
							<button
								onClick={() => setShowRemoveConfirm(true)}
								className="flex h-7 items-center justify-center rounded-md border border-(--sub-border-muted) px-2 text-(--sub-text-muted) transition-colors hover:border-(--error) hover:text-(--error) dark:border-(--sub-border-strong)"
								title="Remove member"
							>
								<Icon name="trash-2" height={14} width={14} />
							</button>
						)}
					</div>
				)}
			</div>

			{showAssignModal && (
				<AssignSubscriptionModal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} member={member} />
			)}

			<ConfirmActionModal
				isOpen={showUnassignConfirm}
				onClose={() => setShowUnassignConfirm(false)}
				onConfirm={() => {
					void unassignMemberMutation.mutateAsync({ userId: member.userId }).then(() => setShowUnassignConfirm(false))
				}}
				isLoading={unassignMemberMutation.isPending}
				title="Unassign Subscription"
				description={`This will remove the ${getSubscriptionLabel(member.subscriptionType)} subscription from ${member.email}. Their access and credits will be revoked.`}
				confirmLabel="Unassign"
				confirmVariant="danger"
			/>

			<ConfirmActionModal
				isOpen={showRemoveConfirm}
				onClose={() => setShowRemoveConfirm(false)}
				onConfirm={() => {
					void removeMemberMutation.mutateAsync({ userId: member.userId }).then(() => setShowRemoveConfirm(false))
				}}
				isLoading={removeMemberMutation.isPending}
				title="Remove Member"
				description={`Are you sure you want to remove ${member.email} from the team? Their subscription will be revoked.`}
				confirmLabel="Remove"
				confirmVariant="danger"
			/>
		</>
	)
}
