import type { NormalizedRow, NumericMetrics } from '~/containers/ProDashboard/components/UnifiedTable/types'
import type { UnifiedRowHeaderType, UnifiedTableConfig } from '~/containers/ProDashboard/types'
import { llamaDb } from '~/server/db/llama'
import {
	computeShare,
	derivePreviousValue,
	extractChainFilters,
	formatDisplayName,
	resolveLogoUrl,
	toPercent
} from './utils'

export interface ChainMetrics {
	bridgedTvl: number | null
	stablesMcap: number | null
	tvlShare: number | null
	stablesShare: number | null
	volume24hShare: number | null
	protocolCount: number | null
}

export interface ProtocolsTableResult {
	rows: NormalizedRow[]
	chainMetrics?: Record<string, ChainMetrics>
}

type ProtocolAggregateRow = {
	protocol: string
	protocol_category: string | null
	chain_slugs: string[] | null
	oracle_names: string[] | null
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
	volume_dexs_alltime: number | null
	fees_1d: number | null
	fees_7d: number | null
	fees_30d: number | null
	fees_365d: number | null
	fees_alltime: number | null
	fees_annualised: number | null
	fees_1d_pct_change: number | null
	fees_7d_pct_change: number | null
	fees_30d_pct_change: number | null
	holder_revenue_1d: number | null
	holder_revenue_7d: number | null
	holder_revenue_30d: number | null
	holder_revenue_30d_pct_change: number | null
	revenue_1d: number | null
	revenue_7d: number | null
	revenue_30d: number | null
	revenue_365d: number | null
	revenue_annualised: number | null
	revenue_1d_pct_change: number | null
	revenue_7d_pct_change: number | null
	revenue_30d_pct_change: number | null
	volume_derivatives_1d: number | null
	volume_derivatives_7d: number | null
	volume_derivatives_30d: number | null
	volume_derivatives_1d_pct_change: number | null
	volume_derivatives_7d_pct_change: number | null
	volume_derivatives_30d_pct_change: number | null
	volume_aggregators_1d: number | null
	volume_aggregators_7d: number | null
	volume_aggregators_30d: number | null
	volume_aggregators_1d_pct_change: number | null
	volume_aggregators_7d_pct_change: number | null
	volume_aggregators_30d_pct_change: number | null
	volume_aggr_derivatives_1d: number | null
	volume_aggr_derivatives_7d: number | null
	volume_aggr_derivatives_30d: number | null
	volume_aggr_derivatives_1d_pct_change: number | null
	volume_aggr_derivatives_7d_pct_change: number | null
	volume_aggr_derivatives_30d_pct_change: number | null
	volume_options_1d: number | null
	volume_options_7d: number | null
	volume_options_30d: number | null
	volume_options_1d_pct_change: number | null
	volume_options_7d_pct_change: number | null
	volume_options_30d_pct_change: number | null
	mcap: number | null
	chain_mcap?: number | null
	pf_ratio: number | null
	ps_ratio: number | null
	open_interest: number | null
	chain_slug?: string | null
}

type SubProtocolRow = ProtocolAggregateRow & {
	sub_protocol: string
	protocol: string
}

interface ProtocolQueryOptions {
	config: UnifiedTableConfig
	rowHeaders: UnifiedRowHeaderType[]
}

const totalsPromise = llamaDb.one<{
	tvl_base: number | null
	volume_dexs_1d: number | null
	volume_dexs_7d: number | null
	volume_aggregators_1d: number | null
	volume_aggregators_7d: number | null
	volume_derivatives_1d: number | null
	volume_aggr_derivatives_1d: number | null
	volume_options_1d: number | null
}>(
	`
	SELECT
		tvl_base,
		volume_dexs_1d,
		volume_dexs_7d,
		volume_aggregators_1d,
		volume_aggregators_7d,
		volume_derivatives_1d,
		volume_aggr_derivatives_1d,
		volume_options_1d
	FROM lens.metrics_total_current
`
)

export async function fetchProtocolsTable(options: ProtocolQueryOptions): Promise<ProtocolsTableResult> {
	const chainFilters = extractChainFilters(options.config)
	const totals = await totalsPromise
	const shouldExplodeByChain = options.rowHeaders.includes('chain') || chainFilters.length > 0
	if (shouldExplodeByChain) {
		const [rows, chainMetrics] = await Promise.all([
			fetchProtocolChainRows(chainFilters, totals),
			fetchChainMetricsForGrouping(chainFilters, totals)
		])
		return { rows, chainMetrics }
	}
	const [parentRows, childRows] = await Promise.all([
		fetchProtocolAggregateRows(chainFilters, totals),
		fetchSubProtocolRows(chainFilters, totals)
	])

	const parentProtocolIds = new Set(
		childRows.map((row) => row.parentProtocolId).filter((id): id is string => Boolean(id))
	)
	const subProtocolIds = new Set(childRows.map((row) => row.protocolId))
	const filteredParents = parentRows.filter(
		(row) => !parentProtocolIds.has(row.protocolId) && !subProtocolIds.has(row.protocolId)
	)

	const allRows = [...filteredParents, ...childRows]

	const uniqueRows = new Map<string, NormalizedRow>()
	for (const row of allRows) {
		if (!uniqueRows.has(row.id)) {
			uniqueRows.set(row.id, row)
		}
	}

	return { rows: Array.from(uniqueRows.values()) }
}

const baseMetricsMapping = (row: ProtocolAggregateRow, totals: Awaited<typeof totalsPromise>): NumericMetrics => {
	const tvl = row.tvl_base ?? null
	const volume24h = row.volume_dexs_1d ?? null
	const volume7d = row.volume_dexs_7d ?? null
	const fees24h = row.fees_1d ?? null
	const fees7d = row.fees_7d ?? null
	const fees30d = row.fees_30d ?? null
	const perps24h = row.volume_derivatives_1d ?? null
	const holderRevenue7d = row.holder_revenue_7d ?? null
	const holderRevenue30d = row.holder_revenue_30d ?? null

	return {
		tvl,
		tvlPrevDay: derivePreviousValue(tvl, row.tvl_base_1d_pct_change),
		tvlPrevWeek: derivePreviousValue(tvl, row.tvl_base_7d_pct_change),
		tvlPrevMonth: derivePreviousValue(tvl, row.tvl_base_30d_pct_change),
		change1d: toPercent(row.tvl_base_1d_pct_change),
		change7d: toPercent(row.tvl_base_7d_pct_change),
		change1m: toPercent(row.tvl_base_30d_pct_change),
		volume24h,
		volume_7d: volume7d,
		volume_30d: row.volume_dexs_30d ?? null,
		cumulativeVolume: row.volume_dexs_alltime ?? null,
		volumeChange_1d: toPercent(row.volume_dexs_1d_pct_change),
		volumeChange_7d: toPercent(row.volume_dexs_7d_pct_change),
		volumeChange_1m: toPercent(row.volume_dexs_30d_pct_change),
		volumeDominance_24h: computeShare(volume24h, totals.volume_dexs_1d),
		volumeMarketShare7d: computeShare(volume7d, totals.volume_dexs_7d),
		fees24h,
		fees_7d: fees7d,
		fees_30d: fees30d,
		fees_1y: row.fees_365d ?? null,
		average_1y: row.fees_annualised ? row.fees_annualised / 12 : null,
		cumulativeFees: row.fees_alltime ?? null,
		userFees_24h: null,
		holderRevenue_24h: row.holder_revenue_1d ?? null,
		holderRevenue_7d: holderRevenue7d,
		holdersRevenue30d: holderRevenue30d,
		treasuryRevenue_24h: null,
		feesChange_1d: toPercent(row.fees_1d_pct_change),
		feesChange_7d: toPercent(row.fees_7d_pct_change),
		feesChange_1m: toPercent(row.fees_30d_pct_change),
		revenue24h: row.revenue_1d ?? null,
		revenue_7d: row.revenue_7d ?? null,
		revenue_30d: row.revenue_30d ?? null,
		revenue_1y: row.revenue_365d ?? null,
		average_revenue_1y: row.revenue_annualised ? row.revenue_annualised / 12 : null,
		revenueChange_1d: toPercent(row.revenue_1d_pct_change),
		revenueChange_7d: toPercent(row.revenue_7d_pct_change),
		revenueChange_1m: toPercent(row.revenue_30d_pct_change),
		perpsVolume24h: perps24h,
		perps_volume_7d: row.volume_derivatives_7d ?? null,
		perps_volume_30d: row.volume_derivatives_30d ?? null,
		perps_volume_change_1d: toPercent(row.volume_derivatives_1d_pct_change),
		perps_volume_change_7d: toPercent(row.volume_derivatives_7d_pct_change),
		perps_volume_change_1m: toPercent(row.volume_derivatives_30d_pct_change),
		perps_volume_dominance_24h: computeShare(perps24h, totals.volume_derivatives_1d),
		aggregators_volume_24h: row.volume_aggregators_1d ?? null,
		aggregators_volume_7d: row.volume_aggregators_7d ?? null,
		aggregators_volume_30d: row.volume_aggregators_30d ?? null,
		aggregators_volume_change_1d: toPercent(row.volume_aggregators_1d_pct_change),
		aggregators_volume_change_7d: toPercent(row.volume_aggregators_7d_pct_change),
		aggregators_volume_dominance_24h: computeShare(row.volume_aggregators_1d, totals.volume_aggregators_1d),
		aggregators_volume_marketShare7d: computeShare(row.volume_aggregators_7d, totals.volume_aggregators_7d),
		derivatives_aggregators_volume_24h: row.volume_aggr_derivatives_1d ?? null,
		derivatives_aggregators_volume_7d: row.volume_aggr_derivatives_7d ?? null,
		derivatives_aggregators_volume_30d: row.volume_aggr_derivatives_30d ?? null,
		derivatives_aggregators_volume_change_1d: toPercent(row.volume_aggr_derivatives_1d_pct_change),
		derivatives_aggregators_volume_change_7d: toPercent(row.volume_aggr_derivatives_7d_pct_change),
		derivatives_aggregators_volume_change_1m: toPercent(row.volume_aggr_derivatives_30d_pct_change),
		options_volume_24h: row.volume_options_1d ?? null,
		options_volume_7d: row.volume_options_7d ?? null,
		options_volume_30d: row.volume_options_30d ?? null,
		options_volume_change_1d: toPercent(row.volume_options_1d_pct_change),
		options_volume_change_7d: toPercent(row.volume_options_7d_pct_change),
		options_volume_dominance_24h: computeShare(row.volume_options_1d, totals.volume_options_1d),
		openInterest: row.open_interest ?? null,
		mcap: row.mcap ?? null,
		chainMcap: row.chain_mcap ?? null,
		mcaptvl: row.mcap && tvl ? row.mcap / tvl : null,
		pf: row.pf_ratio ?? null,
		ps: row.ps_ratio ?? null,
		protocolCount: null
	}
}

const buildBaseRow = (
	row: ProtocolAggregateRow,
	totals: Awaited<typeof totalsPromise>,
	options: {
		slug: string
		parentSlug?: string | null
		category?: string | null
		chainSlugs?: string[] | null
	}
): NormalizedRow => {
	const metrics = baseMetricsMapping(row, totals)
	const displayName = formatDisplayName(options.slug) || options.slug
	const parentDisplayName = options.parentSlug ? formatDisplayName(options.parentSlug) || options.parentSlug : null

	return {
		id: `protocol-${options.slug}`,
		name: displayName,
		displayName,
		protocolId: options.slug,
		logo: resolveLogoUrl(options.slug),
		category: options.category ? formatDisplayName(options.category) : null,
		chains: options.chainSlugs ? options.chainSlugs.map((chain) => formatDisplayName(chain)) : [],
		oracles: row.oracle_names ? row.oracle_names.map((oracle) => formatDisplayName(oracle)) : [],
		parentProtocolId: options.parentSlug ?? null,
		parentProtocolName: parentDisplayName,
		parentProtocolLogo: options.parentSlug ? resolveLogoUrl(options.parentSlug) : null,
		metrics,
		chain: null,
		original: {
			source: 'lens',
			protocol: options.slug
		}
	}
}

const fetchProtocolAggregateRows = async (
	chainFilters: string[],
	totals: Awaited<typeof totalsPromise>
): Promise<NormalizedRow[]> => {
	const conditions: string[] = []
	const values: any[] = []

	if (chainFilters.length) {
		conditions.push(
			`EXISTS (
				SELECT 1
				FROM unnest(COALESCE(chains.chain_slugs, ARRAY[]::text[])) AS chain_slug(value)
				WHERE chain_slug.value = ANY($${values.length + 1})
			)`
		)
		values.push(chainFilters)
	}

	const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

	const rows = await llamaDb.any<ProtocolAggregateRow>(
		`
		WITH chain_meta AS (
			SELECT
				protocol,
				array_remove(array_agg(DISTINCT lower(chain) ORDER BY lower(chain)), NULL) AS chain_slugs
			FROM lens.metrics_protocol_by_chain_current
			GROUP BY protocol
		),
		category_meta AS (
			SELECT
				protocol,
				MIN(category) AS category
			FROM lens.metrics_sub_protocol_current
			GROUP BY protocol
		),
		oracle_meta AS (
			SELECT
				protocol,
				array_remove(array_agg(DISTINCT oracle ORDER BY oracle), NULL) AS oracle_names
			FROM lens.oracle_tvs_current
			WHERE protocol IS NOT NULL
			GROUP BY protocol
		),
		open_interest AS (
			SELECT
				protocol,
				SUM(open_interest) AS open_interest
			FROM lens.open_interest_current
			GROUP BY protocol
		)
		SELECT
			mp.protocol,
			cat.category AS protocol_category,
			chains.chain_slugs,
			oracles.oracle_names,
			mp.tvl_base,
			mp.tvl_base_1d_pct_change,
			mp.tvl_base_7d_pct_change,
			mp.tvl_base_30d_pct_change,
			mp.volume_dexs_1d,
			mp.volume_dexs_7d,
			mp.volume_dexs_30d,
			mp.volume_dexs_1d_pct_change,
			mp.volume_dexs_7d_pct_change,
			mp.volume_dexs_30d_pct_change,
			mp.volume_dexs_alltime,
			mp.fees_1d,
			mp.fees_7d,
			mp.fees_30d,
			mp.fees_365d,
			mp.fees_alltime,
			mp.fees_annualised,
			mp.fees_1d_pct_change,
			mp.fees_7d_pct_change,
			mp.fees_30d_pct_change,
			mp.holder_revenue_1d,
			mp.holder_revenue_7d,
			mp.holder_revenue_30d,
			mp.holder_revenue_30d_pct_change,
			mp.revenue_1d,
			mp.revenue_7d,
			mp.revenue_30d,
			mp.revenue_365d,
			mp.revenue_annualised,
			mp.revenue_1d_pct_change,
			mp.revenue_7d_pct_change,
			mp.revenue_30d_pct_change,
			mp.volume_derivatives_1d,
			mp.volume_derivatives_7d,
			mp.volume_derivatives_30d,
			mp.volume_derivatives_1d_pct_change,
			mp.volume_derivatives_7d_pct_change,
			mp.volume_derivatives_30d_pct_change,
			mp.volume_aggregators_1d,
			mp.volume_aggregators_7d,
			mp.volume_aggregators_30d,
			mp.volume_aggregators_1d_pct_change,
			mp.volume_aggregators_7d_pct_change,
			mp.volume_aggregators_30d_pct_change,
			mp.volume_aggr_derivatives_1d,
			mp.volume_aggr_derivatives_7d,
			mp.volume_aggr_derivatives_30d,
			mp.volume_aggr_derivatives_1d_pct_change,
			mp.volume_aggr_derivatives_7d_pct_change,
			mp.volume_aggr_derivatives_30d_pct_change,
			mp.volume_options_1d,
			mp.volume_options_7d,
			mp.volume_options_30d,
			mp.volume_options_1d_pct_change,
			mp.volume_options_7d_pct_change,
			mp.volume_options_30d_pct_change,
			mp.mcap,
			mp.pf_ratio,
			mp.ps_ratio,
			oi.open_interest
		FROM lens.metrics_protocol_current mp
		LEFT JOIN chain_meta chains ON chains.protocol = mp.protocol
		LEFT JOIN category_meta cat ON cat.protocol = mp.protocol
		LEFT JOIN oracle_meta oracles ON oracles.protocol = mp.protocol
		LEFT JOIN open_interest oi ON oi.protocol = mp.protocol
		${whereClause}
	`,
		values
	)

	return rows.map((row) =>
		buildBaseRow(row, totals, {
			slug: row.protocol,
			parentSlug: null,
			category: row.protocol_category,
			chainSlugs: row.chain_slugs
		})
	)
}

const fetchSubProtocolRows = async (
	chainFilters: string[],
	totals: Awaited<typeof totalsPromise>
): Promise<NormalizedRow[]> => {
	const conditions: string[] = []
	const values: any[] = []

	if (chainFilters.length) {
		conditions.push(
			`EXISTS (
				SELECT 1
				FROM unnest(COALESCE(chains.chain_slugs, ARRAY[]::text[])) AS chain_slug(value)
				WHERE chain_slug.value = ANY($${values.length + 1})
			)`
		)
		values.push(chainFilters)
	}

	const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

	const rows = await llamaDb.any<SubProtocolRow>(
		`
		WITH chain_meta AS (
			SELECT
				sub_protocol,
				array_remove(array_agg(DISTINCT lower(chain) ORDER BY lower(chain)), NULL) AS chain_slugs
			FROM lens.metrics_sub_protocol_by_chain_current
			GROUP BY sub_protocol
		),
		oracle_meta AS (
			SELECT
				COALESCE(sub_protocol, protocol) AS sub_protocol,
				array_remove(array_agg(DISTINCT oracle ORDER BY oracle), NULL) AS oracle_names
			FROM lens.oracle_tvs_current
			WHERE sub_protocol IS NOT NULL OR protocol IS NOT NULL
			GROUP BY COALESCE(sub_protocol, protocol)
		)
		SELECT
			msp.sub_protocol,
			msp.protocol,
			msp.category AS protocol_category,
			chains.chain_slugs,
			oracles.oracle_names,
			msp.tvl_base,
			msp.tvl_base_1d_pct_change,
			msp.tvl_base_7d_pct_change,
			msp.tvl_base_30d_pct_change,
			msp.volume_dexs_1d,
			msp.volume_dexs_7d,
			msp.volume_dexs_30d,
			msp.volume_dexs_1d_pct_change,
			msp.volume_dexs_7d_pct_change,
			msp.volume_dexs_30d_pct_change,
			msp.volume_dexs_alltime,
			msp.fees_1d,
			msp.fees_7d,
			msp.fees_30d,
			msp.fees_365d,
			msp.fees_alltime,
			msp.fees_annualised,
			msp.fees_1d_pct_change,
			msp.fees_7d_pct_change,
			msp.fees_30d_pct_change,
			msp.holder_revenue_1d,
			msp.holder_revenue_7d,
			msp.holder_revenue_30d,
			msp.holder_revenue_30d_pct_change,
			msp.revenue_1d,
			msp.revenue_7d,
			msp.revenue_30d,
			msp.revenue_365d,
			msp.revenue_annualised,
			msp.revenue_1d_pct_change,
			msp.revenue_7d_pct_change,
			msp.revenue_30d_pct_change,
			msp.volume_derivatives_1d,
			msp.volume_derivatives_7d,
			msp.volume_derivatives_30d,
			msp.volume_derivatives_1d_pct_change,
			msp.volume_derivatives_7d_pct_change,
			msp.volume_derivatives_30d_pct_change,
			msp.volume_aggregators_1d,
			msp.volume_aggregators_7d,
			msp.volume_aggregators_30d,
			msp.volume_aggregators_1d_pct_change,
			msp.volume_aggregators_7d_pct_change,
			msp.volume_aggregators_30d_pct_change,
			msp.volume_aggr_derivatives_1d,
			msp.volume_aggr_derivatives_7d,
			msp.volume_aggr_derivatives_30d,
			msp.volume_aggr_derivatives_1d_pct_change,
			msp.volume_aggr_derivatives_7d_pct_change,
			msp.volume_aggr_derivatives_30d_pct_change,
			msp.volume_options_1d,
			msp.volume_options_7d,
			msp.volume_options_30d,
			msp.volume_options_1d_pct_change,
			msp.volume_options_7d_pct_change,
			msp.volume_options_30d_pct_change,
			msp.mcap,
			msp.pf_ratio,
			msp.ps_ratio,
			NULL AS open_interest
		FROM lens.metrics_sub_protocol_current msp
		LEFT JOIN chain_meta chains ON chains.sub_protocol = msp.sub_protocol
		LEFT JOIN oracle_meta oracles ON oracles.sub_protocol = msp.sub_protocol
		${whereClause}
	`,
		values
	)

	return rows
		.filter((row) => row.sub_protocol && row.protocol && row.sub_protocol !== row.protocol)
		.map((row) =>
			buildBaseRow(row, totals, {
				slug: row.sub_protocol,
				parentSlug: row.protocol,
				category: row.protocol_category,
				chainSlugs: row.chain_slugs
			})
		)
}

const fetchProtocolChainRows = async (
	chainFilters: string[],
	totals: Awaited<typeof totalsPromise>
): Promise<NormalizedRow[]> => {
	const [parentChainRows, subProtocolChainRows] = await Promise.all([
		fetchParentProtocolsByChain(chainFilters, totals),
		fetchSubProtocolsByChain(chainFilters, totals)
	])

	const parentProtocolIds = new Set(
		subProtocolChainRows.map((row) => row.parentProtocolId).filter((id): id is string => Boolean(id))
	)
	const subProtocolIds = new Set(subProtocolChainRows.map((row) => row.protocolId))
	const filteredParents = parentChainRows.filter(
		(row) => !parentProtocolIds.has(row.protocolId) && !subProtocolIds.has(row.protocolId)
	)

	const allRows = [...filteredParents, ...subProtocolChainRows]

	const uniqueRows = new Map<string, NormalizedRow>()
	for (const row of allRows) {
		if (!uniqueRows.has(row.id)) {
			uniqueRows.set(row.id, row)
		}
	}

	return Array.from(uniqueRows.values())
}

const fetchParentProtocolsByChain = async (
	chainFilters: string[],
	totals: Awaited<typeof totalsPromise>
): Promise<NormalizedRow[]> => {
	const rows = await llamaDb.any<ProtocolAggregateRow>(
		`
		WITH category_meta AS (
			SELECT
				protocol,
				MIN(category) AS category
			FROM lens.metrics_sub_protocol_current
			GROUP BY protocol
		),
		oracle_meta AS (
			SELECT
				protocol,
				lower(chain) AS chain,
				array_remove(array_agg(DISTINCT oracle ORDER BY oracle), NULL) AS oracle_names
			FROM lens.oracle_tvs_current
			WHERE protocol IS NOT NULL
			GROUP BY protocol, lower(chain)
		),
		open_interest AS (
			SELECT
				protocol,
				chain,
				SUM(open_interest) AS open_interest
			FROM lens.open_interest_current
			GROUP BY protocol, chain
		),
		chain_mcap AS (
			SELECT
				lower(chain) AS chain,
				mcap
			FROM lens.metrics_chain_current
		)
		SELECT
			mpc.protocol,
			cat.category AS protocol_category,
			ARRAY[lower(mpc.chain)] AS chain_slugs,
			oracles.oracle_names,
			mpc.chain AS chain_slug,
			mpc.tvl_base,
			mpc.tvl_base_1d_pct_change,
			mpc.tvl_base_7d_pct_change,
			mpc.tvl_base_30d_pct_change,
			mpc.volume_dexs_1d,
			mpc.volume_dexs_7d,
			mpc.volume_dexs_30d,
			mpc.volume_dexs_1d_pct_change,
			mpc.volume_dexs_7d_pct_change,
			mpc.volume_dexs_30d_pct_change,
			mpc.volume_dexs_alltime,
			mpc.fees_1d,
			mpc.fees_7d,
			mpc.fees_30d,
			mpc.fees_365d,
			mpc.fees_alltime,
			mpc.fees_annualised,
			mpc.fees_1d_pct_change,
			mpc.fees_7d_pct_change,
			mpc.fees_30d_pct_change,
			mpc.holder_revenue_1d,
			mpc.holder_revenue_7d,
			mpc.holder_revenue_30d,
			mpc.holder_revenue_30d_pct_change,
			mpc.revenue_1d,
			mpc.revenue_7d,
			mpc.revenue_30d,
			mpc.revenue_365d,
			mpc.revenue_annualised,
			mpc.revenue_1d_pct_change,
			mpc.revenue_7d_pct_change,
			mpc.revenue_30d_pct_change,
			mpc.volume_derivatives_1d,
			mpc.volume_derivatives_7d,
			mpc.volume_derivatives_30d,
			mpc.volume_derivatives_1d_pct_change,
			mpc.volume_derivatives_7d_pct_change,
			mpc.volume_derivatives_30d_pct_change,
			mpc.volume_aggregators_1d,
			mpc.volume_aggregators_7d,
			mpc.volume_aggregators_30d,
			mpc.volume_aggregators_1d_pct_change,
			mpc.volume_aggregators_7d_pct_change,
			mpc.volume_aggregators_30d_pct_change,
			mpc.volume_aggr_derivatives_1d,
			mpc.volume_aggr_derivatives_7d,
			mpc.volume_aggr_derivatives_30d,
			mpc.volume_aggr_derivatives_1d_pct_change,
			mpc.volume_aggr_derivatives_7d_pct_change,
			mpc.volume_aggr_derivatives_30d_pct_change,
			mpc.volume_options_1d,
			mpc.volume_options_7d,
			mpc.volume_options_30d,
			mpc.volume_options_1d_pct_change,
			mpc.volume_options_7d_pct_change,
			mpc.volume_options_30d_pct_change,
			mpc.mcap,
			cm.mcap AS chain_mcap,
			mpc.pf_ratio,
			mpc.ps_ratio,
			oi.open_interest
		FROM lens.metrics_protocol_by_chain_current mpc
		LEFT JOIN category_meta cat ON cat.protocol = mpc.protocol
		LEFT JOIN oracle_meta oracles ON oracles.protocol = mpc.protocol AND oracles.chain = lower(mpc.chain)
		LEFT JOIN open_interest oi ON oi.protocol = mpc.protocol AND oi.chain = mpc.chain
		LEFT JOIN chain_mcap cm ON cm.chain = lower(mpc.chain)
		WHERE COALESCE(cardinality($1::text[]), 0) = 0 OR lower(mpc.chain) = ANY($1)
	`,
		[chainFilters]
	)

	return rows.map((row) => {
		const base = buildBaseRow(row, totals, {
			slug: row.protocol,
			parentSlug: null,
			category: row.protocol_category,
			chainSlugs: row.chain_slugs
		})
		const chainSlug = row.chain_slug ?? 'unknown'
		const chainName = formatDisplayName(chainSlug) || chainSlug
		return {
			...base,
			id: `protocol-${row.protocol}-${chainSlug}`,
			chain: chainName,
			chains: [chainName],
			allChains: base.chains,
			metrics: baseMetricsMapping(row, totals)
		}
	})
}

type SubProtocolChainRow = ProtocolAggregateRow & {
	sub_protocol: string
	protocol: string
}

const fetchSubProtocolsByChain = async (
	chainFilters: string[],
	totals: Awaited<typeof totalsPromise>
): Promise<NormalizedRow[]> => {
	const rows = await llamaDb.any<SubProtocolChainRow>(
		`
		WITH oracle_meta AS (
			SELECT
				COALESCE(sub_protocol, protocol) AS sub_protocol,
				lower(chain) AS chain,
				array_remove(array_agg(DISTINCT oracle ORDER BY oracle), NULL) AS oracle_names
			FROM lens.oracle_tvs_current
			WHERE sub_protocol IS NOT NULL OR protocol IS NOT NULL
			GROUP BY COALESCE(sub_protocol, protocol), lower(chain)
		),
		chain_mcap AS (
			SELECT
				lower(chain) AS chain,
				mcap
			FROM lens.metrics_chain_current
		)
		SELECT
			mspc.sub_protocol,
			mspc.protocol,
			mspc.category AS protocol_category,
			ARRAY[lower(mspc.chain)] AS chain_slugs,
			oracles.oracle_names,
			mspc.chain AS chain_slug,
			mspc.tvl_base,
			mspc.tvl_base_1d_pct_change,
			mspc.tvl_base_7d_pct_change,
			mspc.tvl_base_30d_pct_change,
			mspc.volume_dexs_1d,
			mspc.volume_dexs_7d,
			mspc.volume_dexs_30d,
			mspc.volume_dexs_1d_pct_change,
			mspc.volume_dexs_7d_pct_change,
			mspc.volume_dexs_30d_pct_change,
			mspc.volume_dexs_alltime,
			mspc.fees_1d,
			mspc.fees_7d,
			mspc.fees_30d,
			mspc.fees_365d,
			mspc.fees_alltime,
			mspc.fees_annualised,
			mspc.fees_1d_pct_change,
			mspc.fees_7d_pct_change,
			mspc.fees_30d_pct_change,
			mspc.holder_revenue_1d,
			mspc.holder_revenue_7d,
			mspc.holder_revenue_30d,
			mspc.holder_revenue_30d_pct_change,
			mspc.revenue_1d,
			mspc.revenue_7d,
			mspc.revenue_30d,
			mspc.revenue_365d,
			mspc.revenue_annualised,
			mspc.revenue_1d_pct_change,
			mspc.revenue_7d_pct_change,
			mspc.revenue_30d_pct_change,
			mspc.volume_derivatives_1d,
			mspc.volume_derivatives_7d,
			mspc.volume_derivatives_30d,
			mspc.volume_derivatives_1d_pct_change,
			mspc.volume_derivatives_7d_pct_change,
			mspc.volume_derivatives_30d_pct_change,
			mspc.volume_aggregators_1d,
			mspc.volume_aggregators_7d,
			mspc.volume_aggregators_30d,
			mspc.volume_aggregators_1d_pct_change,
			mspc.volume_aggregators_7d_pct_change,
			mspc.volume_aggregators_30d_pct_change,
			mspc.volume_aggr_derivatives_1d,
			mspc.volume_aggr_derivatives_7d,
			mspc.volume_aggr_derivatives_30d,
			mspc.volume_aggr_derivatives_1d_pct_change,
			mspc.volume_aggr_derivatives_7d_pct_change,
			mspc.volume_aggr_derivatives_30d_pct_change,
			mspc.volume_options_1d,
			mspc.volume_options_7d,
			mspc.volume_options_30d,
			mspc.volume_options_1d_pct_change,
			mspc.volume_options_7d_pct_change,
			mspc.volume_options_30d_pct_change,
			mspc.mcap,
			cm.mcap AS chain_mcap,
			mspc.pf_ratio,
			mspc.ps_ratio,
			NULL AS open_interest
		FROM lens.metrics_sub_protocol_by_chain_current mspc
		LEFT JOIN oracle_meta oracles ON oracles.sub_protocol = mspc.sub_protocol AND oracles.chain = lower(mspc.chain)
		LEFT JOIN chain_mcap cm ON cm.chain = lower(mspc.chain)
		WHERE
			mspc.sub_protocol != mspc.protocol
			AND (COALESCE(cardinality($1::text[]), 0) = 0 OR lower(mspc.chain) = ANY($1))
	`,
		[chainFilters]
	)

	return rows.map((row) => {
		const base = buildBaseRow(row, totals, {
			slug: row.sub_protocol,
			parentSlug: row.protocol,
			category: row.protocol_category,
			chainSlugs: row.chain_slugs
		})
		const chainSlug = row.chain_slug ?? 'unknown'
		const chainName = formatDisplayName(chainSlug) || chainSlug
		return {
			...base,
			id: `protocol-${row.sub_protocol}-${chainSlug}`,
			chain: chainName,
			chains: [chainName],
			allChains: base.chains,
			metrics: baseMetricsMapping(row, totals)
		}
	})
}

type ChainMetricsRow = {
	chain: string
	protocol_count: number | null
	tvl_base: number | null
	volume_dexs_1d: number | null
	bridged_tvl: number | null
	stables_mcap: number | null
}

const fetchChainMetricsForGrouping = async (
	chainFilters: string[],
	totals: Awaited<typeof totalsPromise>
): Promise<Record<string, ChainMetrics>> => {
	const conditions: string[] = []
	const values: any[] = []

	if (chainFilters.length) {
		conditions.push(`lower(mc.chain) = ANY($${values.length + 1})`)
		values.push(chainFilters)
	}

	const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

	const totalStables = await llamaDb.oneOrNone<{ total: number | null }>(
		`SELECT SUM(mcap) AS total FROM lens.stablecoin_supply_current`
	)

	const rows = await llamaDb.any<ChainMetricsRow>(
		`
		SELECT
			mc.chain,
			mc.protocol_count,
			mc.tvl_base,
			mc.volume_dexs_1d,
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
		${whereClause}
		`,
		values
	)

	const result: Record<string, ChainMetrics> = {}
	for (const row of rows) {
		const chainSlug = row.chain?.toLowerCase().replace(/\s+/g, '-') ?? 'unknown'
		result[chainSlug] = {
			bridgedTvl: row.bridged_tvl ?? null,
			stablesMcap: row.stables_mcap ?? null,
			tvlShare: computeShare(row.tvl_base, totals.tvl_base),
			stablesShare: computeShare(row.stables_mcap, totalStables?.total),
			volume24hShare: computeShare(row.volume_dexs_1d, totals.volume_dexs_1d),
			protocolCount: row.protocol_count ?? null
		}
	}

	return result
}
