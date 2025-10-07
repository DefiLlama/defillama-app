import { formattedNum } from '~/utils'
import { formatPercent } from './format'
import type { ComparisonEntry } from './types'

export const ComparisonPanel = ({ entries, activeId }: { entries: ComparisonEntry[]; activeId: string }) => {
	if (!entries.length) return null
	return (
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
			<div className="mb-3 flex items-center justify-between gap-2">
				<h3 className="text-base font-semibold">Range Comparison</h3>
				<span className="text-xs text-(--text-secondary)">BTC · ETH · SOL</span>
			</div>
			<div className="grid gap-3 sm:grid-cols-3">
				{entries.map((entry) => {
					const isPositive = entry.percentChange >= 0
					return (
						<div
							key={entry.id}
							className={`flex flex-col gap-1 rounded-md border border-(--cards-border) p-3 transition-colors duration-200 ${
								entry.id === activeId ? 'bg-(--bg-surface)' : 'bg-(--cards-bg)'
							}`}
						>
							<div className="flex items-center gap-2">
								{entry.image ? (
									<img src={entry.image} alt={entry.name} width={20} height={20} className="rounded-full" />
								) : null}
								<span className="text-sm font-medium tracking-wide uppercase">{entry.symbol}</span>
							</div>
							<span className={`text-xl font-semibold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
								{formatPercent(entry.percentChange)}
							</span>
							<span className="text-xs text-(--text-secondary)">{`${isPositive ? '+' : ''}$${formattedNum(entry.absoluteChange)}`}</span>
							<span className="text-xs text-(--text-secondary)">{`$${formattedNum(entry.startPrice)} → $${formattedNum(entry.endPrice)}`}</span>
						</div>
					)
				})}
			</div>
		</div>
	)
}
