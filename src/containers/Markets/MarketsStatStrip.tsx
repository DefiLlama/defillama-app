import { formattedNum } from '~/utils'
import { segmentHasOi } from './segments'
import { ChangeCell, renderUsd } from './shared'
import type { Segment, SymbolStat } from './types'
import { pctChange, segmentTotals, sentimentCounts, TOP_N, topSymbols } from './utils'

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
	return (
		<div className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
			<span className="text-xs text-(--text-label)">{label}</span>
			<span className="font-jetbrains text-lg font-semibold">{value}</span>
			{sub != null ? <span className="text-xs text-(--text-label)">{sub}</span> : null}
		</div>
	)
}

export function MarketsStatStrip({ rows, segment }: { rows: SymbolStat[]; segment: Segment }) {
	const totals = segmentTotals(rows)
	const hasOi = segmentHasOi(segment)
	const counts = sentimentCounts(topSymbols(rows, 'volume', TOP_N), segment)

	return (
		<div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
			<Stat
				label="24h Volume"
				value={renderUsd(totals.volume_24h_usd)}
				sub={<ChangeCell fraction={pctChange(totals.volume_24h_usd, totals.volume_prev_24h_usd)} />}
			/>
			{hasOi ? (
				<Stat
					label="Open Interest"
					value={renderUsd(totals.oi_usd)}
					sub={<ChangeCell fraction={pctChange(totals.oi_usd, totals.oi_prev_usd)} />}
				/>
			) : null}
			<Stat
				label="Assets"
				value={formattedNum(totals.asset_count)}
				sub={`${formattedNum(totals.market_count)} markets`}
			/>
			<Stat
				label="Sentiment (top 100)"
				value={`${counts.rising} rising · ${counts.fading} fading`}
				sub={`${counts.churn} churn · ${counts.building} building · ${counts.flat} flat`}
			/>
		</div>
	)
}
