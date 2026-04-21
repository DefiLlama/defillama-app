import {
	SERVER_URL,
	V2_SERVER_URL,
	YIELDS_SERVER_URL,
	BRIDGES_SERVER_URL,
	RWA_SERVER_URL,
	STABLECOINS_SERVER_URL
} from '~/constants'
import { slug as toSlug } from '~/utils'
import { rwaSlug } from '~/containers/RWA/rwaSlug'

export type CategoryBreakdownKind = { kind: 'tvl' } | { kind: 'dimension'; adapterType: string; dataType?: string }

export interface ChartDatasetDefinition {
	slug: string
	name: string
	description: string
	category: string
	paramType: 'protocol' | 'chain'
	paramLabel: string
	optionsUrl: string
	extractOptions: (json: any) => Array<{ label: string; value: string }>
	buildUrl: (param: string) => string
	extractRows: (json: any) => Array<Record<string, unknown>>
	customFetch?: (param: string) => Promise<Array<Record<string, unknown>>>
	categoryBreakdown?: CategoryBreakdownKind
}

const OVERVIEW_QS = 'excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true'

type ProtocolOption = { label: string; value: string; category?: string; isChild?: boolean }

/**
 * Group protocols by parent, following the same pattern as ProDashboard.
 *
 * The `parentProtocols` array from the API provides parent entries (id, name).
 * Children reference their parent via `parentProtocol` field.
 * We create synthetic parent entries with aggregated sort values,
 * merge them with solo protocols, and nest children underneath.
 */
function groupProtocolOptions(json: any, sortValue: (p: any) => number, labelFn: (p: any) => string): ProtocolOption[] {
	const protocols: any[] = json?.protocols ?? []
	const parentProtocols: any[] = Array.isArray(json?.parentProtocols) ? json.parentProtocols : []

	const filtered = protocols.filter((p: any) => p?.name)

	// Aggregate child sort values per parent
	const parentTotals = new Map<string, number>()
	const childrenByParentId = new Map<string, any[]>()

	for (const p of filtered) {
		if (p.parentProtocol) {
			parentTotals.set(p.parentProtocol, (parentTotals.get(p.parentProtocol) || 0) + sortValue(p))
			const arr = childrenByParentId.get(p.parentProtocol) || []
			arr.push(p)
			childrenByParentId.set(p.parentProtocol, arr)
		}
	}

	// Build synthetic parent entries from the parentProtocols array
	const matchedParentIds = new Set<string>()
	const syntheticParents = parentProtocols
		.filter((pp: any) => childrenByParentId.has(pp.id))
		.map((pp: any) => {
			matchedParentIds.add(pp.id)
			return {
				name: pp.name,
				id: pp.id,
				category: childrenByParentId.get(pp.id)?.[0]?.category ?? undefined,
				_syntheticTvl: parentTotals.get(pp.id) || 0,
				parentProtocol: null
			}
		})

	// Children whose parent isn't in parentProtocols (e.g. overview APIs) — treat as top-level
	const orphanedChildren = filtered.filter((p: any) => p.parentProtocol && !matchedParentIds.has(p.parentProtocol))

	// Merge: solo protocols + synthetic parents + orphaned children, then sort
	const parentsOrSolo = [...filtered.filter((p: any) => !p.parentProtocol), ...syntheticParents, ...orphanedChildren]
	parentsOrSolo.sort((a, b) => (b._syntheticTvl ?? sortValue(b)) - (a._syntheticTvl ?? sortValue(a)))

	const options: ProtocolOption[] = []
	for (const parent of parentsOrSolo) {
		options.push({
			label: labelFn(parent),
			value: toSlug(parent.name),
			category: parent.category ?? undefined
		})
		const children = childrenByParentId.get(parent.id) || []
		if (children.length > 0) {
			children.sort((a: any, b: any) => sortValue(b) - sortValue(a))
			for (const child of children) {
				options.push({
					label: labelFn(child),
					value: toSlug(child.name),
					category: child.category ?? undefined,
					isChild: true
				})
			}
		}
	}

	return options
}

const extractOverviewProtocolOptions = (json: any): ProtocolOption[] =>
	groupProtocolOptions(
		json,
		(p) => Number(p?.total24h) || 0,
		(p) => p.displayName || p.name
	)

const extractLiteProtocolOptions = (json: any): ProtocolOption[] =>
	groupProtocolOptions(
		json,
		(p) => Number(p?.tvlUsd ?? p?.tvl) || 0,
		(p) => p.name
	)

function sumBorrowedTvl(chainTvls: unknown): number {
	if (!chainTvls || typeof chainTvls !== 'object' || Array.isArray(chainTvls)) return 0
	let total = 0
	for (const [key, entry] of Object.entries(chainTvls as Record<string, any>)) {
		if (!key.endsWith('-borrowed')) continue
		const tvl = entry && typeof entry === 'object' ? Number(entry.tvl) : Number(entry)
		if (Number.isFinite(tvl) && tvl > 0) total += tvl
	}
	return total
}

const extractActiveLoansProtocolOptions = (json: any): ProtocolOption[] => {
	const protocols: any[] = json?.protocols ?? []
	const withBorrowed = protocols.filter((p) => sumBorrowedTvl(p?.chainTvls) > 0)
	const parentIdsWithBorrowed = new Set<string>()
	for (const p of withBorrowed) {
		if (p?.parentProtocol) parentIdsWithBorrowed.add(p.parentProtocol)
	}
	const parentProtocols: any[] = Array.isArray(json?.parentProtocols)
		? json.parentProtocols.filter((pp: any) => parentIdsWithBorrowed.has(pp?.id))
		: []
	return groupProtocolOptions(
		{ protocols: withBorrowed, parentProtocols },
		(p) => sumBorrowedTvl(p?.chainTvls),
		(p) => p.name
	)
}

const extractOverviewChainOptions = (json: any): Array<{ label: string; value: string }> => {
	const chains: string[] = json?.allChains ?? []
	return [
		{ label: 'All Chains', value: 'all' },
		...chains
			.filter(Boolean)
			.map((c) => ({ label: c, value: toSlug(c) }))
			.sort((a, b) => a.label.localeCompare(b.label))
	]
}

const extractTimestampValuePairs = (json: any): Array<Record<string, unknown>> => {
	if (!Array.isArray(json)) return []
	return json
		.filter((item: any) => Array.isArray(item) && item.length >= 2)
		.map(([timestamp, value]: [number, number]) => ({
			date: timestamp,
			value
		}))
}

const extractLiteChartRows = (json: any): Array<Record<string, unknown>> => {
	if (Array.isArray(json)) {
		return json
			.filter((item: any) => item && typeof item === 'object' && item.date != null)
			.map((item: any) => {
				const row: Record<string, unknown> = { date: item.date }
				for (const [key, val] of Object.entries(item)) {
					if (key === 'date') continue
					row[key] = val
				}
				return row
			})
	}
	if (json && typeof json === 'object') {
		const metrics = Object.keys(json).filter((k) => json[k] && typeof json[k] === 'object')
		if (metrics.length === 0) return []

		const isArrayOfPairs = metrics.some(
			(k) => Array.isArray(json[k]) && json[k].length > 0 && Array.isArray(json[k][0])
		)

		if (isArrayOfPairs) {
			const tsMap = new Map<number, Record<string, unknown>>()
			for (const metric of metrics) {
				const arr = json[metric]
				if (!Array.isArray(arr)) continue
				for (const entry of arr) {
					if (!Array.isArray(entry) || entry.length < 2) continue
					const ts = Number(entry[0])
					if (!Number.isFinite(ts)) continue
					let row = tsMap.get(ts)
					if (!row) {
						row = { date: ts }
						tsMap.set(ts, row)
					}
					row[metric] = entry[1]
				}
			}
			return [...tsMap.entries()].sort(([a], [b]) => a - b).map(([, row]) => row)
		}

		const timestampSet = new Set<string>()
		for (const metric of metrics) {
			for (const ts of Object.keys(json[metric])) timestampSet.add(ts)
		}
		return [...timestampSet]
			.sort((a, b) => Number(a) - Number(b))
			.map((ts) => {
				const row: Record<string, unknown> = { date: Number(ts) }
				for (const metric of metrics) {
					row[metric] = json[metric][ts] ?? null
				}
				return row
			})
	}
	return []
}

const extractBridgeVolumeRows = (json: any): Array<Record<string, unknown>> => {
	if (!Array.isArray(json)) return []
	return json
		.filter((item: any) => item && item.date != null)
		.map((item: any) => ({
			date: item.date,
			depositUSD: item.depositUSD ?? null,
			withdrawUSD: item.withdrawUSD ?? null,
			depositTxs: item.depositTxs ?? null,
			withdrawTxs: item.withdrawTxs ?? null
		}))
}

const extractYieldChartRows = (json: any): Array<Record<string, unknown>> => {
	const data: any[] = json?.data ?? (Array.isArray(json) ? json : [])
	return data
		.filter((item: any) => item && item.timestamp != null)
		.map((item: any) => ({
			date: Math.floor(new Date(item.timestamp).getTime() / 1000),
			tvlUsd: item.tvlUsd ?? null,
			apy: item.apy ?? null,
			apyBase: item.apyBase ?? null,
			apyReward: item.apyReward ?? null
		}))
}

const extractRWACategoryRows = (json: any): Array<Record<string, unknown>> => {
	if (!Array.isArray(json)) return []
	return json
		.filter((item: any) => item && item.timestamp != null)
		.map((item: any) => {
			const row: Record<string, unknown> = { date: item.timestamp }
			for (const [key, val] of Object.entries(item)) {
				if (key === 'timestamp') continue
				row[key] = val
			}
			return row
		})
}

// const extractRWAAssetBreakdownRows = (json: any): Array<Record<string, unknown>> => {
// 	if (!json || typeof json !== 'object' || Array.isArray(json)) return []
// 	const onChainMcap: any[] = json.onChainMcap ?? []
// 	if (!Array.isArray(onChainMcap) || onChainMcap.length === 0) return []
// 	return onChainMcap
// 		.filter((item: any) => item && item.timestamp != null)
// 		.map((item: any) => {
// 			const row: Record<string, unknown> = { date: item.timestamp }
// 			for (const [key, val] of Object.entries(item)) {
// 				if (key === 'timestamp') continue
// 				row[key] = val
// 			}
// 			return row
// 		})
// }

function sumRecord(rec: unknown): number {
	if (!rec || typeof rec !== 'object' || Array.isArray(rec)) return 0
	let total = 0
	for (const v of Object.values(rec)) {
		if (typeof v === 'number' && Number.isFinite(v)) total += v
	}
	return total
}

function makeDimensionProtocolChart(opts: {
	slug: string
	name: string
	description: string
	category: string
	adapterType: string
	dataType?: string
}): ChartDatasetDefinition {
	const dtParam = opts.dataType ? `&dataType=${opts.dataType}` : ''
	const dtChartParam = opts.dataType ? `?dataType=${opts.dataType}` : ''
	return {
		slug: opts.slug,
		name: opts.name,
		description: opts.description,
		category: opts.category,
		paramType: 'protocol',
		paramLabel: 'Protocol',
		optionsUrl: `${SERVER_URL}/overview/${opts.adapterType}?${OVERVIEW_QS}${dtParam}`,
		extractOptions: extractOverviewProtocolOptions,
		buildUrl: (param: string) => `${V2_SERVER_URL}/chart/${opts.adapterType}/protocol/${param}${dtChartParam}`,
		extractRows: extractTimestampValuePairs,
		categoryBreakdown: { kind: 'dimension', adapterType: opts.adapterType, dataType: opts.dataType }
	}
}

function makeDimensionChainChart(opts: {
	slug: string
	name: string
	description: string
	category: string
	adapterType: string
	dataType?: string
}): ChartDatasetDefinition {
	const dtParam = opts.dataType ? `&dataType=${opts.dataType}` : ''
	const dtChartParam = opts.dataType ? `?dataType=${opts.dataType}` : ''
	return {
		slug: opts.slug,
		name: opts.name,
		description: opts.description,
		category: opts.category,
		paramType: 'chain',
		paramLabel: 'Chain',
		optionsUrl: `${SERVER_URL}/overview/${opts.adapterType}?${OVERVIEW_QS}${dtParam}`,
		extractOptions: extractOverviewChainOptions,
		buildUrl: (param: string) =>
			param === 'all'
				? `${V2_SERVER_URL}/chart/${opts.adapterType}${dtChartParam}`
				: `${V2_SERVER_URL}/chart/${opts.adapterType}/chain/${param}${dtChartParam}`,
		extractRows: extractTimestampValuePairs
	}
}

const extractOverviewCategoryOptions = (json: any): Array<{ label: string; value: string }> => {
	const protocols: any[] = json?.protocols ?? []
	const catTotals = new Map<string, number>()
	for (const p of protocols) {
		const c = p?.category
		if (typeof c === 'string' && c) {
			catTotals.set(c, (catTotals.get(c) || 0) + (Number(p?.total24h) || 0))
		}
	}
	return [...catTotals.entries()].sort(([, a], [, b]) => b - a).map(([c]) => ({ label: c, value: toSlug(c) }))
}

function makeDimensionCategoryChart(opts: {
	slug: string
	name: string
	description: string
	category: string
	adapterType: string
	dataType?: string
}): ChartDatasetDefinition {
	const dtParam = opts.dataType ? `&dataType=${opts.dataType}` : ''
	const dtChartParam = opts.dataType ? `?dataType=${opts.dataType}` : ''
	return {
		slug: opts.slug,
		name: opts.name,
		description: opts.description,
		category: opts.category,
		paramType: 'protocol',
		paramLabel: 'Category',
		optionsUrl: `${SERVER_URL}/overview/${opts.adapterType}?${OVERVIEW_QS}${dtParam}`,
		extractOptions: extractOverviewCategoryOptions,
		buildUrl: (param: string) => `${V2_SERVER_URL}/chart/${opts.adapterType}/category/${param}${dtChartParam}`,
		extractRows: extractTimestampValuePairs
	}
}

export const chartDatasets: ChartDatasetDefinition[] = [
	{
		slug: 'rwa-category-chart',
		name: 'RWA by Category',
		description: 'Historical Real World Asset breakdown by category (Tokenized Funds, Gold, Stocks, etc.)',
		category: 'RWA',
		paramType: 'chain',
		paramLabel: 'Chain',
		optionsUrl: `${RWA_SERVER_URL}/current?z=0`,
		extractOptions: (json) => {
			const allOption = { label: 'All Chains', value: 'all' }
			if (!Array.isArray(json)) return [allOption]
			const chainMcap = new Map<string, number>()
			for (const item of json) {
				const chains = item?.chain
				const mcapData = item?.activeMcap
				if (!Array.isArray(chains)) continue
				for (const c of chains) {
					if (typeof c !== 'string') continue
					let mcap = 0
					if (mcapData && typeof mcapData === 'object' && !Array.isArray(mcapData)) {
						mcap = Number(mcapData[c]) || 0
					}
					chainMcap.set(c, (chainMcap.get(c) ?? 0) + mcap)
				}
			}
			return [
				allOption,
				...[...chainMcap.entries()].sort(([, a], [, b]) => b - a).map(([c]) => ({ label: c, value: c }))
			]
		},
		buildUrl: (_param: string) => `${RWA_SERVER_URL}/chart/category-breakdown`,
		extractRows: extractRWACategoryRows,
		customFetch: async (param: string) => {
			if (param === 'all') {
				const resp = await fetch(`${RWA_SERVER_URL}/chart/category-breakdown`)
				if (!resp.ok) return []
				return extractRWACategoryRows(await resp.json())
			}
			const [assetResp, assetsResp] = await Promise.all([
				fetch(`${RWA_SERVER_URL}/chart/chain/${param}/asset-breakdown`),
				fetch(`${RWA_SERVER_URL}/current?z=0`)
			])
			if (!assetResp.ok || !assetsResp.ok) return []
			const assetData = await assetResp.json()
			const assets: any[] = await assetsResp.json()
			const assetToCategory = new Map<string, string>()
			if (Array.isArray(assets)) {
				for (const a of assets) {
					const canonicalMarketId = a?.canonicalMarketId
					const cats = a?.category
					if (typeof canonicalMarketId === 'string' && Array.isArray(cats) && cats.length > 0) {
						assetToCategory.set(canonicalMarketId, cats[0])
					}
				}
			}
			const onChainMcap: any[] = assetData?.onChainMcap ?? []
			if (!Array.isArray(onChainMcap) || onChainMcap.length === 0) return []
			return onChainMcap
				.filter((item: any) => item && item.timestamp != null)
				.map((item: any) => {
					const row: Record<string, unknown> = { date: item.timestamp }
					const catTotals = new Map<string, number>()
					for (const [key, val] of Object.entries(item)) {
						if (key === 'timestamp') continue
						const cat = assetToCategory.get(key) ?? 'Other'
						catTotals.set(cat, (catTotals.get(cat) ?? 0) + (Number(val) || 0))
					}
					for (const [cat, total] of catTotals) {
						row[cat] = total
					}
					return row
				})
		}
	},
	{
		slug: 'rwa-chain-chart',
		name: 'RWA by Chain',
		description: 'Historical total RWA on-chain mcap for a specific chain',
		category: 'RWA',
		paramType: 'chain',
		paramLabel: 'Chain',
		optionsUrl: `${RWA_SERVER_URL}/current?z=0`,
		extractOptions: (json) => {
			if (!Array.isArray(json)) return []
			const chainMcap = new Map<string, number>()
			for (const item of json) {
				const chains = item?.chain
				const mcapData = item?.activeMcap
				if (!Array.isArray(chains)) continue
				for (const c of chains) {
					if (typeof c !== 'string') continue
					let mcap = 0
					if (mcapData && typeof mcapData === 'object' && !Array.isArray(mcapData)) {
						mcap = Number(mcapData[c]) || 0
					}
					chainMcap.set(c, (chainMcap.get(c) ?? 0) + mcap)
				}
			}
			return [...chainMcap.entries()].sort(([, a], [, b]) => b - a).map(([c]) => ({ label: c, value: c }))
		},
		buildUrl: (param: string) => `${RWA_SERVER_URL}/chart/chain/${param}/asset-breakdown`,
		extractRows: (json) => {
			if (!json || typeof json !== 'object' || Array.isArray(json)) return []
			const onChainMcap: any[] = json.onChainMcap ?? []
			if (!Array.isArray(onChainMcap) || onChainMcap.length === 0) return []
			return onChainMcap
				.filter((item: any) => item && item.timestamp != null)
				.map((item: any) => {
					let total = 0
					for (const [key, val] of Object.entries(item)) {
						if (key === 'timestamp') continue
						if (typeof val === 'number' && Number.isFinite(val)) total += val
					}
					return { date: item.timestamp, value: total }
				})
		}
	},
	{
		slug: 'rwa-asset-chart',
		name: 'RWA by Asset',
		description: 'Historical on-chain mcap time series for every Real World Asset in a selected category',
		category: 'RWA',
		paramType: 'protocol',
		paramLabel: 'Category',
		optionsUrl: `${RWA_SERVER_URL}/current?z=0`,
		extractOptions: (json) => {
			if (!Array.isArray(json)) return []
			const catMcap = new Map<string, number>()
			for (const item of json) {
				const cats = item?.category
				if (!Array.isArray(cats)) continue
				const total = sumRecord(item?.onChainMcap)
				for (const c of cats) {
					if (typeof c !== 'string' || !c) continue
					if (c === 'rwa-perps') continue
					catMcap.set(c, (catMcap.get(c) ?? 0) + total)
				}
			}
			return [...catMcap.entries()]
				.sort(([, a], [, b]) => b - a)
				.map(([c]) => ({ label: c, value: rwaSlug(c) }))
		},
		buildUrl: (param: string) => `${RWA_SERVER_URL}/chart/category/${param}/asset-breakdown`,
		extractRows: () => [],
		customFetch: async (param: string) => {
			const [chartResp, assetsResp] = await Promise.all([
				fetch(`${RWA_SERVER_URL}/chart/category/${param}/asset-breakdown`),
				fetch(`${RWA_SERVER_URL}/current?z=0`)
			])
			if (!chartResp.ok || !assetsResp.ok) return []
			const chart = await chartResp.json()
			const assets: any[] = await assetsResp.json()
			const idToName = new Map<string, string>()
			if (Array.isArray(assets)) {
				for (const a of assets) {
					const id = a?.canonicalMarketId
					const name = a?.assetName ?? a?.ticker
					if (typeof id === 'string' && typeof name === 'string') {
						idToName.set(id, name)
					}
				}
			}
			const onChainMcap: any[] = chart?.onChainMcap ?? []
			if (!Array.isArray(onChainMcap) || onChainMcap.length === 0) return []
			return onChainMcap
				.filter((item: any) => item && item.timestamp != null)
				.map((item: any) => {
					const row: Record<string, unknown> = { date: item.timestamp }
					const seen = new Map<string, number>()
					for (const [key, val] of Object.entries(item)) {
						if (key === 'timestamp') continue
						const label = idToName.get(key) ?? key
						seen.set(label, (seen.get(label) ?? 0) + (Number(val) || 0))
					}
					for (const [label, v] of seen) row[label] = v
					return row
				})
		}
	},

	{
		slug: 'stablecoin-mcap-chart',
		name: 'Stablecoin Mcap by Stablecoin',
		description: 'Historical circulating supply for a specific stablecoin',
		category: 'Stablecoins',
		paramType: 'protocol',
		paramLabel: 'Stablecoin',
		optionsUrl: `${STABLECOINS_SERVER_URL}/stablecoins`,
		extractOptions: (json) => {
			const assets: any[] = json?.peggedAssets ?? []
			return assets
				.filter((a: any) => a?.name && !a.deprecated && !a.delisted)
				.sort((a: any, b: any) => sumRecord(b.circulating) - sumRecord(a.circulating))
				.map((a: any) => ({ label: `${a.name} (${a.symbol})`, value: a.id }))
		},
		buildUrl: (param: string) => `${STABLECOINS_SERVER_URL}/stablecoin/${param}`,
		extractRows: (json) => {
			const tokens: any[] = json?.tokens ?? []
			return tokens
				.filter((t: any) => t?.date != null)
				.map((t: any) => ({
					date: t.date,
					circulating: sumRecord(t.circulating)
				}))
		}
	},
	{
		slug: 'stablecoin-chain-mcap-chart',
		name: 'Stablecoin Mcap by Chain',
		description: 'Historical total stablecoin circulating supply for a specific chain',
		category: 'Stablecoins',
		paramType: 'chain',
		paramLabel: 'Chain',
		optionsUrl: `${STABLECOINS_SERVER_URL}/stablecoins`,
		extractOptions: (json) => {
			const chains: any[] = json?.chains ?? []
			return [
				{ label: 'All Chains', value: 'all' },
				...chains
					.filter((c: any) => c?.name)
					.sort((a: any, b: any) => sumRecord(b.totalCirculatingUSD) - sumRecord(a.totalCirculatingUSD))
					.map((c: any) => ({ label: c.name, value: c.name }))
			]
		},
		buildUrl: (param: string) => `${STABLECOINS_SERVER_URL}/stablecoincharts2/${param}`,
		extractRows: (json) => {
			const points: any[] = json?.aggregated ?? []
			return points
				.filter((p: any) => p?.date != null)
				.map((p: any) => ({
					date: Number(p.date),
					totalCirculatingUSD: sumRecord(p.totalCirculatingUSD)
				}))
		}
	},

	{
		slug: 'cex-inflows-chart',
		name: 'CEX Inflows',
		description: 'Historical daily USD inflows/outflows for a specific centralized exchange',
		category: 'CEX',
		paramType: 'protocol',
		paramLabel: 'Exchange',
		optionsUrl: `${SERVER_URL}/cexs`,
		extractOptions: (json) => {
			const cexs: any[] = json?.cexs ?? []
			return cexs
				.filter((c: any) => c?.slug)
				.sort((a: any, b: any) => (Number(b?.currentTvl) || 0) - (Number(a?.currentTvl) || 0))
				.map((c: any) => ({ label: c.name, value: toSlug(c.slug) }))
		},
		buildUrl: (param: string) => `${V2_SERVER_URL}/chart/tvl/protocol/${param}`,
		extractRows: (json) => {
			const pairs = extractTimestampValuePairs(json)
			if (pairs.length < 2) return []
			const rows: Array<Record<string, unknown>> = []
			for (let i = 1; i < pairs.length; i++) {
				const currentVal = pairs[i].value as number
				const prevVal = pairs[i - 1].value as number
				if (currentVal == null || prevVal == null || !Number.isFinite(currentVal) || !Number.isFinite(prevVal)) continue
				rows.push({
					date: pairs[i].date,
					inflow: currentVal - prevVal
				})
			}
			return rows
		}
	},

	{
		slug: 'protocol-tvl-chart',
		name: 'Protocol TVL',
		description: 'Historical TVL timeseries for a specific protocol',
		category: 'TVL',
		paramType: 'protocol',
		paramLabel: 'Protocol',
		optionsUrl: `${SERVER_URL}/lite/protocols2?b=2`,
		extractOptions: extractLiteProtocolOptions,
		buildUrl: (param: string) => `${V2_SERVER_URL}/chart/tvl/protocol/${param}`,
		extractRows: extractTimestampValuePairs,
		categoryBreakdown: { kind: 'tvl' }
	},
	{
		slug: 'protocol-active-loans-chart',
		name: 'Protocol Active Loans',
		description: 'Historical active loans (borrowed) timeseries for a specific protocol',
		category: 'TVL',
		paramType: 'protocol',
		paramLabel: 'Protocol',
		optionsUrl: `${SERVER_URL}/lite/protocols2?b=2`,
		extractOptions: extractActiveLoansProtocolOptions,
		buildUrl: (param: string) => `${V2_SERVER_URL}/chart/tvl/protocol/${param}?key=borrowed`,
		extractRows: extractTimestampValuePairs
	},
	{
		slug: 'chain-tvl-chart',
		name: 'Chain TVL',
		description: 'Historical TVL timeseries for a specific chain',
		category: 'TVL',
		paramType: 'chain',
		paramLabel: 'Chain',
		optionsUrl: `${V2_SERVER_URL}/chains`,
		extractOptions: (json) => {
			if (!Array.isArray(json)) return [{ label: 'All Chains', value: 'all' }]
			return [
				{ label: 'All Chains', value: 'all' },
				...json
					.filter((c: any) => c?.name)
					.sort((a: any, b: any) => (Number(b?.tvl) || 0) - (Number(a?.tvl) || 0))
					.map((c: any) => ({ label: c.name, value: c.name }))
			]
		},
		buildUrl: (param: string) => (param === 'all' ? `${SERVER_URL}/lite/charts` : `${SERVER_URL}/lite/charts/${param}`),
		extractRows: extractLiteChartRows
	},
	{
		slug: 'category-tvl-chart',
		name: 'Category TVL',
		description: 'Historical TVL for a specific protocol category',
		category: 'TVL',
		paramType: 'protocol',
		paramLabel: 'Category',
		optionsUrl: `${SERVER_URL}/categories`,
		extractOptions: (json) => {
			const categories = json?.categories
			if (!categories || typeof categories !== 'object') return []
			const keys = Array.isArray(categories)
				? categories.filter((c: any) => typeof c === 'string')
				: Object.keys(categories)
			return keys
				.sort((a: string, b: string) => a.localeCompare(b))
				.map((c: string) => ({ label: c, value: toSlug(c) }))
		},
		buildUrl: (param: string) => `${SERVER_URL}/charts/categories/${param}`,
		extractRows: extractLiteChartRows
	},

	makeDimensionProtocolChart({
		slug: 'protocol-fees-chart',
		name: 'Protocol Fees',
		description: 'Historical daily fees for a specific protocol',
		category: 'Fees & Revenue',
		adapterType: 'fees'
	}),
	makeDimensionChainChart({
		slug: 'chain-fees-chart',
		name: 'Chain Fees',
		description: 'Historical daily fees for a specific chain',
		category: 'Fees & Revenue',
		adapterType: 'fees'
	}),
	makeDimensionProtocolChart({
		slug: 'protocol-revenue-chart',
		name: 'Protocol Revenue',
		description: 'Historical daily revenue for a specific protocol',
		category: 'Fees & Revenue',
		adapterType: 'fees',
		dataType: 'dailyRevenue'
	}),
	makeDimensionChainChart({
		slug: 'chain-revenue-chart',
		name: 'Chain Revenue',
		description: 'Historical daily revenue for a specific chain',
		category: 'Fees & Revenue',
		adapterType: 'fees',
		dataType: 'dailyRevenue'
	}),
	makeDimensionProtocolChart({
		slug: 'protocol-user-fees-chart',
		name: 'Protocol User Fees',
		description: 'Historical daily user fees for a specific protocol',
		category: 'Fees & Revenue',
		adapterType: 'fees',
		dataType: 'dailyUserFees'
	}),
	makeDimensionChainChart({
		slug: 'chain-user-fees-chart',
		name: 'Chain User Fees',
		description: 'Historical daily user fees for a specific chain',
		category: 'Fees & Revenue',
		adapterType: 'fees',
		dataType: 'dailyUserFees'
	}),
	makeDimensionProtocolChart({
		slug: 'protocol-holders-revenue-chart',
		name: 'Protocol Holders Revenue',
		description: 'Historical daily holders revenue for a specific protocol',
		category: 'Fees & Revenue',
		adapterType: 'fees',
		dataType: 'dailyHoldersRevenue'
	}),
	makeDimensionChainChart({
		slug: 'chain-holders-revenue-chart',
		name: 'Chain Holders Revenue',
		description: 'Historical daily holders revenue for a specific chain',
		category: 'Fees & Revenue',
		adapterType: 'fees',
		dataType: 'dailyHoldersRevenue'
	}),
	makeDimensionProtocolChart({
		slug: 'protocol-protocol-revenue-chart',
		name: 'Protocol Treasury Revenue',
		description: 'Historical daily protocol treasury revenue for a specific protocol',
		category: 'Fees & Revenue',
		adapterType: 'fees',
		dataType: 'dailyProtocolRevenue'
	}),
	makeDimensionChainChart({
		slug: 'chain-protocol-revenue-chart',
		name: 'Chain Treasury Revenue',
		description: 'Historical daily protocol treasury revenue for a specific chain',
		category: 'Fees & Revenue',
		adapterType: 'fees',
		dataType: 'dailyProtocolRevenue'
	}),
	makeDimensionProtocolChart({
		slug: 'protocol-supply-side-revenue-chart',
		name: 'Protocol Supply Side Revenue',
		description: 'Historical daily supply side revenue for a specific protocol',
		category: 'Fees & Revenue',
		adapterType: 'fees',
		dataType: 'dailySupplySideRevenue'
	}),
	makeDimensionChainChart({
		slug: 'chain-supply-side-revenue-chart',
		name: 'Chain Supply Side Revenue',
		description: 'Historical daily supply side revenue for a specific chain',
		category: 'Fees & Revenue',
		adapterType: 'fees',
		dataType: 'dailySupplySideRevenue'
	}),
	makeDimensionProtocolChart({
		slug: 'protocol-bribes-revenue-chart',
		name: 'Protocol Bribes Revenue',
		description: 'Historical daily bribes revenue for a specific protocol',
		category: 'Fees & Revenue',
		adapterType: 'fees',
		dataType: 'dailyBribesRevenue'
	}),
	makeDimensionChainChart({
		slug: 'chain-bribes-revenue-chart',
		name: 'Chain Bribes Revenue',
		description: 'Historical daily bribes revenue for a specific chain',
		category: 'Fees & Revenue',
		adapterType: 'fees',
		dataType: 'dailyBribesRevenue'
	}),
	makeDimensionProtocolChart({
		slug: 'protocol-token-taxes-chart',
		name: 'Protocol Token Taxes',
		description: 'Historical daily token taxes for a specific protocol',
		category: 'Fees & Revenue',
		adapterType: 'fees',
		dataType: 'dailyTokenTaxes'
	}),
	makeDimensionChainChart({
		slug: 'chain-token-taxes-chart',
		name: 'Chain Token Taxes',
		description: 'Historical daily token taxes for a specific chain',
		category: 'Fees & Revenue',
		adapterType: 'fees',
		dataType: 'dailyTokenTaxes'
	}),
	makeDimensionCategoryChart({
		slug: 'category-fees-chart',
		name: 'Category Fees',
		description: 'Historical daily fees for a specific protocol category',
		category: 'Fees & Revenue',
		adapterType: 'fees'
	}),
	makeDimensionCategoryChart({
		slug: 'category-revenue-chart',
		name: 'Category Revenue',
		description: 'Historical daily revenue for a specific protocol category',
		category: 'Fees & Revenue',
		adapterType: 'fees',
		dataType: 'dailyRevenue'
	}),

	makeDimensionProtocolChart({
		slug: 'protocol-dex-volume-chart',
		name: 'Protocol DEX Volume',
		description: 'Historical daily DEX trading volume for a specific protocol',
		category: 'Volume',
		adapterType: 'dexs'
	}),
	makeDimensionChainChart({
		slug: 'chain-dex-volume-chart',
		name: 'Chain DEX Volume',
		description: 'Historical daily DEX trading volume for a specific chain',
		category: 'Volume',
		adapterType: 'dexs'
	}),
	makeDimensionProtocolChart({
		slug: 'protocol-perps-volume-chart',
		name: 'Protocol Perps Volume',
		description: 'Historical daily perpetual derivatives volume for a specific protocol',
		category: 'Volume',
		adapterType: 'derivatives'
	}),
	makeDimensionChainChart({
		slug: 'chain-perps-volume-chart',
		name: 'Chain Perps Volume',
		description: 'Historical daily perpetual derivatives volume for a specific chain',
		category: 'Volume',
		adapterType: 'derivatives'
	}),
	makeDimensionProtocolChart({
		slug: 'protocol-options-premium-chart',
		name: 'Protocol Options Premium Volume',
		description: 'Historical daily options premium volume for a specific protocol',
		category: 'Volume',
		adapterType: 'options',
		dataType: 'dailyPremiumVolume'
	}),
	makeDimensionChainChart({
		slug: 'chain-options-premium-chart',
		name: 'Chain Options Premium Volume',
		description: 'Historical daily options premium volume for a specific chain',
		category: 'Volume',
		adapterType: 'options',
		dataType: 'dailyPremiumVolume'
	}),
	makeDimensionProtocolChart({
		slug: 'protocol-aggregator-volume-chart',
		name: 'Protocol Aggregator Volume',
		description: 'Historical daily DEX aggregator volume for a specific protocol',
		category: 'Volume',
		adapterType: 'aggregators'
	}),
	makeDimensionChainChart({
		slug: 'chain-aggregator-volume-chart',
		name: 'Chain Aggregator Volume',
		description: 'Historical daily DEX aggregator volume for a specific chain',
		category: 'Volume',
		adapterType: 'aggregators'
	}),
	makeDimensionProtocolChart({
		slug: 'protocol-options-notional-chart',
		name: 'Protocol Options Notional Volume',
		description: 'Historical daily options notional volume for a specific protocol',
		category: 'Volume',
		adapterType: 'options',
		dataType: 'dailyNotionalVolume'
	}),
	makeDimensionChainChart({
		slug: 'chain-options-notional-chart',
		name: 'Chain Options Notional Volume',
		description: 'Historical daily options notional volume for a specific chain',
		category: 'Volume',
		adapterType: 'options',
		dataType: 'dailyNotionalVolume'
	}),
	makeDimensionProtocolChart({
		slug: 'protocol-open-interest-chart',
		name: 'Protocol Open Interest',
		description: 'Historical open interest for a specific protocol',
		category: 'Volume',
		adapterType: 'open-interest',
		dataType: 'openInterestAtEnd'
	}),
	makeDimensionChainChart({
		slug: 'chain-open-interest-chart',
		name: 'Chain Open Interest',
		description: 'Historical open interest for a specific chain',
		category: 'Volume',
		adapterType: 'open-interest',
		dataType: 'openInterestAtEnd'
	}),
	makeDimensionProtocolChart({
		slug: 'protocol-perps-aggregator-volume-chart',
		name: 'Protocol Perps Aggregator Volume',
		description: 'Historical daily perps aggregator volume for a specific protocol',
		category: 'Volume',
		adapterType: 'aggregator-derivatives'
	}),
	makeDimensionChainChart({
		slug: 'chain-perps-aggregator-volume-chart',
		name: 'Chain Perps Aggregator Volume',
		description: 'Historical daily perps aggregator volume for a specific chain',
		category: 'Volume',
		adapterType: 'aggregator-derivatives'
	}),
	makeDimensionProtocolChart({
		slug: 'protocol-bridge-aggregator-volume-chart',
		name: 'Protocol Bridge Aggregator Volume',
		description: 'Historical daily bridge aggregator volume for a specific protocol',
		category: 'Volume',
		adapterType: 'bridge-aggregators'
	}),
	makeDimensionChainChart({
		slug: 'chain-bridge-aggregator-volume-chart',
		name: 'Chain Bridge Aggregator Volume',
		description: 'Historical daily bridge aggregator volume for a specific chain',
		category: 'Volume',
		adapterType: 'bridge-aggregators'
	}),
	makeDimensionCategoryChart({
		slug: 'category-dex-volume-chart',
		name: 'Category DEX Volume',
		description: 'Historical daily DEX trading volume for a specific protocol category',
		category: 'Volume',
		adapterType: 'dexs'
	}),
	makeDimensionCategoryChart({
		slug: 'category-perps-volume-chart',
		name: 'Category Perps Volume',
		description: 'Historical daily perpetual derivatives volume for a specific protocol category',
		category: 'Volume',
		adapterType: 'derivatives'
	}),

	{
		slug: 'chain-bridge-volume-chart',
		name: 'Chain Bridge Volume',
		description: 'Historical bridge deposit/withdrawal volume for a specific chain',
		category: 'Bridges',
		paramType: 'chain',
		paramLabel: 'Chain',
		optionsUrl: `${BRIDGES_SERVER_URL}/bridges?includeChains=true`,
		extractOptions: (json) => {
			const chains: any[] = json?.chains ?? []
			return chains
				.filter((c: any) => c?.name)
				.sort((a: any, b: any) => (Number(b?.lastDailyVolume) || 0) - (Number(a?.lastDailyVolume) || 0))
				.map((c: any) => ({ label: c.name, value: c.name }))
		},
		buildUrl: (param: string) => `${BRIDGES_SERVER_URL}/bridgevolume/${param}`,
		extractRows: extractBridgeVolumeRows
	},

	{
		slug: 'yield-pool-chart',
		name: 'Yield Pool History',
		description: 'Historical APY and TVL for a specific yield pool',
		category: 'Yields',
		paramType: 'protocol',
		paramLabel: 'Pool',
		optionsUrl: `${YIELDS_SERVER_URL}/pools`,
		extractOptions: (json) => {
			const pools: any[] = json?.data ?? []
			return pools
				.filter((p: any) => p?.pool)
				.sort((a: any, b: any) => (Number(b?.tvlUsd) || 0) - (Number(a?.tvlUsd) || 0))
				.map((p: any) => ({
					label: `${p.project ?? ''} - ${p.symbol ?? ''} (${p.chain ?? ''})`.trim(),
					value: p.pool
				}))
		},
		buildUrl: (param: string) => `${YIELDS_SERVER_URL}/chart/${param}`,
		extractRows: extractYieldChartRows
	},

	{
		slug: 'oracle-tvs-chart',
		name: 'Oracle TVS',
		description: 'Historical Total Value Secured for a specific oracle provider',
		category: 'Oracles',
		paramType: 'protocol',
		paramLabel: 'Oracle',
		optionsUrl: `${V2_SERVER_URL}/metrics/oracle`,
		extractOptions: (json) => {
			const tvs: Record<string, any> = json?.oraclesTVS ?? {}
			return Object.entries(tvs)
				.sort(([, a], [, b]) => (Number(b) || 0) - (Number(a) || 0))
				.map(([name]) => ({ label: name, value: toSlug(name) }))
		},
		buildUrl: (param: string) => `${V2_SERVER_URL}/chart/oracle/protocol/${param}`,
		extractRows: extractTimestampValuePairs
	}
]

export const chartDatasetsBySlug = new Map(chartDatasets.map((d) => [d.slug, d]))

export const chartDatasetCategories = [...new Set(chartDatasets.map((d) => d.category))]

export type ChartOptionsMap = Record<
	string,
	Array<{ label: string; value: string; category?: string; isChild?: boolean }>
>

export async function fetchAllChartOptions(): Promise<ChartOptionsMap> {
	const urlToDatasets = new Map<string, ChartDatasetDefinition[]>()
	for (const dataset of chartDatasets) {
		const existing = urlToDatasets.get(dataset.optionsUrl) ?? []
		existing.push(dataset)
		urlToDatasets.set(dataset.optionsUrl, existing)
	}

	const result: ChartOptionsMap = {}

	await Promise.all(
		[...urlToDatasets.entries()].map(async ([url, datasets]) => {
			try {
				const response = await fetch(url)
				if (!response.ok) {
					for (const ds of datasets) result[ds.slug] = []
					return
				}
				const json = await response.json()
				for (const ds of datasets) {
					try {
						result[ds.slug] = ds.extractOptions(json)
					} catch {
						result[ds.slug] = []
					}
				}
			} catch {
				for (const ds of datasets) result[ds.slug] = []
			}
		})
	)

	return result
}
