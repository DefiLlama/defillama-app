import * as Ariakit from '@ariakit/react'
import { useState } from 'react'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import type { TeamSubscription } from './types'
import { useTeam } from './useTeam'

interface ManageSeatsModalProps {
	isOpen: boolean
	onClose: () => void
	subscription: TeamSubscription
}

function getSubscriptionLabel(type: string): string {
	if (type === 'api') return 'API'
	if (type === 'llamafeed') return 'Pro'
	return type
}

function getUnitPrice(type: string, billingInterval: 'month' | 'year'): { amount: number; suffix: string } {
	if (type === 'api') {
		return billingInterval === 'year' ? { amount: 3000, suffix: '/year' } : { amount: 300, suffix: '/month' }
	}
	return billingInterval === 'year' ? { amount: 490, suffix: '/year' } : { amount: 49, suffix: '/month' }
}

export function ManageSeatsModal({ isOpen, onClose, subscription }: ManageSeatsModalProps) {
	const { setSeatsMutation } = useTeam()
	const [seatCount, setSeatCount] = useState(subscription.seats.seatCount)

	const label = getSubscriptionLabel(subscription.type)
	const unitPrice = getUnitPrice(subscription.type, subscription.billingInterval)
	const diff = seatCount - subscription.seats.seatCount
	const hasChange = diff !== 0
	const minSeats = Math.max(1, subscription.seats.occupiedSeats)
	const isAtOccupiedFloor = seatCount <= subscription.seats.occupiedSeats && subscription.seats.occupiedSeats > 0
	const decrementDisabled = seatCount <= minSeats

	const handleSubmit = async () => {
		try {
			await setSeatsMutation.mutateAsync({
				subscriptionType: subscription.type,
				seatCount
			})
			onClose()
		} catch {
			// error toast is handled inside setSeatsMutation.onError
		}
	}

	const handleClose = () => {
		setSeatCount(subscription.seats.seatCount)
		onClose()
	}

	return (
		<Ariakit.DialogProvider open={isOpen} setOpen={(open) => !open && handleClose()}>
			<Ariakit.Dialog
				backdrop={<div className="bg-black/80" />}
				className="dialog max-h-[90vh] min-h-0 gap-0 overflow-y-auto rounded-2xl border-0 p-0 md:max-w-[420px]"
				portal
				unmountOnHide
			>
				<div className="flex flex-col gap-5 bg-white px-5 py-6 dark:bg-(--sub-surface-dark)">
					<div className="flex items-center justify-between">
						<h2 className="text-base font-semibold text-(--sub-ink-primary) dark:text-white">Manage {label} Seats</h2>
						<Ariakit.DialogDismiss className="rounded-full p-1 text-(--sub-text-muted) transition-colors hover:text-(--sub-ink-primary) dark:hover:text-white">
							<Icon name="x" height={18} width={18} />
						</Ariakit.DialogDismiss>
					</div>

					<div className="flex flex-col gap-2 rounded-lg border border-(--sub-border-slate-100) p-3 dark:border-(--sub-border-strong)">
						<div className="flex items-center justify-between text-xs text-(--sub-text-muted)">
							<span>Current seats</span>
							<span className="text-(--sub-ink-primary) dark:text-white">{subscription.seats.seatCount}</span>
						</div>
						<div className="flex items-center justify-between text-xs text-(--sub-text-muted)">
							<span>Occupied</span>
							<span className="text-(--sub-ink-primary) dark:text-white">{subscription.seats.occupiedSeats}</span>
						</div>
					</div>

					<div className="flex flex-col gap-2">
						<label htmlFor="manage-seat-count" className="text-xs font-medium text-(--sub-text-muted)">
							New seat count
						</label>
						<div className="flex items-center gap-2">
							<Tooltip
								content={
									isAtOccupiedFloor
										? `You can't reduce below ${subscription.seats.occupiedSeats} seat${subscription.seats.occupiedSeats === 1 ? '' : 's'}. Unassign the users from this subscription first if you want to remove seats.`
										: null
								}
								placement="top"
							>
								<button
									onClick={() => setSeatCount((c) => Math.max(minSeats, c - 1))}
									disabled={decrementDisabled}
									className="flex h-10 w-10 items-center justify-center rounded-lg border border-(--sub-border-slate-100) text-(--sub-ink-primary) disabled:opacity-30 dark:border-(--sub-border-strong) dark:text-white"
								>
									<Icon name="minus" height={16} width={16} />
								</button>
							</Tooltip>
							<input
								id="manage-seat-count"
								type="text"
								inputMode="numeric"
								pattern="[0-9]*"
								value={seatCount}
								onChange={(e) => {
									const val = parseInt(e.target.value, 10)
									if (!isNaN(val) && val >= minSeats) setSeatCount(val)
								}}
								className="h-10 w-20 rounded-lg border border-(--sub-border-slate-100) bg-white text-center text-sm text-(--sub-ink-primary) focus:border-(--sub-brand-primary) focus:outline-hidden dark:border-(--sub-border-strong) dark:bg-(--sub-surface-dark) dark:text-white"
							/>
							<button
								onClick={() => setSeatCount((c) => c + 1)}
								className="flex h-10 w-10 items-center justify-center rounded-lg border border-(--sub-border-slate-100) text-(--sub-ink-primary) dark:border-(--sub-border-strong) dark:text-white"
							>
								<Icon name="plus" height={16} width={16} />
							</button>
						</div>
					</div>

					{hasChange && (
						<div className="rounded-lg bg-(--sub-brand-primary)/5 p-3">
							<div className="flex items-center justify-between">
								<span className="text-sm text-(--sub-text-muted)">
									{diff > 0 ? `Adding ${diff} seat${diff === 1 ? '' : 's'}` : `Removing ${-diff} seat${-diff === 1 ? '' : 's'}`}
								</span>
								<span className="text-sm font-semibold text-(--sub-ink-primary) dark:text-white">
									{`$${(unitPrice.amount * seatCount).toLocaleString()}${unitPrice.suffix}`}
								</span>
							</div>
						</div>
					)}

					<button
						onClick={() => void handleSubmit()}
						disabled={setSeatsMutation.isPending || !hasChange}
						className="flex h-10 w-full items-center justify-center rounded-lg bg-(--sub-brand-primary) text-sm font-medium text-white disabled:opacity-50"
					>
						{setSeatsMutation.isPending ? 'Updating...' : 'Update Seats'}
					</button>
				</div>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
