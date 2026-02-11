import * as Ariakit from '@ariakit/react'
import { lazy, Suspense, useState } from 'react'
import { LockIcon } from '~/components/LockIcon'
import { Tooltip } from '~/components/Tooltip'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { trackYieldsEvent, YIELDS_EVENTS } from '~/utils/analytics/yields'

const SubscribeProModal = lazy(() =>
	import('~/components/SubscribeCards/SubscribeProCard').then((m) => ({ default: m.SubscribeProModal }))
)

function formatPct(v: number): string {
	if (v === 0) return '0%'
	if (Math.abs(v) < 0.01) return `${v.toPrecision(2)}%`
	return `${v.toFixed(2)}%`
}

function getStabilityLabel(cv: number): { label: string; className: string } {
	if (cv < 0) {
		return { label: 'Volatile', className: 'bg-red-500/15 text-red-600 dark:text-red-400' }
	}
	if (cv < 0.5) {
		return { label: 'Stable', className: 'bg-green-500/15 text-green-600 dark:text-green-400' }
	}
	if (cv <= 2.0) {
		return { label: 'Mixed', className: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400' }
	}
	return { label: 'Volatile', className: 'bg-red-500/15 text-red-600 dark:text-red-400' }
}

interface StabilityCellProps {
	cv30d: number | null | undefined
	apyMedian30d?: number | null
	apyStd30d?: number | null
}

export function StabilityHeader() {
	const { hasActiveSubscription } = useAuthContext()
	const [shouldRenderModal, setShouldRenderModal] = useState(false)
	const subscribeModalStore = Ariakit.useDialogStore({ open: shouldRenderModal, setOpen: setShouldRenderModal })

	if (hasActiveSubscription) {
		return <span>Yield Score</span>
	}

	return (
		<>
			<button
				onClick={(e) => {
					e.stopPropagation()
					trackYieldsEvent(YIELDS_EVENTS.YIELD_SCORE_CLICK, { source: 'header' })
					setShouldRenderModal(true)
				}}
				className="cursor-pointer"
			>
				Yield Score
			</button>
			{shouldRenderModal ? (
				<Suspense fallback={null}>
					<SubscribeProModal dialogStore={subscribeModalStore} />
				</Suspense>
			) : null}
		</>
	)
}

export function StabilityCell({ cv30d, apyMedian30d, apyStd30d }: StabilityCellProps) {
	const { hasActiveSubscription } = useAuthContext()
	const [shouldRenderModal, setShouldRenderModal] = useState(false)
	const subscribeModalStore = Ariakit.useDialogStore({ open: shouldRenderModal, setOpen: setShouldRenderModal })

	if (!hasActiveSubscription) {
		const redactedTooltip = (
			<div className="flex flex-col gap-1.5 text-xs">
				<div className="flex items-center justify-between gap-4">
					<span className="font-semibold">Yield Score · 30d</span>
					<span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-500 dark:text-blue-400">
						<LockIcon className="h-2.5 w-2.5" />
						Pro
					</span>
				</div>
				<span className="inline-flex w-fit items-center gap-1 rounded-full bg-gray-500/15 px-2 py-0.5 text-xs font-medium text-gray-400">
					•••• <span className="opacity-70">••••</span>
				</span>
				<div className="flex flex-col gap-0.5">
					<div className="flex justify-between gap-4">
						<span className="opacity-70">Median APY</span>
						<span>••••</span>
					</div>
					<div className="flex justify-between gap-4">
						<span className="opacity-70">Standard Deviation (σ)</span>
						<span>••••</span>
					</div>
				</div>
				<span className="text-[10px] opacity-50">Score = σ / avg · lower is more stable</span>
				<div className="border-t border-black/10 pt-1.5 dark:border-white/10">
					<span className="text-[10px] font-medium text-blue-500 dark:text-blue-400">Unlock with Pro</span>
				</div>
			</div>
		)

		return (
			<>
				<Tooltip content={redactedTooltip} placement="top">
					<button
						onClick={() => {
							trackYieldsEvent(YIELDS_EVENTS.YIELD_SCORE_CLICK, { source: 'cell' })
							setShouldRenderModal(true)
						}}
						className="ml-auto flex cursor-pointer flex-col items-end gap-1.5"
					>
						<span className="inline-flex items-center gap-1.5 rounded-full bg-gray-500/15 px-3 py-1 dark:bg-(--cards-border)/40">
							<LockIcon className="h-3 w-3 text-gray-400 dark:text-gray-500" />

							<span className="text-xs text-gray-400 blur-[3px] select-none dark:text-gray-300">Hidden</span>
						</span>
					</button>
				</Tooltip>
				{shouldRenderModal ? (
					<Suspense fallback={null}>
						<SubscribeProModal dialogStore={subscribeModalStore} />
					</Suspense>
				) : null}
			</>
		)
	}

	if (cv30d == null) return <span className="ml-auto opacity-30">—</span>

	const { label, className } = getStabilityLabel(cv30d)

	const tooltipContent = (
		<div className="flex flex-col gap-1.5 text-xs">
			<span className="font-semibold">Yield Score · 30d</span>
			<span
				className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
			>
				{label} <span className="opacity-70">{cv30d.toFixed(2)}</span>
			</span>
			<div className="flex flex-col gap-0.5">
				{apyMedian30d != null && (
					<div className="flex justify-between gap-4">
						<span className="opacity-70">Median APY</span>
						<span>{formatPct(apyMedian30d)}</span>
					</div>
				)}
				{apyStd30d != null && (
					<div className="flex justify-between gap-4">
						<span className="opacity-70">Standard Deviation (σ)</span>
						<span>{formatPct(apyStd30d)}</span>
					</div>
				)}
			</div>
			<span className="text-[10px] opacity-50">Score = σ / avg · lower is more stable</span>
		</div>
	)

	return (
		<Tooltip content={tooltipContent} placement="top">
			<span
				className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
			>
				{label}
				<span className="opacity-70">{cv30d.toFixed(2)}</span>
			</span>
		</Tooltip>
	)
}
