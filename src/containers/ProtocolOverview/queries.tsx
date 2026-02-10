import {
	ACTIVE_USERS_API,
	BRIDGEVOLUME_API_SLUG,
	CEXS_API,
	HACKS_API,
	LIQUIDITY_API,
	ORACLE_API,
	oracleProtocols,
	PROTOCOL_EMISSION_API2,
	PROTOCOL_GOVERNANCE_COMPOUND_API,
	PROTOCOL_GOVERNANCE_SNAPSHOT_API,
	PROTOCOL_GOVERNANCE_TALLY_API,
	PROTOCOLS_API,
	PROTOCOLS_EXPENSES_API,
	PROTOCOLS_TREASURY,
	V2_SERVER_URL,
	YIELD_CONFIG_API,
	YIELD_POOLS_API
} from '~/constants'
import { chainCoingeckoIdsForGasNotMcap } from '~/constants/chainTokens'
import { CHART_COLORS } from '~/constants/colors'
import { TVL_SETTINGS_KEYS_SET } from '~/contexts/LocalStorage'
import { definitions } from '~/public/definitions'
import { capitalizeFirstLetter, getProtocolTokenUrlOnExplorer, slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { IChainMetadata, IProtocolMetadata } from '~/utils/metadata/types'
import { getAdapterProtocolSummary, IAdapterSummary } from '../DimensionAdapters/queries'
import { IHack } from '../Hacks/queries'
import { protocolCategories } from '../ProtocolsByCategoryOrTag/constants'
import { fetchProtocolOverviewMetrics, fetchProtocolTvlChart } from './api'
import { IProtocolMetricsV2 } from './api.types'
import { protocolCharts, ProtocolChartsLabels } from './constants'
import {
	IArticle,
	IArticlesResponse,
	IProtocolExpenses,
	IProtocolOverviewPageData,
	IProtocolPageMetrics
} from './types'
import { getProtocolWarningBanners } from './utils'

const isProtocolChartsLabel = (value: string): value is ProtocolChartsLabels => value in protocolCharts

export const getProtocolMetricFlags = ({
	protocolData,
	metadata
}: {
	protocolData: IProtocolMetricsV2
	metadata: IProtocolMetadata
}): IProtocolPageMetrics => {
	return {
		tvl: !!metadata.tvl,
		dexs: !!metadata.dexs,
		perps: !!metadata.perps,
		openInterest: !!metadata.openInterest,
		optionsPremiumVolume: !!metadata.optionsPremiumVolume,
		optionsNotionalVolume: !!metadata.optionsNotionalVolume,
		dexAggregators: !!metadata.dexAggregators,
		perpsAggregators: !!metadata.perpsAggregators,
		bridgeAggregators: !!metadata.bridgeAggregators,
		stablecoins: !!metadata.stablecoins,
		bridge: !!metadata.bridge,
		treasury: !!metadata.treasury,
		unlocks: !!metadata.emissions,
		incentives: !!metadata.incentives,
		yields: !!metadata.yields,
		fees: !!metadata.fees,
		revenue: !!metadata.revenue,
		bribes: !!metadata.bribeRevenue,
		tokenTax: !!metadata.tokenTax,
		forks: !!metadata.forks,
		governance: !!metadata.governance,
		nfts: !!metadata.nfts,
		dev: !!protocolData.github,
		inflows: !!metadata.inflows,
		liquidity: !!metadata.liquidity,
		activeUsers: !!metadata.activeUsers,
		borrowed: !!metadata.borrowed,
		tokenRights: !!metadata.tokenRights
	}
}

export const getProtocolOverviewPageData = async ({
	protocolId,
	currentProtocolMetadata,
	isCEX = false,
	chainMetadata
}: {
	protocolId: string
	currentProtocolMetadata: IProtocolMetadata
	isCEX?: boolean
	chainMetadata: Record<string, IChainMetadata>
}): Promise<IProtocolOverviewPageData> => {
	const [
		protocolData,
		protocolTvlChartData,
		feesData,
		revenueData,
		holdersRevenueData,
		bribesData,
		tokenTaxData,
		dexVolumeData,
		dexAggregatorVolumeData,
		perpVolumeData,
		openInterestData,
		perpAggregatorVolumeData,
		bridgeAggregatorVolumeData,
		optionsPremiumVolumeData,
		optionsNotionalVolumeData,
		treasury,
		yieldsData,
		articles,
		incentives,
		adjustedSupply,
		users,
		expenses,
		yieldsConfig,
		liquidityInfo,
		liteProtocolsData,
		hacksData,
		bridgeVolumeData,
		incomeStatement,
		oracleTvs
	]: [
		IProtocolMetricsV2 & {
			tokenCGData?: {
				price: {
					current: number | null
					ath: number | null
					athDate: number | null
					atl: number | null
					atlDate: number | null
				}
				marketCap: { current: number | null }
				totalSupply: number | null
				fdv: { current: number | null }
				volume24h: {
					total: number | null
					cex: number | null
					dex: number | null
				}
				symbol: string | null
			} | null
		} & {
			devMetrics?: {
				weeklyCommits: number | null
				monthlyCommits: number | null
				weeklyDevelopers: number | null
				monthlyDevelopers: number | null
				lastCommit: number | null
				updatedAt: number | null
			}
		},
		Array<[string, number]>,
		IProtocolOverviewPageData['fees'],
		IProtocolOverviewPageData['revenue'],
		IProtocolOverviewPageData['holdersRevenue'],
		IProtocolOverviewPageData['bribeRevenue'],
		IProtocolOverviewPageData['tokenTax'],
		IProtocolOverviewPageData['dexVolume'],
		IProtocolOverviewPageData['dexAggregatorVolume'],
		IProtocolOverviewPageData['perpVolume'],
		IProtocolOverviewPageData['openInterest'],
		IProtocolOverviewPageData['perpAggregatorVolume'],
		IProtocolOverviewPageData['bridgeAggregatorVolume'],
		IProtocolOverviewPageData['optionsPremiumVolume'],
		IProtocolOverviewPageData['optionsNotionalVolume'],
		IProtocolOverviewPageData['treasury'] | null,
		{ data?: Array<{ project: string; apy: number }> } | null,
		IArticle[],
		IProtocolOverviewPageData['incentives'],
		number | null,
		{
			activeUsers: number | null
			newUsers: number | null
			transactions: number | null
			gasUsd: number | null
		} | null,
		IProtocolExpenses | null,
		{ protocols?: Record<string, { name?: string }> } | null,
		Array<{ id: string; tokenPools?: Array<{ project: string; chain: string; tvlUsd: number }> }>,
		{ protocols: Array<{ category?: string; name: string; chains: Array<string>; tvl: number }> },
		Array<IHack>,
		Array<{ date: string; depositUSD: number; withdrawUSD: number }> | null,
		IProtocolOverviewPageData['incomeStatement'],
		Record<string, number> | null
	] = await Promise.all([
		fetchProtocolOverviewMetrics(slug(currentProtocolMetadata.displayName)).then(async (data) => {
			try {
				const [tokenCGData, cg_volume_cexs]: [unknown, string[]] = data.gecko_id
					? await Promise.all([
							fetchJson(`https://fe-cache.llama.fi/cgchart/${data.gecko_id}?fullChart=true`)
								.then(({ data }) => data)
								.catch(() => null),
							fetchJson(CEXS_API)
								.then((data) => data.cg_volume_cexs)
								.catch(() => [])
						])
					: [null, []]
				return { ...data, tokenCGData: tokenCGData ? getTokenCGData(tokenCGData, cg_volume_cexs) : null }
			} catch (e) {
				console.log(e)
				return data
			}
		}),
		currentProtocolMetadata.tvl
			? fetchProtocolTvlChart({ protocol: slug(currentProtocolMetadata.displayName) })
					.then((chart) => chart?.map(([date, value]) => [String(Math.floor(date / 1e3)), value]) ?? [])
					.catch(() => [])
			: Promise.resolve([]),
		currentProtocolMetadata.fees
			? getAdapterProtocolSummary({
					adapterType: 'fees',
					protocol: currentProtocolMetadata.displayName,
					excludeTotalDataChart: true
				})
					.then((data) => formatAdapterData({ data, methodologyKey: 'Fees' }))
					.catch(() => null)
			: Promise.resolve(null),
		currentProtocolMetadata.revenue
			? getAdapterProtocolSummary({
					adapterType: 'fees',
					dataType: 'dailyRevenue',
					protocol: currentProtocolMetadata.displayName,
					excludeTotalDataChart: true
				})
					.then((data) => formatAdapterData({ data, methodologyKey: 'Revenue' }))
					.catch(() => null)
			: Promise.resolve(null),
		currentProtocolMetadata.holdersRevenue
			? getAdapterProtocolSummary({
					adapterType: 'fees',
					dataType: 'dailyHoldersRevenue',
					protocol: currentProtocolMetadata.displayName,
					excludeTotalDataChart: true
				})
					.then((data) => formatAdapterData({ data, methodologyKey: 'HoldersRevenue' }))
					.catch(() => null)
			: Promise.resolve(null),
		currentProtocolMetadata.bribeRevenue
			? getAdapterProtocolSummary({
					adapterType: 'fees',
					dataType: 'dailyBribesRevenue',
					protocol: currentProtocolMetadata.displayName,
					excludeTotalDataChart: true
				})
					.then((data) => formatAdapterData({ data, methodologyKey: 'BribesRevenue' }))
					.catch(() => null)
			: Promise.resolve(null),
		currentProtocolMetadata.tokenTax
			? getAdapterProtocolSummary({
					adapterType: 'fees',
					dataType: 'dailyTokenTaxes',
					protocol: currentProtocolMetadata.displayName,
					excludeTotalDataChart: true
				})
					.then((data) => formatAdapterData({ data, methodologyKey: 'TokenTaxes' }))
					.catch(() => null)
			: Promise.resolve(null),
		currentProtocolMetadata.dexs
			? getAdapterProtocolSummary({
					adapterType: 'dexs',
					protocol: currentProtocolMetadata.displayName,
					excludeTotalDataChart: true
				})
					.then((data) => formatAdapterData({ data, methodologyKey: 'dexs' }))
					.catch(() => null)
			: Promise.resolve(null),
		currentProtocolMetadata.dexAggregators
			? getAdapterProtocolSummary({
					adapterType: 'aggregators',
					protocol: currentProtocolMetadata.displayName,
					excludeTotalDataChart: true
				})
					.then((data) => formatAdapterData({ data, methodologyKey: 'dexAggregators' }))
					.catch(() => null)
			: Promise.resolve(null),
		currentProtocolMetadata.perps
			? getAdapterProtocolSummary({
					adapterType: 'derivatives',
					protocol: currentProtocolMetadata.displayName,
					excludeTotalDataChart: true
				})
					.then((data) => formatAdapterData({ data, methodologyKey: 'perps' }))
					.catch(() => null)
			: Promise.resolve(null),
		currentProtocolMetadata.openInterest
			? getAdapterProtocolSummary({
					adapterType: 'open-interest',
					protocol: currentProtocolMetadata.displayName,
					excludeTotalDataChart: true,
					dataType: 'openInterestAtEnd'
				})
					.then((data) => formatAdapterData({ data, methodologyKey: 'openInterest' }))
					.catch(() => null)
			: Promise.resolve(null),
		currentProtocolMetadata.perpsAggregators
			? getAdapterProtocolSummary({
					adapterType: 'aggregator-derivatives',
					protocol: currentProtocolMetadata.displayName,
					excludeTotalDataChart: true
				})
					.then((data) => formatAdapterData({ data, methodologyKey: 'perpsAggregators' }))
					.catch(() => null)
			: Promise.resolve(null),
		currentProtocolMetadata.bridgeAggregators
			? getAdapterProtocolSummary({
					adapterType: 'bridge-aggregators',
					protocol: currentProtocolMetadata.displayName,
					excludeTotalDataChart: true
				})
					.then((data) => formatAdapterData({ data, methodologyKey: 'bridgeAggregators' }))
					.catch(() => null)
			: Promise.resolve(null),
		currentProtocolMetadata.optionsPremiumVolume
			? getAdapterProtocolSummary({
					adapterType: 'options',
					dataType: 'dailyPremiumVolume',
					protocol: currentProtocolMetadata.displayName,
					excludeTotalDataChart: true
				})
					.then((data) => formatAdapterData({ data, methodologyKey: 'optionsPremiumVolume' }))
					.catch(() => null)
			: Promise.resolve(null),
		currentProtocolMetadata.optionsNotionalVolume
			? getAdapterProtocolSummary({
					adapterType: 'options',
					dataType: 'dailyNotionalVolume',
					protocol: currentProtocolMetadata.displayName,
					excludeTotalDataChart: true
				})
					.then((data) => formatAdapterData({ data, methodologyKey: 'optionsNotionalVolume' }))
					.catch(() => null)
			: Promise.resolve(null),
		currentProtocolMetadata.treasury
			? fetchJson(PROTOCOLS_TREASURY)
					.then((res) => res.find((item) => item.id === `${protocolId}-treasury`)?.tokenBreakdowns ?? null)
					.then((res) => {
						return res
							? {
									majors: res.majors ?? null,
									stablecoins: res.stablecoins ?? null,
									ownTokens: res.ownTokens ?? null,
									others: res.others ?? null,
									total: Object.values(res).reduce((acc: number, curr: number | null) => acc + +(curr ?? 0), 0) ?? null
								}
							: null
					})
					.catch(() => null)
			: Promise.resolve(null),
		currentProtocolMetadata.yields
			? fetchJson(YIELD_POOLS_API).catch((err) => {
					console.log(
						'[HTTP]:[ERROR]:[PROTOCOL_YIELD]:',
						slug(currentProtocolMetadata.displayName),
						err instanceof Error ? err.message : ''
					)
					return {}
				})
			: null,
		fetchArticles({ tags: slug(currentProtocolMetadata.displayName) }).catch((err) => {
			console.log(
				'[HTTP]:[ERROR]:[PROTOCOL_ARTICLE]:',
				slug(currentProtocolMetadata.displayName),
				err instanceof Error ? err.message : ''
			)
			return []
		}),
		currentProtocolMetadata?.incentives && protocolId
			? fetchJson(`https://api.llama.fi/emissionsBreakdownAggregated`)
					.then((data) => {
						const protocolEmissionsData = data.protocols.find((item) =>
							protocolId.startsWith('parent#')
								? item.name === currentProtocolMetadata.displayName
								: item.defillamaId === protocolId
						)

						if (!protocolEmissionsData) return null

						return {
							emissions24h: protocolEmissionsData.emission24h,
							emissions7d: protocolEmissionsData.emission7d,
							emissions30d: protocolEmissionsData.emission30d,
							emissionsAllTime: protocolEmissionsData.emissionsAllTime,
							emissionsMonthlyAverage1y: protocolEmissionsData.emissionsMonthlyAverage1y,
							methodology:
								'Tokens allocated to users through liquidity mining or incentive schemes, typically as part of governance or reward mechanisms.'
						}
					})
					.catch(() => null)
			: null,
		currentProtocolMetadata?.emissions && protocolId
			? fetchJson(`${PROTOCOL_EMISSION_API2}/${slug(currentProtocolMetadata.displayName)}`)
					.then((data) => data?.supplyMetrics?.adjustedSupply ?? null)
					.catch(() => null)
			: null,
		currentProtocolMetadata.activeUsers && protocolId
			? fetchJson(ACTIVE_USERS_API, { timeout: 10_000 })
					.then((data) => data?.[protocolId] ?? null)
					.then((data) => {
						return data?.users?.value || data?.newUsers?.value || data?.txs?.value || data?.gasUsd?.value
							? {
									activeUsers: data.users?.value ?? null,
									newUsers: data.newUsers?.value ?? null,
									transactions: data.txs?.value ?? null,
									gasUsd: data.gasUsd?.value ?? null
								}
							: null
					})
					.catch(() => null)
			: null,
		currentProtocolMetadata.expenses && protocolId
			? fetchJson(PROTOCOLS_EXPENSES_API)
					.then((data) => data.find((item) => item.protocolId === protocolId))
					.catch(() => {
						return null
					})
			: null,
		currentProtocolMetadata.liquidity
			? fetchJson(YIELD_CONFIG_API).catch(() => {
					return null
				})
			: null,
		currentProtocolMetadata?.liquidity
			? fetchJson(LIQUIDITY_API).catch(() => {
					return []
				})
			: [],
		fetchJson(PROTOCOLS_API).catch(() => ({ protocols: [] })),
		fetchJson(HACKS_API).catch(() => ({ hacks: [] })),
		currentProtocolMetadata.bridge
			? fetchJson(`${BRIDGEVOLUME_API_SLUG}/${slug(currentProtocolMetadata.displayName)}`)
					.then((data) => data.dailyVolumes || null)
					.catch(() => null)
			: null,
		getProtocolIncomeStatement({ metadata: currentProtocolMetadata }),
		oracleProtocols[currentProtocolMetadata.displayName]
			? fetchJson(ORACLE_API).then((data) => {
					const oracleName = oracleProtocols[currentProtocolMetadata.displayName]
					let tvs = {}
					for (const date in data.chainChart) {
						tvs = data.chainChart[date]?.[oracleName] ?? {}
					}
					let hasTvs = false
					for (const _ in tvs) {
						hasTvs = true
						break
					}
					if (!hasTvs) return null
					return tvs
				})
			: null
	])

	if (!protocolData) {
		throw new Error(`Unable to fetch protocol data for ${currentProtocolMetadata.displayName}`)
	}

	const otherProtocols = protocolData.otherProtocols?.map((p) => slug(p)) ?? []
	const projectYields = yieldsData?.data?.filter(
		({ project }) =>
			[slug(currentProtocolMetadata.displayName), currentProtocolMetadata.displayName].includes(project) ||
			(protocolData?.parentProtocol ? false : otherProtocols.includes(project))
	)
	const yields =
		yieldsData && yieldsData.data && projectYields.length > 0
			? {
					noOfPoolsTracked: projectYields.length,
					averageAPY: projectYields.reduce((acc, { apy }) => acc + apy, 0) / projectYields.length
				}
			: null

	const tokenPools =
		yieldsData?.data && yieldsConfig ? (liquidityInfo?.find((p) => p.id === protocolData.id)?.tokenPools ?? []) : []

	const liquidityAggregated = tokenPools.reduce(
		(agg, pool) => {
			if (!agg[pool.project]) agg[pool.project] = {}
			agg[pool.project][pool.chain] = pool.tvlUsd + (agg[pool.project][pool.chain] ?? 0)
			return agg
		},
		{} as Record<string, Record<string, number>>
	)

	const tokenLiquidity = yieldsConfig
		? Object.entries(liquidityAggregated)
				.filter((x) => !!yieldsConfig.protocols[x[0]]?.name)
				.map((p) =>
					Object.entries(p[1]).map((c): [string, string, number] => [
						yieldsConfig.protocols[p[0]].name ?? '',
						c[0],
						Number(c[1])
					])
				)
				.flat()
				.sort((a, b) => b[2] - a[2])
		: ([] as Array<[string, string, number]>)

	const raises =
		protocolData.raises
			?.sort((a, b) => a.date - b.date)
			?.map((r) => ({
				...r,
				investors: (r.leadInvestors ?? []).concat(r.otherInvestors ?? [])
			})) ?? null

	const hasKeyMetrics = !!(
		protocolData.currentChainTvls?.staking != null ||
		protocolData.currentChainTvls?.borrowed != null ||
		raises?.length ||
		expenses ||
		tokenLiquidity?.length ||
		feesData?.totalAllTime ||
		revenueData?.totalAllTime ||
		holdersRevenueData?.totalAllTime ||
		dexVolumeData?.totalAllTime ||
		perpVolumeData?.totalAllTime ||
		dexAggregatorVolumeData?.totalAllTime ||
		perpAggregatorVolumeData?.totalAllTime ||
		bridgeAggregatorVolumeData?.totalAllTime ||
		optionsPremiumVolumeData?.totalAllTime ||
		optionsNotionalVolumeData?.totalAllTime ||
		bribesData?.totalAllTime ||
		tokenTaxData?.totalAllTime ||
		protocolData.tokenCGData
	)

	const protocolChainsSet = new Set(protocolData.chains ?? [])

	const competitors =
		liteProtocolsData && protocolData.category
			? liteProtocolsData.protocols
					.filter((p) => {
						if (p.category) {
							return (
								p.category.toLowerCase() === protocolData.category.toLowerCase() &&
								p.name.toLowerCase() !== protocolData.name?.toLowerCase() &&
								p.chains.some((c) => protocolChainsSet.has(c))
							)
						} else return false
					})
					.map((p) => {
						let commonChains = 0

						for (const chain of protocolData?.chains ?? []) {
							if (p.chains.includes(chain)) {
								commonChains += 1
							}
						}

						return { name: p.name, tvl: p.tvl, commonChains }
					})
					.sort((a, b) => b.tvl - a.tvl)
			: []

	const competitorsSet = new Set<string>()
	const competitorsMap = new Map(competitors.map((p) => [p.name, p]))

	const protocolsWithCommonChains = [...competitors].sort((a, b) => b.commonChains - a.commonChains).slice(0, 5)

	// first 5 are the protocols that are on same chain + same category
	for (const p of protocolsWithCommonChains) {
		competitorsSet.add(p.name)
	}

	// last 5 are the protocols in same category
	for (const p of competitors) {
		if (competitorsSet.size < 10) {
			competitorsSet.add(p.name)
		}
	}

	const competitorsList = Array.from(competitorsSet)
		.map((protocolName) => competitorsMap.get(protocolName))
		.filter((competitor): competitor is (typeof competitors)[number] => Boolean(competitor))
		.map(({ name, tvl }) => ({ name, tvl }))

	const hacks =
		(protocolData.id
			? hacksData
					?.filter((hack) =>
						isCEX
							? [hack.name].includes(currentProtocolMetadata.displayName)
							: [String(hack.defillamaId), String(hack.parentProtocolId)].includes(String(protocolId))
					)
					?.sort((a, b) => a.date - b.date)
			: null) ?? null

	const protocolMetrics = getProtocolMetricFlags({
		protocolData,
		metadata: currentProtocolMetadata
	})

	const chains = []
	for (const chain in protocolData.currentChainTvls ?? {}) {
		if (chain.includes('-') || chain === 'offers') continue
		if (TVL_SETTINGS_KEYS_SET.has(chain)) continue
		if (protocolData.currentChainTvls[chain] != null) {
			chains.push([chain, protocolData.currentChainTvls[chain]])
		}
	}
	const firstChain = chains.sort((a, b) => b[1] - a[1])?.[0]?.[0] ?? null
	const chartDenominations: Array<{ symbol: string; geckoId?: string | null }> = []
	if (firstChain && !isCEX) {
		chartDenominations.push({ symbol: 'USD', geckoId: null })

		const cmetadata = chainMetadata?.[slug(firstChain)]
		if (cmetadata && chainCoingeckoIdsForGasNotMcap[cmetadata.name]) {
			chartDenominations.push({
				symbol: chainCoingeckoIdsForGasNotMcap[cmetadata.name].symbol,
				geckoId: chainCoingeckoIdsForGasNotMcap[cmetadata.name].geckoId
			})
		} else if (cmetadata?.gecko_id) {
			chartDenominations.push({ symbol: cmetadata.tokenSymbol, geckoId: cmetadata.gecko_id })
		} else {
			chartDenominations.push({ symbol: 'ETH', geckoId: chainMetadata?.['ethereum']?.gecko_id })
		}
	}

	const availableCharts: ProtocolChartsLabels[] = []

	if (currentProtocolMetadata.tvl && protocolTvlChartData.length > 0) {
		availableCharts.push(isCEX ? 'Total Assets' : 'TVL')
	}

	if (oracleTvs) {
		// availableCharts.push('TVS')
	}

	if (protocolData.gecko_id) {
		availableCharts.push('Mcap')
		availableCharts.push('Token Price')
		availableCharts.push('Token Volume')
		if (currentProtocolMetadata.liquidity) {
			availableCharts.push('Token Liquidity')
		}
		availableCharts.push('FDV')
	}

	if (feesData) {
		availableCharts.push('Fees')
	}

	if (revenueData) {
		availableCharts.push('Revenue')
	}

	if (holdersRevenueData) {
		availableCharts.push('Holders Revenue')
	}

	if (dexVolumeData) {
		availableCharts.push('DEX Volume')
	}

	if (perpVolumeData) {
		availableCharts.push('Perp Volume')
	}

	if (openInterestData) {
		availableCharts.push('Open Interest')
	}

	if (optionsPremiumVolumeData) {
		availableCharts.push('Options Premium Volume')
	}

	if (optionsNotionalVolumeData) {
		availableCharts.push('Options Notional Volume')
	}

	if (dexAggregatorVolumeData) {
		availableCharts.push('DEX Aggregator Volume')
	}

	if (perpAggregatorVolumeData) {
		availableCharts.push('Perp Aggregator Volume')
	}

	if (bridgeAggregatorVolumeData) {
		availableCharts.push('Bridge Aggregator Volume')
	}

	if (bridgeVolumeData) {
		availableCharts.push('Bridge Volume')
	}

	if (currentProtocolMetadata.emissions) {
		availableCharts.push('Unlocks')
	}

	if (incentives) {
		availableCharts.push('Incentives')
	}

	if (protocolData.currentChainTvls?.staking != null) {
		availableCharts.push('Staking')
	}

	if (protocolData.currentChainTvls?.borrowed != null) {
		availableCharts.push('Borrowed')
	}

	if (protocolMetrics.inflows) {
		availableCharts.push('USD Inflows')
	}

	if (treasury) {
		availableCharts.push('Treasury')
	}

	if (yields && !protocolData.isParentProtocol) {
		availableCharts.push('Median APY')
	}

	if (protocolData.governanceID) {
		availableCharts.push('Total Proposals')
		availableCharts.push('Successful Proposals')
		availableCharts.push('Max Votes')
	}

	if (currentProtocolMetadata.nfts) {
		availableCharts.push('NFT Volume')
	}

	const chartColors = {}
	for (let i = 0; i < availableCharts.length; i++) {
		const chart = availableCharts[i]
		chartColors[chart] = CHART_COLORS[i]
	}

	const hallmarks = {}
	const rangeHallmarks = []
	for (const hack of hacks ?? []) {
		hallmarks[hack.date] = `Hack: ${hack.classification ?? ''}`
	}
	for (const mark of protocolData.hallmarks ?? []) {
		if (Array.isArray(mark[0])) {
			rangeHallmarks.push(mark)
		} else {
			if (!hallmarks[mark[0]]) {
				hallmarks[mark[0]] = mark[1]
			}
		}
	}

	const name = protocolData.name ?? currentProtocolMetadata.displayName ?? ''
	let seoDescription = `Track ${name} metrics on DefiLlama. Including ${availableCharts.filter((chart) => !['Successful Proposals', 'Total Proposals', 'Max Votes'].includes(chart)).join(', ')}`
	let seoKeywords = `${availableCharts.map((chart) => `${name.toLowerCase()} ${chart.toLowerCase()}`).join(', ')}`
	if (expenses) {
		seoDescription += `, Expenses`
		seoKeywords += `, ${name.toLowerCase()} expenses`
	}
	if (revenueData && incentives) {
		seoDescription += `, Earnings`
		seoKeywords += `, ${name.toLowerCase()} earnings`
	}
	if (incomeStatement) {
		seoDescription += `, Income Statement`
		seoKeywords += `, ${name.toLowerCase()} income statement, ${name.toLowerCase()} financial statement`
	}
	seoDescription += ' and their methodologies'
	seoKeywords += `, ${name.toLowerCase()} methodologies`

	const defaultToggledCharts: ProtocolChartsLabels[] = []
	if (protocolMetrics.tvl) {
		if (protocolTvlChartData.length === 0 || protocolTvlChartData.every(([, value]) => value === 0)) {
			const hasStaking = (protocolData.currentChainTvls?.staking ?? 0) > 0
			if (hasStaking) {
				defaultToggledCharts.push('Staking')
			}

			const hasBorrowed = (protocolData.currentChainTvls?.borrowed ?? 0) > 0
			if (!hasStaking && hasBorrowed) {
				defaultToggledCharts.push('Borrowed')
			}
		} else {
			defaultToggledCharts.push(isCEX ? 'Total Assets' : 'TVL')
		}
	}

	const categoryDefaultChart = protocolData.category ? protocolCategories[protocolData.category]?.defaultChart : null
	const isCategoryDefaultChartValue =
		typeof categoryDefaultChart === 'string' &&
		(Object.values(protocolCharts) as Array<string>).includes(categoryDefaultChart)
	if (
		categoryDefaultChart &&
		isCategoryDefaultChartValue &&
		availableCharts.some((chartLabel) => protocolCharts[chartLabel] === categoryDefaultChart)
	) {
		let defaultChartLabel = null
		for (const chartLabel in protocolCharts) {
			if (protocolCharts[chartLabel] === categoryDefaultChart) {
				defaultChartLabel = chartLabel
				break
			}
		}
		if (defaultChartLabel && isProtocolChartsLabel(defaultChartLabel) && availableCharts.includes(defaultChartLabel)) {
			defaultToggledCharts.push(defaultChartLabel)
		}
	} else if (!isCEX) {
		const cannotShowAsDefault = new Set<ProtocolChartsLabels>([
			'TVL',
			'Total Assets',
			'TVS',
			'Mcap',
			'Token Price',
			'Token Volume',
			'Token Liquidity',
			'FDV',
			'Total Proposals',
			'Successful Proposals',
			'Max Votes'
		])

		const fallbackLabel = availableCharts.find((chart) => !cannotShowAsDefault.has(chart))
		if (fallbackLabel) {
			defaultToggledCharts.push(fallbackLabel)
		}
	}

	return {
		id: String(protocolData.id),
		name: name,
		category: protocolData.category ?? null,
		tags: protocolData.tags ?? null,
		otherProtocols: protocolData.otherProtocols ?? null,
		deprecated: protocolData.deprecated ?? false,
		chains: protocolData.chains ?? [],
		currentTvlByChain: currentProtocolMetadata.tvl ? (protocolData.currentChainTvls ?? {}) : {},
		description: protocolData.description ?? '',
		website: protocolData.referralUrl ?? protocolData.url ?? null,
		twitter: protocolData.twitter ?? null,
		safeHarbor: currentProtocolMetadata.safeHarbor ?? false,
		github: protocolData.github
			? typeof protocolData.github === 'string'
				? [protocolData.github]
				: protocolData.github
			: null,
		methodology:
			protocolData.methodology ||
			(currentProtocolMetadata.tvl && protocolData.module !== 'dummy.js'
				? 'Total value of all coins held in the smart contracts of the protocol'
				: null),
		methodologyURL:
			currentProtocolMetadata.tvl && protocolData.module && protocolData.module !== 'dummy.js'
				? `https://github.com/DefiLlama/DefiLlama-Adapters/tree/main/projects/${protocolData.module}`
				: null,
		token: {
			symbol:
				protocolData.symbol && protocolData.symbol !== '-'
					? protocolData.symbol
					: (protocolData.tokenCGData?.symbol ?? null),
			gecko_id: protocolData.gecko_id ?? null,
			gecko_url: protocolData.gecko_id ? `https://www.coingecko.com/en/coins/${protocolData.gecko_id}` : null,
			explorer_url: getProtocolTokenUrlOnExplorer(protocolData.address)
		},
		metrics: protocolMetrics,
		fees: feesData,
		revenue: revenueData,
		holdersRevenue: holdersRevenueData,
		bribeRevenue: bribesData,
		tokenTax: tokenTaxData,
		dexVolume: dexVolumeData,
		dexAggregatorVolume: dexAggregatorVolumeData,
		perpVolume: perpVolumeData,
		openInterest: openInterestData,
		perpAggregatorVolume: perpAggregatorVolumeData,
		bridgeAggregatorVolume: bridgeAggregatorVolumeData,
		optionsPremiumVolume: optionsPremiumVolumeData,
		optionsNotionalVolume: optionsNotionalVolumeData,
		bridgeVolume: bridgeVolumeData || null,
		treasury,
		unlocks: null,
		governance: null,
		yields,
		articles,
		incentives,
		users,
		raises: raises?.length ? raises : null,
		expenses: expenses
			? {
					headcount: expenses.headcount ?? null,
					annualUsdCost: Object.entries(expenses.annualUsdCost ?? {}).map(([category, amount]) => [
						capitalizeFirstLetter(category),
						amount ?? null
					]),
					total: Object.values(expenses.annualUsdCost ?? {}).reduce((acc, curr) => acc + curr, 0),
					sources: expenses.sources ?? null,
					notes: expenses.notes ?? null,
					lastUpdate: expenses.lastUpdate ?? null
				}
			: null,
		tokenLiquidity:
			tokenLiquidity?.length > 0
				? { pools: tokenLiquidity, total: tokenLiquidity.reduce((acc, curr) => acc + curr[2], 0) }
				: null,
		tokenCGData: protocolData.tokenCGData ?? null,
		outstandingFDV:
			adjustedSupply && protocolData.tokenCGData?.price?.current
				? adjustedSupply * protocolData.tokenCGData.price.current
				: null,
		audits:
			+protocolData.audits > 0
				? {
						total: +protocolData.audits,
						auditLinks: protocolData.audit_links ?? [],
						note: protocolData.audit_note ?? null
					}
				: null,
		isCEX,
		hasKeyMetrics,
		competitors: competitorsList,
		hacks,
		chartDenominations,
		availableCharts,
		chartColors,
		tvlChartData: protocolTvlChartData,
		hallmarks: Object.entries(hallmarks)
			.sort(([a], [b]) => Number(a) - Number(b))
			.map(([date, event]) => [+date * 1e3, event as string]),
		rangeHallmarks: rangeHallmarks.map(([date, event]) => [[+date[0] * 1e3, +date[1] * 1e3], event as string]),
		geckoId: protocolData.gecko_id ?? null,
		governanceApis: governanceApis(protocolData.governanceID) ?? null,
		incomeStatement,
		warningBanners: getProtocolWarningBanners(protocolData),
		defaultChartView:
			feesData?.defaultChartView ??
			revenueData?.defaultChartView ??
			holdersRevenueData?.defaultChartView ??
			bribesData?.defaultChartView ??
			tokenTaxData?.defaultChartView ??
			dexVolumeData?.defaultChartView ??
			dexAggregatorVolumeData?.defaultChartView ??
			perpVolumeData?.defaultChartView ??
			perpAggregatorVolumeData?.defaultChartView ??
			bridgeAggregatorVolumeData?.defaultChartView ??
			optionsPremiumVolumeData?.defaultChartView ??
			optionsNotionalVolumeData?.defaultChartView ??
			'daily',
		seoDescription,
		seoKeywords,
		defaultToggledCharts,
		oracleTvs
	}
}

function formatAdapterData({ data, methodologyKey }: { data: IAdapterSummary; methodologyKey?: string }) {
	if (!data) {
		return null
	}

	if (data.childProtocols?.length) {
		const childMethodologies = []
		for (const childProtocol of data.childProtocols) {
			if (methodologyKey && !commonMethodology[methodologyKey]) {
				childMethodologies.push([
					childProtocol.displayName,
					childProtocol.methodology?.[methodologyKey] ?? null,
					childProtocol.methodologyURL ?? null
				])
			}
		}

		const areMethodologiesDifferent = new Set(childMethodologies.map((m) => m[1])).size > 1
		const topChildMethodology =
			data.childProtocols?.length > 1
				? childMethodologies.find((m) => m[0] === data.childProtocols[0].displayName)
				: null

		return {
			total24h: data.total24h ?? null,
			total7d: data.total7d ?? null,
			total30d: data.total30d ?? null,
			totalAllTime: data.totalAllTime ?? null,
			...(methodologyKey === 'HoldersRevenue'
				? {
						methodology: methodologyKey
							? (childMethodologies.find((m) => m[1] != null)?.[1] ?? commonMethodology[methodologyKey] ?? null)
							: null,
						methodologyURL: childMethodologies.find((m) => m[2] != null)?.[2] ?? null
					}
				: areMethodologiesDifferent
					? { childMethodologies: childMethodologies.filter((m) => !!(m[1] || m[2])) }
					: {
							methodology: methodologyKey
								? (topChildMethodology?.[1] ?? commonMethodology[methodologyKey] ?? null)
								: null,
							methodologyURL: topChildMethodology?.[2] ?? null
						}),
			defaultChartView: data.defaultChartView ?? 'daily'
		}
	}

	return {
		total24h: data.total24h ?? null,
		total7d: data.total7d ?? null,
		total30d: data.total30d ?? null,
		totalAllTime: data.totalAllTime ?? null,
		methodology: methodologyKey
			? (data.methodology?.[methodologyKey] ?? commonMethodology[methodologyKey] ?? null)
			: null,
		methodologyURL: data.methodologyURL ?? null,
		defaultChartView: data.defaultChartView ?? 'daily'
	}
}

const commonMethodology = {
	dexs: definitions.dexs.common,
	dexAggregators: definitions.dexAggregators.common,
	perps: definitions.perps.common,
	perpsAggregators: definitions.perpsAggregators.common,
	bridgeAggregators: definitions.bridgeAggregators.common,
	optionsPremiumVolume: definitions.optionsPremium.common,
	optionsNotionalVolume: definitions.optionsNotional.common
}

const fetchArticles = async ({ tags = '', size = 2 }) => {
	const articlesRes: IArticlesResponse = await fetchJson(`https://api.llama.fi/news/articles`, {
		timeout: 10_000
	}).catch((err) => {
		console.log(err)
		return {}
	})

	const target = tags.toLowerCase()

	const articles: IArticle[] =
		articlesRes?.content_elements
			?.filter((element) => element.taxonomy?.tags?.some((tag) => tag.slug.toLowerCase() === target))
			.map((element) => ({
				headline: element.headlines.basic,
				date: element.display_date,
				href: `https://dlnews.com${element.canonical_url}`,
				imgSrc: element.promo_items?.basic?.url ?? null
			})) ?? []

	return articles.slice(0, size)
}

interface ICoingeckoTicker {
	trust_score?: string
	market?: { identifier?: string }
	converted_volume?: { usd?: number | null }
}

interface ICoingeckoCoinData {
	market_data?: {
		ath?: { usd?: number | null }
		ath_date?: { usd?: number | null }
		atl?: { usd?: number | null }
		atl_date?: { usd?: number | null }
		market_cap?: { usd?: number | null }
		total_supply?: number | null
		fully_diluted_valuation?: { usd?: number | null }
		total_volume?: { usd?: number | null }
	}
	tickers?: ICoingeckoTicker[]
	symbol?: string
}

interface ICoingeckoFullChartPayload {
	prices?: Array<[number, number]>
	coinData?: ICoingeckoCoinData
}

function getTokenCGData(tokenCGData: unknown, cg_volume_cexs: string[]) {
	const normalized = (tokenCGData ?? {}) as ICoingeckoFullChartPayload
	const tokenPrice = normalized.prices?.length ? normalized.prices[normalized.prices.length - 1][1] : null
	const tokenInfo = normalized.coinData

	return {
		price: {
			current: tokenPrice ?? null,
			ath: tokenInfo?.['market_data']?.['ath']?.['usd'] ?? null,
			athDate: tokenInfo?.['market_data']?.['ath_date']?.['usd'] ?? null,
			atl: tokenInfo?.['market_data']?.['atl']?.['usd'] ?? null,
			atlDate: tokenInfo?.['market_data']?.['atl_date']?.['usd'] ?? null
		},
		marketCap: { current: tokenInfo?.['market_data']?.['market_cap']?.['usd'] ?? null },
		totalSupply: tokenInfo?.['market_data']?.['total_supply'] ?? null,
		fdv: { current: tokenInfo?.['market_data']?.['fully_diluted_valuation']?.['usd'] ?? null },
		volume24h: {
			total: tokenInfo?.['market_data']?.['total_volume']?.['usd'] ?? null,
			cex:
				tokenInfo?.['tickers']?.reduce(
					(acc, curr) =>
						(acc +=
							curr['trust_score'] !== 'red' && cg_volume_cexs.includes(curr.market?.identifier ?? '')
								? (curr.converted_volume?.usd ?? 0)
								: 0),
					0
				) ?? null,
			dex:
				tokenInfo?.['tickers']?.reduce(
					(acc, curr) =>
						(acc +=
							curr['trust_score'] === 'red' || cg_volume_cexs.includes(curr.market?.identifier ?? '')
								? 0
								: (curr.converted_volume?.usd ?? 0)),
					0
				) ?? null
		},
		symbol: tokenInfo?.['symbol'] ? tokenInfo.symbol.toUpperCase() : null
	}
}

const governanceApis = (governanceID) =>
	(
		governanceID?.map((gid) =>
			gid.startsWith('snapshot:')
				? `${PROTOCOL_GOVERNANCE_SNAPSHOT_API}/${gid.split('snapshot:')[1].replace(/(:|' |')/g, '/')}.json`
				: gid.startsWith('compound:')
					? `${PROTOCOL_GOVERNANCE_COMPOUND_API}/${gid.split('compound:')[1].replace(/(:|' |')/g, '/')}.json`
					: gid.startsWith('tally:')
						? `${PROTOCOL_GOVERNANCE_TALLY_API}/${gid.split('tally:')[1].replace(/(:|' |')/g, '/')}.json`
						: `${PROTOCOL_GOVERNANCE_TALLY_API}/${gid.replace(/(:|' |')/g, '/')}.json`
		) ?? []
	)
		.map((g) =>
			g.replace(
				process.env.DATASETS_SERVER_URL ?? 'https://defillama-datasets.llama.fi',
				'https://defillama-datasets.llama.fi'
			)
		)
		.map((g) => g.toLowerCase())

const protocolsWithFalsyBreakdownMetrics = new Set(['Jupiter'])

export async function getProtocolIncomeStatement({ metadata }: { metadata: IProtocolMetadata }) {
	try {
		if (!metadata.fees || !metadata.revenue) {
			return null
		}

		if (typeof window !== 'undefined') {
			const protocol = slug(metadata.displayName)
			return fetchJson(`/api/income-statement?protocol=${encodeURIComponent(protocol)}`).catch(() => null)
		}

		const incomeStatement = await fetchJson(
			`${V2_SERVER_URL}/metrics/financial-statement/protocol/${slug(metadata.displayName)}?q=30`
		).catch(() => null)

		if (!incomeStatement) {
			return null
		}

		const aggregates =
			incomeStatement?.aggregates ??
			({
				monthly: {},
				quarterly: {},
				yearly: {}
			} as IProtocolOverviewPageData['incomeStatement']['data'])

		if (protocolsWithFalsyBreakdownMetrics.has(metadata.displayName)) {
			for (const groupBy in aggregates) {
				for (const period in aggregates[groupBy]) {
					for (const label in aggregates[groupBy][period]) {
						aggregates[groupBy][period][label]['by-label'] = {}
					}
				}
			}
		}

		const labelsByType: Record<string, Set<string>> = {}

		// Collect all breakdown labels present in the raw aggregates.
		// The table UI renders breakdown rows based on `labelsByType`, while the Sankey reads `by-label` directly.
		// If this isn't computed, breakdown rows will be missing in the table even when `by-label` data exists.
		for (const groupBy in aggregates) {
			for (const period in aggregates[groupBy]) {
				aggregates[groupBy][period].timestamp = period.includes('Q')
					? new Date(
							`${period.split('-')[0]}-${((parseInt(period.split('-')[1].replace('Q', '')) - 1) * 3 + 1).toString().padStart(2, '0')}`
						).getTime()
					: new Date(period.length === 4 ? `${period}-01-01` : period).getTime()

				const periodData = aggregates[groupBy][period]
				for (const type in periodData) {
					if (type === 'timestamp') continue
					const byLabel = periodData?.[type]?.['by-label']
					if (!byLabel) continue
					for (const breakdownLabel in byLabel) {
						if (!labelsByType[type]) labelsByType[type] = new Set()
						labelsByType[type].add(breakdownLabel)
					}
				}
			}
		}

		const finalLabelsByType = {}
		for (const label in labelsByType) {
			finalLabelsByType[label] = Array.from(labelsByType[label])
		}

		const methodology = incomeStatement.methodology ?? {}
		const breakdownMethodology = incomeStatement.breakdownMethodology ?? {}

		methodology['Earnings'] = 'Gross Profit minus Incentives'

		// If parent has no methodology, aggregate unique methodologies from child protocols
		if (incomeStatement.methodology == null && incomeStatement.childProtocols != null) {
			// Collect unique methodologies for each label type using Sets
			const methodologyByLabel: Record<string, Set<string>> = {}
			const breakdownMethodologyByLabel: Record<string, Record<string, Set<string>>> = {}

			for (const childProtocol of incomeStatement.childProtocols) {
				// Aggregate methodology
				if (childProtocol.methodology) {
					for (const label in childProtocol.methodology) {
						const methodologyText = childProtocol.methodology[label]
						if (methodologyText) {
							if (!methodologyByLabel[label]) {
								methodologyByLabel[label] = new Set()
							}
							methodologyByLabel[label].add(methodologyText)
						}
					}
				}

				// Aggregate breakdownMethodology
				if (childProtocol.breakdownMethodology) {
					for (const label in childProtocol.breakdownMethodology) {
						if (!breakdownMethodologyByLabel[label]) {
							breakdownMethodologyByLabel[label] = {}
						}
						const breakdowns = childProtocol.breakdownMethodology[label]
						for (const breakdownLabel in breakdowns) {
							const breakdownText = breakdowns[breakdownLabel]
							if (breakdownText) {
								if (!breakdownMethodologyByLabel[label][breakdownLabel]) {
									breakdownMethodologyByLabel[label][breakdownLabel] = new Set()
								}
								breakdownMethodologyByLabel[label][breakdownLabel].add(breakdownText)
							}
						}
					}
				}
			}

			// Convert Sets/Maps to strings
			for (const label in methodologyByLabel) {
				const uniqueMethodologies = Array.from(methodologyByLabel[label])
				if (uniqueMethodologies.length === 1) {
					methodology[label] = uniqueMethodologies[0]
				} else {
					// Multiple unique methodologies - show with child protocol names
					const parts: string[] = []
					for (const childProtocol of incomeStatement.childProtocols) {
						const childMethodology = childProtocol.methodology?.[label]
						if (childMethodology) {
							parts.push(`${childProtocol.displayName}: ${childMethodology}`)
						}
					}
					methodology[label] = parts.join('\n')
				}
			}

			for (const label in breakdownMethodologyByLabel) {
				if (!breakdownMethodology[label]) {
					breakdownMethodology[label] = {}
				}
				for (const breakdownLabel in breakdownMethodologyByLabel[label]) {
					const uniqueBreakdowns = Array.from(breakdownMethodologyByLabel[label][breakdownLabel])
					if (uniqueBreakdowns.length === 1) {
						breakdownMethodology[label][breakdownLabel] = uniqueBreakdowns[0]
					} else {
						// Multiple unique breakdown methodologies - show with child protocol names
						const parts: string[] = []
						for (const childProtocol of incomeStatement.childProtocols) {
							const childBreakdown = childProtocol.breakdownMethodology?.[label]?.[breakdownLabel]
							if (childBreakdown) {
								parts.push(`${childProtocol.displayName}: ${childBreakdown}`)
							}
						}
						breakdownMethodology[label][breakdownLabel] = parts.join('\n')
					}
				}
			}
		}

		let hasOtherTokenHolderFlows = false
		for (const groupBy in aggregates) {
			for (const period in aggregates[groupBy]) {
				for (const label in aggregates[groupBy][period]) {
					if (label === 'Others Token Holder Flows') {
						hasOtherTokenHolderFlows = true
						break
					}
				}
			}
		}

		return {
			data: aggregates,
			labelsByType: finalLabelsByType,
			methodology: methodology,
			breakdownMethodology: breakdownMethodology,
			hasOtherTokenHolderFlows
		} as IProtocolOverviewPageData['incomeStatement']
	} catch (err) {
		console.log(err)
		return null
	}
}
