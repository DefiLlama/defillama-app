import type { NormalizedRow, NumericMetrics } from '~/containers/ProDashboard/components/UnifiedTable/types'
import type { UnifiedTableConfig } from '~/containers/ProDashboard/types'
import { llamaDb } from '~/server/db/llama'
import { computeShare, derivePreviousValue, formatDisplayName, resolveChainLogo, toPercent } from './utils'

type ChainRow = {
	chain: string
	protocol_count: number | null
	tvl_base: number | null
	tvl_base_1d_pct_change: number | null
	tvl_base_7d_pct_change: number | null
	tvl_base_30d_pct_change: number | null
	volume_dexs_1d: number | null
	volume_dexs_7d: number | null
	volume_dexs_30d: number | null
	volume_dexs_1d_pct_change: number | null
	volume_dexs_7d_pct_change: number | null
	volume_dexs_30d_pct_change: number | null
	chain_fees_1d: number | null
	chain_fees_7d: number | null
	chain_fees_30d: number | null
	chain_fees_1d_pct_change: number | null
	chain_fees_7d_pct_change: number | null
	chain_fees_30d_pct_change: number | null
	chain_revenue_1d: number | null
	chain_revenue_7d: number | null
	chain_revenue_30d: number | null
	chain_revenue_1d_pct_change: number | null
	chain_revenue_7d_pct_change: number | null
	chain_revenue_30d_pct_change: number | null
	mcap: number | null
	bridged_tvl: number | null
	stables_mcap: number | null
}

const totalsPromise = llamaDb.one<{
	tvl_base: number | null
	volume_dexs_1d: number | null
	volume_dexs_7d: number | null
}>(
	`
	SELECT
		tvl_base,
		volume_dexs_1d,
		volume_dexs_7d
	FROM lens.metrics_total_current
`
)

interface ChainsQueryOptions {
	config: UnifiedTableConfig
}

export async function fetchChainsTable(options: ChainsQueryOptions): Promise<NormalizedRow[]> {
	const totals = await totalsPromise
	const rows = await llamaDb.any<ChainRow>(
		`
		SELECT
			mc.chain,
			mc.protocol_count,
			mc.tvl_base,
			mc.tvl_base_1d_pct_change,
			mc.tvl_base_7d_pct_change,
			mc.tvl_base_30d_pct_change,
			mc.volume_dexs_1d,
			mc.volume_dexs_7d,
			mc.volume_dexs_30d,
			mc.volume_dexs_1d_pct_change,
			mc.volume_dexs_7d_pct_change,
			mc.volume_dexs_30d_pct_change,
			mc.chain_fees_1d,
			mc.chain_fees_7d,
			mc.chain_fees_30d,
			mc.chain_fees_1d_pct_change,
			mc.chain_fees_7d_pct_change,
			mc.chain_fees_30d_pct_change,
			mc.chain_revenue_1d,
			mc.chain_revenue_7d,
			mc.chain_revenue_30d,
			mc.chain_revenue_1d_pct_change,
			mc.chain_revenue_7d_pct_change,
			mc.chain_revenue_30d_pct_change,
			mc.mcap,
			COALESCE(bridged_data.bridged_tvl, NULL) AS bridged_tvl,
			COALESCE(stables_data.stables_mcap, NULL) AS stables_mcap
		FROM lens.metrics_chain_current mc
		LEFT JOIN LATERAL (
			SELECT SUM(tvl) AS bridged_tvl
			FROM lens.bridged_token_tvl_current b
			WHERE b.chain = mc.chain
		) bridged_data ON TRUE
		LEFT JOIN LATERAL (
			SELECT SUM(mcap) AS stables_mcap
			FROM lens.stablecoin_supply_current s
			WHERE s.chain = mc.chain
		) stables_data ON TRUE
		`
	)

	return rows.map((row) => {
		const tvl = row.tvl_base ?? null
		const volume24h = row.volume_dexs_1d ?? null

		const metrics: NumericMetrics = {
			tvl,
			tvlPrevDay: derivePreviousValue(tvl, row.tvl_base_1d_pct_change),
			tvlPrevWeek: derivePreviousValue(tvl, row.tvl_base_7d_pct_change),
			tvlPrevMonth: derivePreviousValue(tvl, row.tvl_base_30d_pct_change),
			change1d: toPercent(row.tvl_base_1d_pct_change),
			change7d: toPercent(row.tvl_base_7d_pct_change),
			change1m: toPercent(row.tvl_base_30d_pct_change),
			volume24h,
			volume_7d: row.volume_dexs_7d ?? null,
			volume_30d: row.volume_dexs_30d ?? null,
			volumeChange_1d: toPercent(row.volume_dexs_1d_pct_change),
			volumeChange_7d: toPercent(row.volume_dexs_7d_pct_change),
			volumeChange_1m: toPercent(row.volume_dexs_30d_pct_change),
			volume24hShare: computeShare(volume24h, totals.volume_dexs_1d),
			fees24h: row.chain_fees_1d ?? null,
			fees_7d: row.chain_fees_7d ?? null,
			fees_30d: row.chain_fees_30d ?? null,
			feesChange_1d: toPercent(row.chain_fees_1d_pct_change),
			feesChange_7d: toPercent(row.chain_fees_7d_pct_change),
			feesChange_1m: toPercent(row.chain_fees_30d_pct_change),
			revenue24h: row.chain_revenue_1d ?? null,
			revenue_7d: row.chain_revenue_7d ?? null,
			revenue_30d: row.chain_revenue_30d ?? null,
			revenueChange_1d: toPercent(row.chain_revenue_1d_pct_change),
			revenueChange_7d: toPercent(row.chain_revenue_7d_pct_change),
			revenueChange_1m: toPercent(row.chain_revenue_30d_pct_change),
			tvlShare: computeShare(tvl, totals.tvl_base),
			mcap: row.mcap ?? null,
			mcaptvl: row.mcap && tvl ? row.mcap / tvl : null,
			bridgedTvl: row.bridged_tvl ?? null,
			stablesMcap: row.stables_mcap ?? null,
			protocolCount: row.protocol_count ?? null
		}

		const slug = row.chain ?? 'unknown'
		const name = formatDisplayName(slug) || slug

		return {
			id: `chain-${slug}`,
			name,
			displayName: name,
			protocolId: undefined,
			logo: resolveChainLogo(slug),
			category: null,
			strategyType: 'chains',
			chain: name,
			chains: [name],
			oracles: [],
			metrics,
			original: {
				source: 'lens',
				chain: row.chain
			}
		}
	})
}
