import { formatDateLabel, formatPercent } from './format'
import type { TimelinePoint } from './types'

export const DailyPnLGrid = ({ timeline }: { timeline: TimelinePoint[] }) => {
	if (!timeline.length) return null
	const days = timeline.slice(1)
	if (!days.length) return null
	return (
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
			<div className="mb-3 flex items-center justify-between gap-2">
				<h3 className="text-base font-semibold">Daily Change Grid</h3>
				<span className="text-xs text-(--text-secondary)">Green = up, Red = down</span>
			</div>
			<div className="no-scrollbar flex max-w-full gap-1 overflow-x-auto pb-1">
				{days.map((day) => {
					const isPositive = day.percentChange > 0
					const isZero = day.percentChange === 0
					const intensity = Math.min(0.85, Math.abs(day.percentChange) / 12)
					const backgroundColor = isZero
						? 'rgba(148, 163, 184, 0.25)'
						: isPositive
							? `rgba(34, 197, 94, ${Math.max(0.25, intensity)})`
							: `rgba(239, 68, 68, ${Math.max(0.25, intensity)})`
					return (
						<div
							key={day.timestamp}
							title={`${formatPercent(day.percentChange)} on ${formatDateLabel(day.timestamp)}`}
							className="flex h-12 w-5 shrink-0 items-end justify-center rounded-sm"
							style={{ backgroundColor }}
						>
							<span className="sr-only">{`${formatPercent(day.percentChange)} on ${formatDateLabel(day.timestamp)}`}</span>
						</div>
					)
				})}
			</div>
		</div>
	)
}
