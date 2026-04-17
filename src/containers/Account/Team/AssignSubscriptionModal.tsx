import * as Ariakit from '@ariakit/react'
import { useState } from 'react'
import { Icon } from '~/components/Icon'
import type { TeamMember, TeamSubscription } from './types'
import { useTeam } from './useTeam'

interface AssignSubscriptionModalProps {
	isOpen: boolean
	onClose: () => void
	member: TeamMember
}

function getSubscriptionLabel(type: string): string {
	if (type === 'api') return 'API'
	if (type === 'llamafeed') return 'Pro'
	return type
}

export function AssignSubscriptionModal({ isOpen, onClose, member }: AssignSubscriptionModalProps) {
	const { teamSubscriptions, assignMemberMutation } = useTeam()
	const [selectedType, setSelectedType] = useState<string>('')

	const availableSubscriptions = teamSubscriptions.filter(
		(sub: TeamSubscription) => sub.seats.availableSeats > 0
	)

	const handleAssign = async () => {
		if (!selectedType) return
		await assignMemberMutation.mutateAsync({ userId: member.userId, subscriptionType: selectedType })
		setSelectedType('')
		onClose()
	}

	return (
		<Ariakit.DialogProvider open={isOpen} setOpen={(open) => !open && onClose()}>
			<Ariakit.Dialog
				backdrop={<div className="bg-black/80" />}
				className="dialog max-h-[90vh] min-h-0 gap-0 overflow-y-auto rounded-2xl border-0 p-0 md:max-w-[380px]"
				portal
				unmountOnHide
			>
				<div className="flex flex-col gap-5 bg-white px-5 py-6 dark:bg-(--sub-surface-dark)">
					<div className="flex items-center justify-between">
						<h2 className="text-base font-semibold text-(--sub-ink-primary) dark:text-white">Assign Subscription</h2>
						<Ariakit.DialogDismiss className="rounded-full p-1 text-(--sub-text-muted) transition-colors hover:text-(--sub-ink-primary) dark:hover:text-white">
							<Icon name="x" height={18} width={18} />
						</Ariakit.DialogDismiss>
					</div>
					<p className="text-sm text-(--sub-text-muted)">
						Select a subscription type to assign to{' '}
						<span className="font-medium text-(--sub-ink-primary) dark:text-white">{member.email}</span>.
					</p>

					{availableSubscriptions.length === 0 ? (
						<p className="text-sm text-(--sub-text-muted)">
							No available seats. Purchase more seats to assign subscriptions.
						</p>
					) : (
						<div className="flex flex-col gap-2">
							{availableSubscriptions.map((sub: TeamSubscription) => (
								<label
									key={sub.id}
									className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
										selectedType === sub.type
											? 'border-(--sub-brand-primary) bg-(--sub-brand-primary)/5'
											: 'border-(--sub-border-slate-100) dark:border-(--sub-border-strong)'
									}`}
								>
									<input
										type="radio"
										name="subscriptionType"
										value={sub.type}
										checked={selectedType === sub.type}
										onChange={(e) => setSelectedType(e.target.value)}
										className="h-4 w-4 accent-(--sub-brand-primary)"
									/>
									<div className="flex flex-col">
										<span className="text-sm font-medium text-(--sub-ink-primary) dark:text-white">
											{getSubscriptionLabel(sub.type)}
										</span>
										<span className="text-xs text-(--sub-text-muted)">
											{sub.seats.availableSeats} seat{sub.seats.availableSeats !== 1 ? 's' : ''} available
										</span>
									</div>
								</label>
							))}
						</div>
					)}

					<div className="flex gap-3">
						<button
							onClick={onClose}
							className="flex h-9 flex-1 items-center justify-center rounded-lg border border-(--sub-border-muted) text-sm font-medium text-(--sub-ink-primary) dark:border-(--sub-border-strong) dark:text-white"
						>
							Cancel
						</button>
						<button
							onClick={() => void handleAssign()}
							disabled={!selectedType || assignMemberMutation.isPending}
							className="flex h-9 flex-1 items-center justify-center rounded-lg bg-(--sub-brand-primary) text-sm font-medium text-white disabled:opacity-50"
						>
							{assignMemberMutation.isPending ? 'Assigning...' : 'Assign'}
						</button>
					</div>
				</div>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
