import * as Ariakit from '@ariakit/react'
import { useState } from 'react'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import { ConfirmActionModal } from './ConfirmActionModal'
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

function formatCancelDate(raw: string | number): string {
	let date: Date
	if (typeof raw === 'number') {
		date = new Date(raw * 1000)
	} else {
		const isoLike = raw.includes('T') ? raw : raw.replace(' ', 'T')
		date = new Date(isoLike)
	}
	if (isNaN(date.getTime())) return ''
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function ManageSeatsModal({ isOpen, onClose, subscription }: ManageSeatsModalProps) {
	const { setSeatsMutation } = useTeam()
	const [seatCount, setSeatCount] = useState(subscription.seats.seatCount)
	const [showCancelConfirm, setShowCancelConfirm] = useState(false)

	const label = getSubscriptionLabel(subscription.type)
	const unitPrice = getUnitPrice(subscription.type, subscription.billingInterval)
	const diff = seatCount - subscription.seats.seatCount
	const hasChange = diff !== 0
	const cancelAt: string | number | null = subscription.cancelsAt
		? subscription.cancelsAt
		: subscription.canceledAtPeriodEnd && typeof subscription.effectiveAt === 'number'
			? subscription.effectiveAt
			: null
	const isCanceling = subscription.canceledAtPeriodEnd === true || cancelAt !== null
	// When canceling, lock the floor at the current count — only increases (which undo
	// the pending cancel) are allowed.
	const minSeats = isCanceling
		? subscription.seats.seatCount
		: Math.max(1, subscription.seats.occupiedSeats)
	const isAtOccupiedFloor =
		!isCanceling && seatCount <= subscription.seats.occupiedSeats && subscription.seats.occupiedSeats > 0
	const decrementDisabled = seatCount <= minSeats
	const isPending = setSeatsMutation.isPending

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

	const handleConfirmCancel = async () => {
		try {
			await setSeatsMutation.mutateAsync({
				subscriptionType: subscription.type,
				seatCount: 0
			})
			setShowCancelConfirm(false)
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

					{isCanceling && cancelAt ? (
						<div className="flex items-start gap-2 rounded-lg border border-(--error)/30 bg-(--error)/5 p-3">
							<Icon name="alert-triangle" height={14} width={14} className="mt-0.5 shrink-0 text-(--error)" />
							<p className="text-xs leading-5 text-(--sub-ink-primary) dark:text-white">
								This subscription is scheduled to cancel on {formatCancelDate(cancelAt)}. Increasing the seat count
								will resume billing and undo the pending cancellation.
							</p>
						</div>
					) : null}

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
									isCanceling
										? "Seats can't be reduced while this subscription is scheduled to cancel. Increase the seat count to resume billing, or wait for the cancellation to take effect."
										: isAtOccupiedFloor
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
						<div className="flex flex-col gap-2 rounded-lg bg-(--sub-brand-primary)/5 p-3">
							<div className="flex items-center justify-between">
								<span className="text-sm text-(--sub-text-muted)">
									{diff > 0 ? `Adding ${diff} seat${diff === 1 ? '' : 's'}` : `Removing ${-diff} seat${-diff === 1 ? '' : 's'}`}
								</span>
								<span className="text-sm font-semibold text-(--sub-ink-primary) dark:text-white">
									{diff > 0 ? '+' : '−'}${(unitPrice.amount * Math.abs(diff)).toLocaleString()}
									{unitPrice.suffix}
								</span>
							</div>
							<div className="flex items-center justify-between border-t border-(--sub-border-slate-100) pt-2 dark:border-(--sub-border-strong)">
								<span className="text-sm text-(--sub-text-muted)">Bill after update</span>
								<span className="text-sm font-semibold text-(--sub-ink-primary) dark:text-white">
									{`$${(unitPrice.amount * seatCount).toLocaleString()}${unitPrice.suffix}`}
								</span>
							</div>
						</div>
					)}

					<button
						onClick={() => void handleSubmit()}
						disabled={isPending || !hasChange}
						className="flex h-10 w-full items-center justify-center rounded-lg bg-(--sub-brand-primary) text-sm font-medium text-white disabled:opacity-50"
					>
						{isPending ? 'Updating...' : 'Update Seats'}
					</button>

					{!isCanceling && subscription.seats.seatCount > 0 ? (
						<button
							onClick={() => setShowCancelConfirm(true)}
							disabled={isPending}
							className="flex h-10 w-full items-center justify-center rounded-lg border border-(--error)/40 text-sm font-medium text-(--error) hover:bg-(--error)/5 disabled:opacity-50"
						>
							Cancel subscription
						</button>
					) : null}
				</div>
			</Ariakit.Dialog>

			<ConfirmActionModal
				isOpen={showCancelConfirm}
				onClose={() => !isPending && setShowCancelConfirm(false)}
				onConfirm={() => void handleConfirmCancel()}
				isLoading={isPending}
				title={`Cancel ${label} Subscription`}
				description={
					subscription.seats.occupiedSeats > 0
						? `Cancel this ${label} subscription at the end of the current billing period? Assigned members keep access until the period ends, and you will not be billed again. You can undo this by increasing the seat count before the period ends.`
						: `Cancel this ${label} subscription at the end of the current billing period? You will not be billed again. You can undo this by increasing the seat count before the period ends.`
				}
				confirmLabel="Cancel Subscription"
				confirmVariant="danger"
			/>
		</Ariakit.DialogProvider>
	)
}
