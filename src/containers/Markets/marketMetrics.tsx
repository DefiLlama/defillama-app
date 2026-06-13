import type { ReactNode } from 'react'
import { PercentChange } from '~/components/PercentChange'
import { formattedNum } from '~/utils'
import { toPercent } from './utils'

/** USD value, dash when null. */
export function renderUsd(value: number | null | undefined): string {
	if (value == null) return '–'
	return formattedNum(value, true)
}

/** Fractional change rendered as a signed, coloured percent. */
export function ChangeCell({ fraction }: { fraction: number | null | undefined }) {
	const pct = toPercent(fraction ?? null)
	if (pct == null) return <span className="text-(--text-disabled)">–</span>
	return <PercentChange percent={pct} />
}

export function MetricStat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
	return (
		<div className="flex min-w-0 flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
			<span className="text-xs text-(--text-label)">{label}</span>
			<span className="font-jetbrains text-lg font-semibold">{value}</span>
			{sub != null ? <span className="text-xs text-(--text-label)">{sub}</span> : null}
		</div>
	)
}

/** Funding rate with positive/negative coloring. */
export function FundingCell({ rate }: { rate: number | null | undefined }) {
	if (rate == null) return <span className="text-(--text-disabled)">–</span>
	const pct = rate * 100
	const colorClass = pct > 0 ? 'text-(--success)' : pct < 0 ? 'text-(--error)' : ''
	return <span className={colorClass}>{pct.toFixed(4)}%</span>
}
