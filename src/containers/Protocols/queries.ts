import { fetchCoinPrices, getAllCGTokensList } from '~/api'
import type { IResponseCGMarketsAPI } from '~/api/types'
import { CHART_COLORS } from '~/constants/colors'
import { fetchRaises } from '~/containers/Raises/api'
import { fetchEmissionSupplyMetrics } from '~/containers/Unlocks/api'
import type { ProtocolEmissionSupplyMetricsMap } from '~/containers/Unlocks/api.types'
import { TVL_SETTINGS_KEYS_SET } from '~/contexts/LocalStorage'
import { getPercentChange, slug, tokenIconUrl } from '~/utils'
import { postRuntimeLogs } from '~/utils/async'
import type { IProtocolMetadata } from '~/utils/metadata/types'
import { AIRDROP_EXCLUDE } from './airdrop-exclude'
import { fetchChartData, fetchChainsWithExtraTvl, fetchForks, fetchProtocols } from './api'
import type { ChartResponse, ParentProtocolLite, ProtocolLite } from './api.types'
import type {
	ExtraTvlMetric,
	IExtraTvlByChainPageData,
	IExtraTvlProtocolRow,
	IProtocolsWithTokensByChainPageData,
	IRecentProtocol,
	IRecentProtocolsPageData,
	ITokenMetricProtocolRow,
	TokenMetricType
} from './types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildForkedList(forks: Record<string, string[]>): Record<string, boolean> {
	const forkedList: Record<string, boolean> = {}
	for (const list of Object.values(forks)) {
		for (const f of list) {
			forkedList[f] = true
		}
	}
	return forkedList
}

function extractExtraTvl(
	protocol: ProtocolLite
): Record<string, { tvl: number; tvlPrevDay: number; tvlPrevWeek: number; tvlPrevMonth: number }> {
	const extraTvl: Record<string, { tvl: number; tvlPrevDay: number; tvlPrevWeek: number; tvlPrevMonth: number }> = {}
	for (const sectionName in protocol.chainTvls) {
		if (TVL_SETTINGS_KEYS_SET.has(sectionName) || sectionName === 'excludeParent') {
			extraTvl[sectionName] = protocol.chainTvls[sectionName]
		}
	}
	return extraTvl
}

// ---------------------------------------------------------------------------
// Query 1: RecentProtocols / Airdrops
// ---------------------------------------------------------------------------

export async function getRecentProtocols(): Promise<IRecentProtocolsPageData> {
	const [{ protocols, chains }, forks] = await Promise.all([fetchProtocols(), fetchForks()])

	const recentProtocols: IRecentProtocol[] = []

	for (const protocol of protocols) {
		if (protocol.listedAt == null) continue

		recentProtocols.push({
			name: protocol.name,
			symbol: protocol.symbol ?? null,
			logo: protocol.logo,
			url: protocol.url,
			category: protocol.category,
			chains: protocol.chains ?? [],
			chainTvls: protocol.chainTvls,
			tvl: protocol.tvl,
			tvlPrevDay: protocol.tvlPrevDay,
			tvlPrevWeek: protocol.tvlPrevWeek,
			tvlPrevMonth: protocol.tvlPrevMonth,
			mcap: protocol.mcap ?? null,
			listedAt: protocol.listedAt,
			defillamaId: protocol.defillamaId,
			deprecated: protocol.deprecated,
			forkedFrom: protocol.forkedFrom,
			extraTvl: extractExtraTvl(protocol)
		})
	}

	recentProtocols.sort((a, b) => b.listedAt - a.listedAt)

	return {
		protocols: recentProtocols,
		chainList: chains,
		forkedList: buildForkedList(forks)
	}
}

async function getAirdropDirectoryData(): Promise<Array<{ name: string; page: string; title?: string }>> {
	const { fetchJson } = await import('~/utils/async')
	const airdrops: Record<string, { endTime?: number; isActive: boolean; page?: string; name?: string }> =
		await fetchJson('https://airdrops.llama.fi/config')

	const now = Date.now()
	const result: Array<{ name: string; page: string; title?: string }> = []
	for (const key in airdrops) {
		const i = airdrops[key]
		if (i.isActive === false || !i.page) continue
		if (!i.endTime || (i.endTime < 1e12 ? i.endTime * 1000 > now : i.endTime > now)) {
			result.push({ name: i.name ?? key, page: i.page })
		}
	}
	return result
}

export async function getAirdropsProtocols(): Promise<IRecentProtocolsPageData> {
	const [{ protocols, chains, parentProtocols }, forks, { raises }, claimableAirdrops] = await Promise.all([
		fetchProtocols(),
		fetchForks(),
		fetchRaises(),
		getAirdropDirectoryData()
	])

	const parents: Record<string, boolean> = {}
	for (const p of parentProtocols) {
		if (p.gecko_id) {
			parents[p.id] = true
		}
	}

	const raisesById = new Map<string, number>()
	for (const r of raises) {
		if (r.defillamaId) {
			const key = r.defillamaId.toString()
			const amount = r.amount ?? 0
			if (!Number.isNaN(amount)) {
				raisesById.set(key, (raisesById.get(key) ?? 0) + amount * 1e6)
			}
		}
	}

	const airdropsProtocols: IRecentProtocol[] = []

	for (const protocol of protocols) {
		if (protocol.symbol != null && protocol.symbol !== '-') continue
		if (AIRDROP_EXCLUDE.has(protocol.name)) continue
		if (protocol.parentProtocol != null && parents[protocol.parentProtocol]) continue

		airdropsProtocols.push({
			name: protocol.name,
			symbol: protocol.symbol ?? null,
			logo: protocol.logo,
			url: protocol.url,
			category: protocol.category,
			chains: protocol.chains ?? [],
			chainTvls: protocol.chainTvls,
			tvl: protocol.tvl,
			tvlPrevDay: protocol.tvlPrevDay,
			tvlPrevWeek: protocol.tvlPrevWeek,
			tvlPrevMonth: protocol.tvlPrevMonth,
			mcap: protocol.mcap ?? null,
			listedAt: protocol.listedAt ?? 1624728920,
			defillamaId: protocol.defillamaId,
			deprecated: protocol.deprecated,
			forkedFrom: protocol.forkedFrom,
			extraTvl: extractExtraTvl(protocol),
			totalRaised: raisesById.get(protocol.defillamaId) ?? 0
		})
	}

	airdropsProtocols.sort((a, b) => a.listedAt - b.listedAt)

	return {
		protocols: airdropsProtocols,
		chainList: chains,
		forkedList: buildForkedList(forks),
		claimableAirdrops
	}
}

// ---------------------------------------------------------------------------
// Query 2: ExtraTvl (total-borrowed, total-staked, pool2)
// ---------------------------------------------------------------------------

interface ExtraTvlMetricConfig {
	chartKey: keyof ChartResponse
	suffix: string
	label: string
	basePath: string
}

const EXTRA_TVL_CONFIG: Record<ExtraTvlMetric, ExtraTvlMetricConfig> = {
	borrowed: { chartKey: 'borrowed', suffix: '-borrowed', label: 'Total Borrowed', basePath: '/total-borrowed' },
	staking: { chartKey: 'staking', suffix: '-staking', label: 'Total Staked', basePath: '/total-staked' },
	pool2: { chartKey: 'pool2', suffix: '-pool2', label: 'Pool2 TVL', basePath: '/pool2' }
}

export async function getExtraTvlByChain({
	chain,
	metric,
	protocolMetadata
}: {
	chain: string
	metric: ExtraTvlMetric
	protocolMetadata: Record<string, IProtocolMetadata>
}): Promise<IExtraTvlByChainPageData | null> {
	const config = EXTRA_TVL_CONFIG[metric]

	const [{ protocols, parentProtocols }, chart, chainsList]: [
		{ protocols: ProtocolLite[]; parentProtocols: ParentProtocolLite[] },
		Array<[number, number]> | null,
		string[]
	] = await Promise.all([
		fetchProtocols(),
		fetchChartData(chain)
			.then((data) => data?.[config.chartKey]?.map((item) => [+item[0] * 1e3, item[1]]) ?? [])
			.catch((err) => {
				postRuntimeLogs(`${config.label} by Chain: ${chain}: ${err instanceof Error ? err.message : err}`)
				return null
			}),
		fetchChainsWithExtraTvl(config.chartKey)
	])

	if (!chart || chart.length === 0) return null

	const finalProtocols: IExtraTvlProtocolRow[] = []
	const parentChildren: Record<string, IExtraTvlProtocolRow[]> = {}

	for (const protocol of protocols) {
		let totalValue: number | null = null
		let totalPrevMonth: number | null = null

		for (const ctvl in protocol.chainTvls) {
			if (ctvl.includes(config.suffix) && (chain === 'All' ? true : ctvl.split('-')[0] === chain)) {
				totalValue = (totalValue ?? 0) + protocol.chainTvls[ctvl].tvl
				totalPrevMonth = (totalPrevMonth ?? 0) + protocol.chainTvls[ctvl].tvlPrevMonth
			}
		}

		if (totalValue == null) continue

		const p: IExtraTvlProtocolRow = {
			name: protocol.name,
			logo: tokenIconUrl(slug(protocol.name)),
			slug: slug(protocol.name),
			category: protocol.category,
			chains:
				(protocol.defillamaId ? protocolMetadata[protocol.defillamaId]?.chains : null) ?? protocol.chains ?? [],
			value: totalValue,
			change_1m:
				totalPrevMonth != null && totalValue != null
					? Number(getPercentChange(totalValue, totalPrevMonth)?.toFixed(2) ?? 0)
					: null
		}

		if (protocol.parentProtocol) {
			parentChildren[protocol.parentProtocol] = [...(parentChildren[protocol.parentProtocol] ?? []), p]
		} else {
			finalProtocols.push(p)
		}
	}

	for (const parentId in parentChildren) {
		const parent = parentProtocols.find((p) => p.id === parentId)
		if (!parent) continue

		const children = parentChildren[parentId]
		const totalValue = children.reduce((acc, curr) => acc + (curr.value ?? 0), 0)
		const totalPrevMonth = children.reduce((acc, curr) => acc + (curr.value ?? 0), 0)

		const categorySet = new Set<string>()
		for (const child of children) {
			if (child.category) categorySet.add(child.category)
		}
		const categories = Array.from(categorySet)

		finalProtocols.push({
			name: parent.name,
			logo: tokenIconUrl(slug(parent.name)),
			slug: slug(parent.name),
			category: categories.length > 1 ? null : (categories[0] ?? null),
			chains: Array.from(new Set(children.flatMap((p) => p.chains))),
			value: totalValue,
			change_1m:
				totalValue != null && totalPrevMonth != null
					? Number(getPercentChange(totalValue, totalPrevMonth)?.toFixed(2) ?? 0)
					: null,
			subRows: children
		})
	}

	return {
		protocols: finalProtocols.sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
		chain,
		chains: [
			{ label: 'All', to: config.basePath },
			...chainsList.map((c) => ({ label: c, to: `${config.basePath}/chain/${slug(c)}` }))
		],
		dataset: {
			source: chart.map(([timestamp, value]) => ({ timestamp, [config.label]: value })),
			dimensions: ['timestamp', config.label]
		},
		charts: [
			{
				type: 'line' as const,
				name: config.label,
				encode: { x: 'timestamp', y: config.label },
				color: CHART_COLORS[0],
				stack: config.label
			}
		],
		totalValue: chart[chart.length - 1][1],
		change24h:
			chart.length > 2 ? +getPercentChange(chart[chart.length - 1][1], chart[chart.length - 2][1]).toFixed(2) : null,
		metric
	}
}

// ---------------------------------------------------------------------------
// Query 3: Token metrics (mcaps, fdv, token-prices, outstanding-fdv)
// ---------------------------------------------------------------------------

const TOKEN_METRIC_EXCLUDE_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Foundation', 'Meme'])

function buildTokenMetricProtocols({
	protocols,
	parentProtocols,
	protocolMetadata,
	getValue,
	getParentValue
}: {
	protocols: ProtocolLite[]
	parentProtocols: ParentProtocolLite[]
	protocolMetadata: Record<string, IProtocolMetadata>
	getValue: (protocol: ProtocolLite) => number | null
	getParentValue: (parent: ParentProtocolLite) => number | null
}): { finalProtocols: ITokenMetricProtocolRow[]; categories: Set<string> } {
	const parentProtocolsMap = new Map(parentProtocols.map((p) => [p.id, p]))
	const finalProtocols: ITokenMetricProtocolRow[] = []
	const parentChildren: Record<string, ITokenMetricProtocolRow[]> = {}
	const categories = new Set<string>()

	for (const protocol of protocols) {
		if (TOKEN_METRIC_EXCLUDE_CATEGORIES.has(protocol.category ?? '')) continue

		if (protocol.category) {
			categories.add(protocol.category)
		}

		const p: ITokenMetricProtocolRow = {
			name: protocol.name,
			logo: tokenIconUrl(slug(protocol.name)),
			slug: slug(protocol.name),
			category: protocol.category,
			chains:
				(protocol.defillamaId ? protocolMetadata[protocol.defillamaId]?.chains : null) ?? protocol.chains ?? [],
			value: getValue(protocol)
		}

		if (protocol.parentProtocol) {
			parentChildren[protocol.parentProtocol] = [...(parentChildren[protocol.parentProtocol] ?? []), p]
		} else {
			finalProtocols.push(p)
		}
	}

	for (const parentId in parentChildren) {
		const parent = parentProtocolsMap.get(parentId)
		if (!parent) continue

		const children = parentChildren[parentId]
		const categorySet = new Set<string>()
		for (const child of children) {
			if (child.category) categorySet.add(child.category)
		}
		const cats = Array.from(categorySet)

		finalProtocols.push({
			name: parent.name,
			logo: tokenIconUrl(slug(parent.name)),
			slug: slug(parent.name),
			category: cats.length > 1 ? null : (cats[0] ?? null),
			chains: Array.from(new Set(children.flatMap((p) => p.chains))),
			subRows: children,
			value: getParentValue(parent)
		})
	}

	return { finalProtocols, categories }
}

function filterAndSort(
	protocols: ITokenMetricProtocolRow[],
	chain: string
): ITokenMetricProtocolRow[] {
	return protocols
		.filter((p) => p.value != null && (chain === 'All' || p.chains.includes(chain)))
		.sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
}

function buildChainLinks(chains: string[], basePath: string): Array<{ label: string; to: string }> {
	return [
		{ label: 'All', to: basePath },
		...chains.map((c) => ({ label: c, to: `${basePath}/chain/${slug(c)}` }))
	]
}

export async function getProtocolsMarketCapsByChain({
	chain,
	protocolMetadata
}: {
	chain: string
	protocolMetadata: Record<string, IProtocolMetadata>
}): Promise<IProtocolsWithTokensByChainPageData | null> {
	const { protocols, chains, parentProtocols } = await fetchProtocols()

	const { finalProtocols, categories } = buildTokenMetricProtocols({
		protocols,
		parentProtocols,
		protocolMetadata,
		getValue: (p) => p.mcap ?? null,
		getParentValue: (p) => p.mcap ?? null
	})

	return {
		protocols: filterAndSort(finalProtocols, chain),
		chain,
		chains: buildChainLinks(chains, '/mcaps'),
		categories: Array.from(categories),
		type: 'mcap' as TokenMetricType
	}
}

export async function getProtocolsFDVsByChain({
	chain,
	protocolMetadata
}: {
	chain: string
	protocolMetadata: Record<string, IProtocolMetadata>
}): Promise<IProtocolsWithTokensByChainPageData | null> {
	const [{ protocols, chains, parentProtocols }, tokenList]: [
		{ protocols: ProtocolLite[]; chains: string[]; parentProtocols: ParentProtocolLite[] },
		IResponseCGMarketsAPI[]
	] = await Promise.all([fetchProtocols(), getAllCGTokensList()])

	const tokenListMap = new Map(tokenList.map((t) => [t.id, t]))

	const { finalProtocols, categories } = buildTokenMetricProtocols({
		protocols,
		parentProtocols,
		protocolMetadata,
		getValue: (p) => (p.geckoId ? (tokenListMap.get(p.geckoId)?.['fully_diluted_valuation'] ?? null) : null),
		getParentValue: (parent) =>
			parent.gecko_id ? (tokenListMap.get(parent.gecko_id)?.['fully_diluted_valuation'] ?? null) : null
	})

	return {
		protocols: filterAndSort(finalProtocols, chain),
		chain,
		chains: buildChainLinks(chains, '/fdv'),
		categories: Array.from(categories),
		type: 'fdv' as TokenMetricType
	}
}

export async function getProtocolsTokenPricesByChain({
	chain,
	protocolMetadata
}: {
	chain: string
	protocolMetadata: Record<string, IProtocolMetadata>
}): Promise<IProtocolsWithTokensByChainPageData | null> {
	const { protocols, chains, parentProtocols } = await fetchProtocols()

	const geckoIds = new Set<string>()
	for (const protocol of protocols) {
		if (protocol.geckoId) geckoIds.add(`coingecko:${protocol.geckoId}`)
	}
	for (const parent of parentProtocols) {
		if (parent.gecko_id) geckoIds.add(`coingecko:${parent.gecko_id}`)
	}

	const prices = await fetchCoinPrices(Array.from(geckoIds))

	const { finalProtocols, categories } = buildTokenMetricProtocols({
		protocols,
		parentProtocols,
		protocolMetadata,
		getValue: (p) => (p.geckoId ? (prices[`coingecko:${p.geckoId}`]?.price ?? null) : null),
		getParentValue: (parent) => (parent.gecko_id ? (prices[`coingecko:${parent.gecko_id}`]?.price ?? null) : null)
	})

	return {
		protocols: filterAndSort(finalProtocols, chain),
		chain,
		chains: buildChainLinks(chains, '/token-prices'),
		categories: Array.from(categories),
		type: 'price' as TokenMetricType
	}
}

export async function getProtocolsAdjustedFDVsByChain({
	chain,
	protocolMetadata
}: {
	chain: string
	protocolMetadata: Record<string, IProtocolMetadata>
}): Promise<IProtocolsWithTokensByChainPageData | null> {
	const [{ protocols, chains, parentProtocols }, emissionsSupplyMetrics]: [
		{ protocols: ProtocolLite[]; chains: string[]; parentProtocols: ParentProtocolLite[] },
		ProtocolEmissionSupplyMetricsMap
	] = await Promise.all([fetchProtocols(), fetchEmissionSupplyMetrics()])

	const emissionGeckoIds: Record<string, string> = {}
	for (const protocol of protocols) {
		if (emissionsSupplyMetrics[slug(protocol.name)] && protocol.geckoId) {
			emissionGeckoIds[protocol.name] = `coingecko:${protocol.geckoId}`
		}
	}
	for (const parent of parentProtocols) {
		if (emissionsSupplyMetrics[slug(parent.name)] && parent.gecko_id) {
			emissionGeckoIds[parent.name] = `coingecko:${parent.gecko_id}`
		}
	}

	const prices = await fetchCoinPrices(Object.values(emissionGeckoIds))

	const chainsWithEmissions = new Set<string>()
	for (const protocol of protocols) {
		if (emissionsSupplyMetrics[slug(protocol.name)]) {
			for (const c of protocol.chains) {
				chainsWithEmissions.add(c)
			}
		}
	}

	const getAdjustedFdv = (geckoId: string | undefined, name: string): number | null => {
		if (!geckoId) return null
		const slugName = slug(name)
		const adjustedSupply = emissionsSupplyMetrics[slugName]?.supplyMetrics?.adjustedSupply
		const price = prices[`coingecko:${geckoId}`]?.price
		if (adjustedSupply && price) return price * adjustedSupply
		return null
	}

	const { finalProtocols, categories } = buildTokenMetricProtocols({
		protocols,
		parentProtocols,
		protocolMetadata,
		getValue: (p) => getAdjustedFdv(p.geckoId, p.name),
		getParentValue: (parent) => getAdjustedFdv(parent.gecko_id, parent.name)
	})

	return {
		protocols: filterAndSort(finalProtocols, chain),
		chain,
		chains: [
			{ label: 'All', to: '/outstanding-fdv' },
			...chains.filter((c) => chainsWithEmissions.has(c)).map((c) => ({ label: c, to: `/outstanding-fdv/chain/${slug(c)}` }))
		],
		categories: Array.from(categories),
		type: 'outstanding-fdv' as TokenMetricType
	}
}
