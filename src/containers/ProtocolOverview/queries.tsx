import { fetchBlockExplorers, fetchLiquidityTokensDataset } from '~/api'
import { fetchCoinGeckoChartByIdWithCacheFallback } from '~/api/coingecko'
import type { CgChartResponse } from '~/api/coingecko.types'
import type { BlockExplorersResponse, ProtocolLiquidityTokensResponse } from '~/api/types'
import { oracleProtocols, V2_SERVER_URL, YIELD_CONFIG_API, YIELD_POOLS_API } from '~/constants'
import { chainCoingeckoIdsForGasNotMcap } from '~/constants/chainTokens'
import { CHART_COLORS } from '~/constants/colors'
import { fetchBridgeVolumeBySlug } from '~/containers/Bridges/api'
import { fetchAdapterProtocolChartData, fetchAdapterProtocolMetrics } from '~/containers/DimensionAdapters/api'
import type { IAdapterProtocolMetrics } from '~/containers/DimensionAdapters/api.types'
import { governanceIdsToApis } from '~/containers/Governance/api'
import { fetchHacks } from '~/containers/Hacks/api'
import type { IHackApiItem } from '~/containers/Hacks/api.types'
import { getProtocolIncentivesFromAggregatedEmissions } from '~/containers/Incentives/queries'
import { fetchOracleMetrics, fetchOracleProtocolChart } from '~/containers/Oracles/api'
import type { IOracleProtocolChart } from '~/containers/Oracles/api.types'
import { fetchProtocols } from '~/containers/Protocols/api'
import type { ProtocolsResponse } from '~/containers/Protocols/api.types'
import { fetchTreasuries } from '~/containers/Treasuries/api'
import { fetchProtocolEmissionFromDatasets } from '~/containers/Unlocks/api'
import { TVL_SETTINGS_KEYS_SET } from '~/contexts/LocalStorage'
import { definitions } from '~/public/definitions'
import { capitalizeFirstLetter, slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { getBlockExplorerNew } from '~/utils/blockExplorers'
import { buildProtocolOverviewHallmarks } from '~/utils/hallmarks'
import type { IChainMetadata, IProtocolMetadata, ProtocolLlamaswapMetadata } from '~/utils/metadata/types'
import {
	fetchProtocolExpenses,
	fetchProtocolOverviewMetrics,
	fetchProtocolTreasuryChart,
	fetchProtocolTvlChart
} from './api'
import type { IProtocolValueChart, IProtocolMetricsV2, IProtocolExpenses } from './api.types'
import { ADAPTER_CHART_DESCRIPTORS } from './chartDescriptors'
import { normalizeBridgeVolumeToChartMs, normalizeChartPointsToMs } from './chartSeries.utils'
import type { ProtocolChartsLabels } from './constants'
import { buildAvailableCharts, buildDefaultToggledCharts } from './defaultCharts'
import type { IArticle, IArticlesResponse, IProtocolOverviewPageData, IProtocolPageMetrics } from './types'
import { getProtocolWarningBanners } from './utils'

interface IProtocolDataExtended extends IProtocolMetricsV2 {
	tokenCGData?: {
		price: {
			current: number | null
			ath: number | null
			athDate: string | null
			atl: number | null
			atlDate: string | null
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
	devMetrics?: {
		weeklyCommits: number | null
		monthlyCommits: number | null
		weeklyDevelopers: number | null
		monthlyDevelopers: number | null
		lastCommit: number | null
		updatedAt: number | null
	}
}

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
		dexsNotionalVolume: !!metadata.dexsNotionalVolume,
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
		newUsers: !!metadata.newUsers,
		txCount: !!metadata.txCount,
		gasUsed: !!metadata.gasUsed,
		borrowed: !!metadata.borrowed,
		tokenRights: !!metadata.tokenRights
	}
}

type IYieldsDataResult = { data?: Array<{ project: string; apy: number }> } | null
type IYieldsConfigResult = { protocols?: Record<string, { name?: string }> } | null
type IBridgeVolumeResult = Array<{ date: string; depositUSD: number; withdrawUSD: number }> | null

export const getProtocolOverviewPageData = async ({
	protocolId,
	currentProtocolMetadata,
	isCEX = false,
	chainMetadata,
	tokenlist,
	cgExchangeIdentifiers,
	protocolLlamaswapDataset
}: {
	protocolId: string
	currentProtocolMetadata: IProtocolMetadata
	isCEX?: boolean
	chainMetadata: Record<string, IChainMetadata>
	tokenlist: Record<string, import('~/utils/metadata/types').ITokenListEntry>
	cgExchangeIdentifiers: string[]
	protocolLlamaswapDataset?: ProtocolLlamaswapMetadata
}): Promise<IProtocolOverviewPageData> => {
	const displayName = currentProtocolMetadata.displayName ?? ''
	const oracleProtocolName = (oracleProtocols as Record<string, string>)[displayName] ?? null
	const isOracleProtocol = Boolean(oracleProtocolName)

	const [
		protocolData,
		protocolTvlChartData,
		feesData,
		revenueData,
		holdersRevenueData,
		bribesData,
		tokenTaxData,
		dexVolumeData,
		dexNotionalVolumeData,
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
		activeUsers,
		newUsers,
		transactions,
		gasUsd,
		expenses,
		yieldsConfig,
		liquidityInfo,
		liteProtocolsData,
		hacksData,
		bridgeVolumeData,
		incomeStatement,
		oracleChartData,
		oracleTvs,
		blockExplorersData
	]: [
		IProtocolDataExtended | null,
		IProtocolValueChart,
		Awaited<ReturnType<typeof formatAdapterData>>,
		Awaited<ReturnType<typeof formatAdapterData>>,
		Awaited<ReturnType<typeof formatAdapterData>>,
		Awaited<ReturnType<typeof formatAdapterData>>,
		Awaited<ReturnType<typeof formatAdapterData>>,
		Awaited<ReturnType<typeof formatAdapterData>>,
		Awaited<ReturnType<typeof formatAdapterData>>,
		Awaited<ReturnType<typeof formatAdapterData>>,
		Awaited<ReturnType<typeof formatAdapterData>>,
		Awaited<ReturnType<typeof formatAdapterData>>,
		Awaited<ReturnType<typeof formatAdapterData>>,
		Awaited<ReturnType<typeof formatAdapterData>>,
		Awaited<ReturnType<typeof formatAdapterData>>,
		Awaited<ReturnType<typeof formatAdapterData>>,
		IProtocolOverviewPageData['treasury'],
		IYieldsDataResult,
		IArticle[],
		IProtocolOverviewPageData['incentives'],
		number | null,
		number | null,
		number | null,
		number | null,
		number | null,
		IProtocolExpenses | null,
		IYieldsConfigResult,
		ProtocolLiquidityTokensResponse,
		ProtocolsResponse,
		IHackApiItem[],
		IBridgeVolumeResult,
		IProtocolOverviewPageData['incomeStatement'],
		IOracleProtocolChart | null,
		IProtocolOverviewPageData['oracleTvs'],
		BlockExplorersResponse
	] = await Promise.all([
		fetchProtocolOverviewMetrics(slug(currentProtocolMetadata.displayName)).then(
			async (data): Promise<IProtocolDataExtended | null> => {
				if (!data) return null
				try {
					const geckoId = data.gecko_id
					const tokenEntry = geckoId ? (tokenlist[geckoId] ?? null) : null
					const tickers =
						tokenEntry && geckoId
							? await fetchCoinGeckoChartByIdWithCacheFallback(geckoId)
									.then((res) => res?.data?.coinData?.tickers)
									.catch(() => undefined)
							: undefined
					return { ...data, tokenCGData: getTokenCGData(tokenEntry, tickers, cgExchangeIdentifiers) }
				} catch (e) {
					console.log('[HTTP]:[ERROR]:[TOKEN_CG_DATA]:', e)
					return data
				}
			}
		),
		currentProtocolMetadata.tvl && !isOracleProtocol
			? fetchProtocolTvlChart({ protocol: slug(currentProtocolMetadata.displayName ?? '') })
					.then((chart) => chart ?? [])
					.catch((): Array<[number, number]> => [])
			: Promise.resolve([] as Array<[number, number]>),
		currentProtocolMetadata.fees
			? fetchAdapterProtocolMetrics({
					adapterType: 'fees',
					protocol: currentProtocolMetadata.displayName ?? ''
				})
					.then((data) => formatAdapterData({ data, methodologyKey: 'Fees' }))
					.catch(() => null)
			: Promise.resolve(null),
		currentProtocolMetadata.revenue
			? fetchAdapterProtocolMetrics({
					adapterType: 'fees',
					dataType: 'dailyRevenue',
					protocol: currentProtocolMetadata.displayName ?? ''
				})
					.then((data) => formatAdapterData({ data, methodologyKey: 'Revenue' }))
					.catch(() => null)
			: Promise.resolve(null),
		currentProtocolMetadata.holdersRevenue
			? fetchAdapterProtocolMetrics({
					adapterType: 'fees',
					dataType: 'dailyHoldersRevenue',
					protocol: currentProtocolMetadata.displayName ?? ''
				})
					.then((data) => formatAdapterData({ data, methodologyKey: 'HoldersRevenue' }))
					.catch(() => null)
			: Promise.resolve(null),
		currentProtocolMetadata.bribeRevenue
			? fetchAdapterProtocolMetrics({
					adapterType: 'fees',
					dataType: 'dailyBribesRevenue',
					protocol: currentProtocolMetadata.displayName ?? ''
				})
					.then((data) => formatAdapterData({ data, methodologyKey: 'BribesRevenue' }))
					.catch(() => null)
			: Promise.resolve(null),
		currentProtocolMetadata.tokenTax
			? fetchAdapterProtocolMetrics({
					adapterType: 'fees',
					dataType: 'dailyTokenTaxes',
					protocol: currentProtocolMetadata.displayName ?? ''
				})
					.then((data) => formatAdapterData({ data, methodologyKey: 'TokenTaxes' }))
					.catch(() => null)
			: Promise.resolve(null),
		currentProtocolMetadata.dexs
			? fetchAdapterProtocolMetrics({
					adapterType: 'dexs',
					protocol: currentProtocolMetadata.displayName ?? ''
				})
					.then((data) => formatAdapterData({ data, methodologyKey: data.methodology?.['Volume'] ? 'Volume' : 'dexs' }))
					.catch(() => null)
			: Promise.resolve(null),
		currentProtocolMetadata.dexsNotionalVolume
			? fetchAdapterProtocolMetrics({
					adapterType: 'dexs',
					dataType: 'dailyNotionalVolume',
					protocol: currentProtocolMetadata.displayName ?? ''
				})
					.then((data) => formatAdapterData({ data, methodologyKey: 'dexsNotionalVolume' }))
					.catch(() => null)
			: Promise.resolve(null),
		currentProtocolMetadata.dexAggregators
			? fetchAdapterProtocolMetrics({
					adapterType: 'aggregators',
					protocol: currentProtocolMetadata.displayName ?? ''
				})
					.then((data) => formatAdapterData({ data, methodologyKey: 'dexAggregators' }))
					.catch(() => null)
			: Promise.resolve(null),
		currentProtocolMetadata.perps
			? fetchAdapterProtocolMetrics({
					adapterType: 'derivatives',
					protocol: currentProtocolMetadata.displayName ?? ''
				})
					.then((data) => formatAdapterData({ data, methodologyKey: 'perps' }))
					.catch(() => null)
			: Promise.resolve(null),
		currentProtocolMetadata.openInterest
			? fetchAdapterProtocolMetrics({
					adapterType: 'open-interest',
					protocol: currentProtocolMetadata.displayName ?? '',
					dataType: 'openInterestAtEnd'
				})
					.then((data) => formatAdapterData({ data, methodologyKey: 'openInterest' }))
					.catch(() => null)
			: Promise.resolve(null),
		currentProtocolMetadata.perpsAggregators
			? fetchAdapterProtocolMetrics({
					adapterType: 'aggregator-derivatives',
					protocol: currentProtocolMetadata.displayName ?? ''
				})
					.then((data) => formatAdapterData({ data, methodologyKey: 'perpsAggregators' }))
					.catch(() => null)
			: Promise.resolve(null),
		currentProtocolMetadata.bridgeAggregators
			? fetchAdapterProtocolMetrics({
					adapterType: 'bridge-aggregators',
					protocol: currentProtocolMetadata.displayName ?? ''
				})
					.then((data) => formatAdapterData({ data, methodologyKey: 'bridgeAggregators' }))
					.catch(() => null)
			: Promise.resolve(null),
		currentProtocolMetadata.optionsPremiumVolume
			? fetchAdapterProtocolMetrics({
					adapterType: 'options',
					dataType: 'dailyPremiumVolume',
					protocol: currentProtocolMetadata.displayName ?? ''
				})
					.then((data) => formatAdapterData({ data, methodologyKey: 'optionsPremiumVolume' }))
					.catch(() => null)
			: Promise.resolve(null),
		currentProtocolMetadata.optionsNotionalVolume
			? fetchAdapterProtocolMetrics({
					adapterType: 'options',
					dataType: 'dailyNotionalVolume',
					protocol: currentProtocolMetadata.displayName ?? ''
				})
					.then((data) => formatAdapterData({ data, methodologyKey: 'optionsNotionalVolume' }))
					.catch(() => null)
			: Promise.resolve(null),
		currentProtocolMetadata.treasury
			? fetchTreasuries()
					.then(
						(res: Array<{ id: string; tokenBreakdowns?: Record<string, number | null> }>) =>
							res.find((item) => item.id === `${protocolId}-treasury`)?.tokenBreakdowns ?? null
					)
					.then((res): IProtocolOverviewPageData['treasury'] => {
						if (!res) return null
						return {
							majors: res.majors ?? null,
							stablecoins: res.stablecoins ?? null,
							ownTokens: res.ownTokens ?? null,
							others: res.others ?? null,
							total: [res.majors, res.stablecoins, res.ownTokens, res.others].reduce(
								(acc: number, curr) => acc + +(curr ?? 0),
								0
							)
						}
					})
					.catch(() => null)
			: Promise.resolve(null),
		currentProtocolMetadata.yields
			? fetchJson<IYieldsDataResult>(YIELD_POOLS_API).catch((err) => {
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
			? getProtocolIncentivesFromAggregatedEmissions({
					protocolId,
					protocolDisplayName: currentProtocolMetadata.displayName ?? ''
				}).catch(() => null)
			: null,
		currentProtocolMetadata?.emissions && protocolId
			? fetchProtocolEmissionFromDatasets(slug(currentProtocolMetadata.displayName))
					.then((data) => data?.supplyMetrics?.adjustedSupply ?? null)
					.catch(() => null)
			: null,
		currentProtocolMetadata.activeUsers
			? fetchAdapterProtocolMetrics({
					protocol: currentProtocolMetadata.displayName,
					adapterType: 'active-users'
				})
					.then((data) => data?.total24h ?? null)
					.catch(() => null)
			: Promise.resolve(null),
		currentProtocolMetadata.newUsers
			? fetchAdapterProtocolMetrics({
					protocol: currentProtocolMetadata.displayName,
					adapterType: 'new-users'
				})
					.then((data) => data?.total24h ?? null)
					.catch(() => null)
			: Promise.resolve(null),
		currentProtocolMetadata.txCount
			? fetchAdapterProtocolMetrics({
					protocol: currentProtocolMetadata.displayName,
					adapterType: 'active-users',
					dataType: 'dailyTransactionsCount'
				})
					.then((data) => data?.total24h ?? null)
					.catch(() => null)
			: Promise.resolve(null),
		currentProtocolMetadata.gasUsed
			? fetchAdapterProtocolMetrics({
					protocol: currentProtocolMetadata.displayName,
					adapterType: 'active-users',
					dataType: 'dailyGasUsed'
				})
					.then((data) => data?.total24h ?? null)
					.catch(() => null)
			: Promise.resolve(null),
		currentProtocolMetadata.expenses && protocolId
			? fetchProtocolExpenses()
					.then((data) => data.find((item) => item.protocolId === protocolId) ?? null)
					.catch(() => {
						return null
					})
			: null,
		currentProtocolMetadata.liquidity
			? fetchJson<IYieldsConfigResult>(YIELD_CONFIG_API).catch(() => {
					return null
				})
			: null,
		currentProtocolMetadata?.liquidity
			? fetchLiquidityTokensDataset().catch(() => {
					return []
				})
			: [],
		fetchProtocols().catch((): ProtocolsResponse => ({ protocols: [], chains: [], parentProtocols: [] })),
		fetchHacks().catch(() => []),
		currentProtocolMetadata.bridge
			? fetchBridgeVolumeBySlug(slug(currentProtocolMetadata.displayName))
					.then((data) => data.dailyVolumes || null)
					.catch(() => null)
			: null,
		getProtocolIncomeStatement({ metadata: currentProtocolMetadata }),
		oracleProtocolName
			? fetchOracleProtocolChart({ protocol: oracleProtocolName })
					.then((data): Array<[number, number]> | null => normalizeChartPointsToMs(data))
					.catch(() => null)
			: null,
		oracleProtocolName
			? fetchOracleMetrics()
					.then((data): Record<string, number> | null => {
						const protocolTvsByOracle = data?.oraclesTVS?.[oracleProtocolName]
						if (!protocolTvsByOracle) return null
						const tvs: Record<string, number> = {}

						const displayNameTvs = protocolTvsByOracle[displayName]
						const slugNameTvs = protocolTvsByOracle[slug(displayName)]
						const selectedProtocolTvs: Record<string, Record<string, number>> = displayNameTvs
							? { [displayName]: displayNameTvs }
							: slugNameTvs
								? { [slug(displayName)]: slugNameTvs }
								: (protocolTvsByOracle as unknown as Record<string, Record<string, number>>)
						for (const protocolKey in selectedProtocolTvs) {
							const chainTvs = selectedProtocolTvs[protocolKey]
							for (const chain in chainTvs) {
								const nestedValue = Number(chainTvs[chain])
								if (!Number.isFinite(nestedValue)) continue
								tvs[chain] = (tvs[chain] ?? 0) + nestedValue
							}
						}
						let hasTvs = false
						for (const _ in tvs) {
							hasTvs = true
							break
						}
						return hasTvs ? tvs : null
					})
					.catch(() => null)
			: null,
		fetchBlockExplorers().catch((): BlockExplorersResponse => [])
	])

	if (!protocolData) {
		throw new Error(`Unable to fetch protocol data for ${currentProtocolMetadata.displayName}`)
	}

	const otherProtocols = protocolData.otherProtocols?.map((p) => slug(p)) ?? []
	const projectYields = yieldsData?.data?.filter(
		({ project }: { project: string }) =>
			[slug(currentProtocolMetadata.displayName), currentProtocolMetadata.displayName].includes(project) ||
			(protocolData?.parentProtocol ? false : otherProtocols.includes(project))
	)
	const yields =
		yieldsData && yieldsData.data && projectYields && projectYields.length > 0
			? {
					noOfPoolsTracked: projectYields.length,
					averageAPY:
						projectYields.reduce((acc: number, { apy }: { apy: number }) => acc + apy, 0) / projectYields.length
				}
			: null

	const tokenPools =
		yieldsData?.data && yieldsConfig
			? (liquidityInfo?.find((p: ProtocolLiquidityTokensResponse[number]) => p.id === protocolData.id)?.tokenPools ??
				[])
			: []

	const liquidityAggregated = tokenPools.reduce(
		(agg: Record<string, Record<string, number>>, pool: { project: string; chain: string; tvlUsd: number }) => {
			if (!agg[pool.project]) agg[pool.project] = {}
			agg[pool.project][pool.chain] = pool.tvlUsd + (agg[pool.project][pool.chain] ?? 0)
			return agg
		},
		{} as Record<string, Record<string, number>>
	)

	const tokenLiquidity = yieldsConfig?.protocols
		? (() => {
				const rows: Array<[string, string, number]> = []
				for (const protocolSlug in liquidityAggregated) {
					const protocolName = yieldsConfig.protocols?.[protocolSlug]?.name
					if (!protocolName) continue
					const chainValues = liquidityAggregated[protocolSlug]
					for (const chainName in chainValues) {
						rows.push([protocolName, chainName, Number(chainValues[chainName])])
					}
				}
				rows.sort((a: [string, string, number], b: [string, string, number]) => b[2] - a[2])
				return rows
			})()
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
		treasury ||
		tokenLiquidity?.length ||
		feesData?.totalAllTime ||
		revenueData?.totalAllTime ||
		holdersRevenueData?.totalAllTime ||
		incentives ||
		dexVolumeData?.totalAllTime ||
		dexNotionalVolumeData?.totalAllTime ||
		perpVolumeData?.totalAllTime ||
		dexAggregatorVolumeData?.totalAllTime ||
		perpAggregatorVolumeData?.totalAllTime ||
		bridgeAggregatorVolumeData?.totalAllTime ||
		optionsPremiumVolumeData?.totalAllTime ||
		optionsNotionalVolumeData?.totalAllTime ||
		openInterestData?.total24h != null ||
		bridgeVolumeData?.length ||
		bribesData?.totalAllTime ||
		tokenTaxData?.totalAllTime ||
		oracleTvs ||
		protocolData.tokenCGData
	)

	const protocolChainsSet = new Set(protocolData.chains ?? [])

	const competitors =
		liteProtocolsData && protocolData.category
			? (() => {
					const rows: Array<{ name: string; tvl: number; commonChains: number }> = []
					const currentCategory = protocolData.category.toLowerCase()
					const currentName = protocolData.name?.toLowerCase()
					for (const protocol of liteProtocolsData.protocols) {
						if (!protocol.category) continue
						if (protocol.category.toLowerCase() !== currentCategory) continue
						if (protocol.name.toLowerCase() === currentName) continue
						const candidateChainsSet = new Set(protocol.chains)
						let hasCommonChain = false
						for (const chain of candidateChainsSet) {
							if (protocolChainsSet.has(chain)) {
								hasCommonChain = true
								break
							}
						}
						if (!hasCommonChain) continue

						let commonChains = 0
						for (const chain of protocolData?.chains ?? []) {
							if (candidateChainsSet.has(chain)) {
								commonChains += 1
							}
						}

						rows.push({ name: protocol.name, tvl: protocol.tvl, commonChains })
					}
					rows.sort((a, b) => b.tvl - a.tvl)
					return rows
				})()
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

	const competitorsList: Array<{ name: string; tvl: number }> = []
	for (const protocolName of competitorsSet) {
		const competitor = competitorsMap.get(protocolName)
		if (!competitor) continue
		competitorsList.push({ name: competitor.name, tvl: competitor.tvl })
	}

	const hacks =
		(protocolData.id
			? hacksData
					?.filter((hack: IHackApiItem) =>
						isCEX
							? [hack.name].includes(currentProtocolMetadata.displayName ?? '')
							: [String(hack.defillamaId), String(hack.parentProtocolId)].includes(String(protocolId))
					)
					?.sort((a: IHackApiItem, b: IHackApiItem) => a.date - b.date)
			: null) ?? null

	const protocolMetrics = getProtocolMetricFlags({
		protocolData,
		metadata: currentProtocolMetadata
	})

	const chains: Array<[string, number]> = []
	const currentChainTvlsObj = protocolData.currentChainTvls ?? {}
	for (const chain in currentChainTvlsObj) {
		if (chain.includes('-') || chain === 'offers') continue
		if (TVL_SETTINGS_KEYS_SET.has(chain)) continue
		if (currentChainTvlsObj[chain] != null) {
			chains.push([chain, currentChainTvlsObj[chain]])
		}
	}
	const firstChain = chains.sort((a, b) => b[1] - a[1])?.[0]?.[0] ?? null
	const tokenGeckoId = currentProtocolMetadata.gecko_id ?? null
	const llamaswapChains = !isCEX && tokenGeckoId ? (protocolLlamaswapDataset?.[tokenGeckoId] ?? null) : null
	const chartDenominations: Array<{ symbol: string; geckoId?: string | null }> = []
	if (firstChain && !isCEX) {
		chartDenominations.push({ symbol: 'USD', geckoId: null })

		const cmetadata = chainMetadata?.[slug(firstChain)]
		const chainGasIds = chainCoingeckoIdsForGasNotMcap as Record<
			string,
			{ geckoId: string; symbol: string; cmcId: string }
		>
		if (cmetadata && chainGasIds[cmetadata.name]) {
			chartDenominations.push({
				symbol: chainGasIds[cmetadata.name].symbol,
				geckoId: chainGasIds[cmetadata.name].geckoId
			})
		} else if (cmetadata?.gecko_id) {
			chartDenominations.push({ symbol: cmetadata.tokenSymbol ?? '', geckoId: cmetadata.gecko_id })
		} else {
			chartDenominations.push({ symbol: 'ETH', geckoId: chainMetadata?.['ethereum']?.gecko_id })
		}
	}

	const availableCharts = buildAvailableCharts({
		isCEX,
		hasTvlChart: Boolean(currentProtocolMetadata.tvl && protocolTvlChartData.length > 0),
		hasTvsChart: Boolean(oracleChartData?.length),
		hasGeckoId: Boolean(tokenGeckoId),
		hasLiquidity: Boolean(currentProtocolMetadata.liquidity),
		hasFees: Boolean(feesData),
		hasRevenue: Boolean(revenueData),
		hasHoldersRevenue: Boolean(holdersRevenueData),
		hasDexVolume: Boolean(dexVolumeData),
		hasDexNotionalVolume: Boolean(dexNotionalVolumeData),
		hasPerpVolume: Boolean(perpVolumeData),
		hasOpenInterest: Boolean(openInterestData),
		hasOptionsPremiumVolume: Boolean(optionsPremiumVolumeData),
		hasOptionsNotionalVolume: Boolean(optionsNotionalVolumeData),
		hasDexAggregatorVolume: Boolean(dexAggregatorVolumeData),
		hasPerpAggregatorVolume: Boolean(perpAggregatorVolumeData),
		hasBridgeAggregatorVolume: Boolean(bridgeAggregatorVolumeData),
		hasBridgeVolume: Boolean(bridgeVolumeData),
		hasUnlocks: Boolean(currentProtocolMetadata.emissions),
		hasIncentives: Boolean(incentives),
		hasStaking: protocolData.currentChainTvls?.staking != null,
		hasBorrowed: protocolData.currentChainTvls?.borrowed != null,
		hasUsdInflows: Boolean(protocolMetrics.inflows),
		hasTreasury: Boolean(treasury),
		hasMedianApy: Boolean(yields && !protocolData.isParentProtocol),
		hasGovernance: Boolean(protocolData.governanceID),
		hasNfts: Boolean(currentProtocolMetadata.nfts),
		hasActiveAddresses: protocolMetrics.activeUsers,
		hasNewAddresses: protocolMetrics.newUsers,
		hasTransactions: protocolMetrics.txCount,
		hasGasUsed: protocolMetrics.gasUsed
	})

	const chartColors: Record<string, string> = {}
	for (let i = 0; i < availableCharts.length; i++) {
		const chart = availableCharts[i]
		chartColors[chart] = CHART_COLORS[i]
	}

	const { hallmarks, rangeHallmarks } = buildProtocolOverviewHallmarks({
		hacks,
		protocolHallmarks: protocolData.hallmarks,
		dimensions: protocolData.dimensions
	})

	const name = protocolData.name ?? currentProtocolMetadata.displayName ?? ''

	const defaultToggledCharts = buildDefaultToggledCharts({
		isCEX,
		isOracleProtocol,
		protocolMetricsTvl: protocolMetrics.tvl,
		protocolTvlChartData,
		currentChainTvls: protocolData.currentChainTvls,
		availableCharts,
		category: protocolData.category
	})

	const protocolSlug = slug(currentProtocolMetadata.displayName ?? '')
	const initialMultiSeriesChartData: IProtocolOverviewPageData['initialMultiSeriesChartData'] = {}
	if (protocolTvlChartData.length > 0) {
		initialMultiSeriesChartData[isCEX ? 'Total Assets' : 'TVL'] = protocolTvlChartData
	}
	if (oracleChartData?.length) {
		initialMultiSeriesChartData['TVS'] = oracleChartData
	}

	type ChartSeries = Array<[number, number]>
	type ChartPrefetcher = () => Promise<ChartSeries | null>
	const chartPrefetchers: Partial<Record<ProtocolChartsLabels, ChartPrefetcher>> = {
		...Object.fromEntries(
			ADAPTER_CHART_DESCRIPTORS.map((descriptor) => [
				descriptor.label,
				() =>
					fetchAdapterProtocolChartData({
						...descriptor.chartRequest,
						protocol: currentProtocolMetadata.displayName ?? ''
					})
						.then((data) => normalizeChartPointsToMs(data))
						.catch(() => null)
			])
		),
		'Bridge Volume': () => Promise.resolve(normalizeBridgeVolumeToChartMs(bridgeVolumeData)),
		Treasury: () =>
			fetchProtocolTreasuryChart({ protocol: protocolSlug })
				.then((data) => normalizeChartPointsToMs(data))
				.catch(() => null),
		Staking: () =>
			fetchProtocolTvlChart({ protocol: protocolSlug, key: 'staking' })
				.then((data) => normalizeChartPointsToMs(data))
				.catch(() => null),
		Borrowed: () =>
			fetchProtocolTvlChart({ protocol: protocolSlug, key: 'borrowed' })
				.then((data) => normalizeChartPointsToMs(data))
				.catch(() => null),
		'Active Addresses': () =>
			fetchAdapterProtocolChartData({
				adapterType: 'active-users',
				protocol: currentProtocolMetadata.displayName ?? ''
			})
				.then((data) => normalizeChartPointsToMs(data))
				.catch(() => null),
		'New Addresses': () =>
			fetchAdapterProtocolChartData({
				adapterType: 'new-users',
				protocol: currentProtocolMetadata.displayName ?? ''
			})
				.then((data) => normalizeChartPointsToMs(data))
				.catch(() => null),
		Transactions: () =>
			fetchAdapterProtocolChartData({
				adapterType: 'active-users',
				protocol: currentProtocolMetadata.displayName ?? '',
				dataType: 'dailyTransactionsCount'
			})
				.then((data) => normalizeChartPointsToMs(data))
				.catch(() => null),
		'Gas Used': () =>
			fetchAdapterProtocolChartData({
				adapterType: 'active-users',
				protocol: currentProtocolMetadata.displayName ?? '',
				dataType: 'dailyGasUsed'
			})
				.then((data) => normalizeChartPointsToMs(data))
				.catch(() => null)
	}

	const missingDefaultCharts = defaultToggledCharts.filter(
		(chartLabel) => !initialMultiSeriesChartData[chartLabel] && chartPrefetchers[chartLabel]
	)
	if (missingDefaultCharts.length > 0) {
		const prefetchedDefaults = await Promise.all(
			missingDefaultCharts.map(async (chartLabel) => {
				const fetcher = chartPrefetchers[chartLabel]
				if (!fetcher) return [chartLabel, null] as const
				return [chartLabel, await fetcher()] as const
			})
		)
		for (const [chartLabel, series] of prefetchedDefaults) {
			if (series?.length) {
				initialMultiSeriesChartData[chartLabel] = series
			}
		}
	}
	const titleMetrics: string[] = []
	const seoExcludedCharts = ['Successful Proposals', 'Total Proposals', 'Max Votes']
	if (incomeStatement) {
		seoExcludedCharts.push('Fees', 'Revenue', 'Incentives', 'Holders Revenue')
	}
	const chartLabelsForSeo = availableCharts.filter((chart) => !seoExcludedCharts.includes(chart))

	let seoDescription = `Track ${name} on DefiLlama. Including ${chartLabelsForSeo.length ? chartLabelsForSeo.join(', ') : 'key onchain and financial stats'}`

	if (availableCharts.includes(isCEX ? 'Total Assets' : 'TVL')) {
		titleMetrics.push(isCEX ? 'Assets' : 'TVL')
	}
	if (availableCharts.includes('Fees')) {
		titleMetrics.push('Fees')
	}
	if (availableCharts.includes('Revenue')) {
		titleMetrics.push('Revenue')
	}
	if (availableCharts.includes('DEX Volume') || availableCharts.includes('Perp Volume')) {
		titleMetrics.push('Volume')
	}
	if (incomeStatement) {
		// titleMetrics.push('Income Statement')
		seoDescription += `, Income Statement`
		for (const type in incomeStatement.labelsByType) {
			const breakdowns = incomeStatement.labelsByType[type]?.map((label) =>
				label === 'Token Buy Back' ? 'Token Buyback' : label
			)
			if (breakdowns?.length) {
				seoDescription += `, ${type} (${breakdowns.join(', ')})`
			}
		}
	} else {
		if (availableCharts.includes('Revenue') && availableCharts.includes('Incentives')) {
			// titleMetrics.push('Earnings')
			seoDescription += `, Earnings`
		}
		if (expenses) {
			// titleMetrics.push('Expenses')
			seoDescription += `, Expenses`
		}
	}

	const titleMetricSegment =
		titleMetrics.length === 0
			? 'Stats & Charts'
			: titleMetrics.length === 1
				? `${titleMetrics[0]} Stats & Charts`
				: `${titleMetrics.slice(0, -1).join(', ')} & ${titleMetrics.at(-1)}`
	const seoTitle = `${name} ${titleMetricSegment}`

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
		tvlMethodology:
			protocolData.methodology ||
			(currentProtocolMetadata.tvl && protocolData.module !== 'dummy.js'
				? 'Total value of all coins held in the smart contracts of the protocol'
				: null),
		tvlMethodologyUrl:
			protocolData.tvlCodePath && !protocolData.tvlCodePath.endsWith('dummy.js')
				? protocolData.tvlCodePath
				: currentProtocolMetadata.tvl && protocolData.module && protocolData.module !== 'dummy.js'
					? `https://github.com/DefiLlama/DefiLlama-Adapters/tree/main/projects/${protocolData.module}`
					: null,
		treasuryMethodologyUrl: protocolData.treasuryCodePath ?? null,
		token: {
			symbol:
				protocolData.symbol && protocolData.symbol !== '-'
					? protocolData.symbol
					: (protocolData.tokenCGData?.symbol ?? null),
			gecko_id: tokenGeckoId,
			gecko_url: tokenGeckoId ? `https://www.coingecko.com/en/coins/${tokenGeckoId}` : null,
			explorer_url:
				getBlockExplorerNew({
					apiResponse: blockExplorersData,
					address: protocolData.address ?? '',
					urlType: 'token'
				})?.url ?? null
		},
		metrics: protocolMetrics,
		fees: feesData,
		revenue: revenueData,
		holdersRevenue: holdersRevenueData,
		bribeRevenue: bribesData,
		tokenTax: tokenTaxData,
		dexVolume: dexVolumeData,
		dexNotionalVolume: dexNotionalVolumeData,
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
		users:
			activeUsers || newUsers || transactions || gasUsd
				? {
						activeUsers: activeUsers ?? null,
						newUsers: newUsers ?? null,
						transactions: transactions ?? null,
						gasUsd: gasUsd ?? null
					}
				: null,
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
			protocolData.audits && +protocolData.audits > 0
				? {
						total: +protocolData.audits,
						auditLinks: protocolData.audit_links ?? [],
						note: protocolData.audit_note ?? null
					}
				: null,
		isCEX,
		hasKeyMetrics,
		competitors: competitorsList,
		hacks: hacks ?? [],
		chartDenominations,
		availableCharts,
		chartColors,
		initialMultiSeriesChartData,
		hallmarks,
		rangeHallmarks,
		geckoId: tokenGeckoId,
		governanceApis: governanceIdsToApis(protocolData.governanceID ?? []),
		incomeStatement,
		warningBanners: getProtocolWarningBanners(protocolData),
		defaultChartView:
			feesData?.defaultChartView ??
			revenueData?.defaultChartView ??
			holdersRevenueData?.defaultChartView ??
			bribesData?.defaultChartView ??
			tokenTaxData?.defaultChartView ??
			dexVolumeData?.defaultChartView ??
			dexNotionalVolumeData?.defaultChartView ??
			dexAggregatorVolumeData?.defaultChartView ??
			perpVolumeData?.defaultChartView ??
			perpAggregatorVolumeData?.defaultChartView ??
			bridgeAggregatorVolumeData?.defaultChartView ??
			optionsPremiumVolumeData?.defaultChartView ??
			optionsNotionalVolumeData?.defaultChartView ??
			'daily',
		seoTitle,
		seoDescription,
		defaultToggledCharts,
		oracleTvs,
		llamaswapChains
	}
}

function formatAdapterData({ data, methodologyKey }: { data: IAdapterProtocolMetrics; methodologyKey?: string }) {
	if (!data) {
		return null
	}

	let chainBreakdown: Record<
		string,
		{ total24h: number; total7d: number; total30d: number; totalAllTime: number }
	> | null = null
	if (data.chainBreakdown) {
		const slim: typeof chainBreakdown & {} = {}
		for (const chain in data.chainBreakdown) {
			const v = data.chainBreakdown[chain]
			slim[chain] = { total24h: v.total24h, total7d: v.total7d, total30d: v.total30d, totalAllTime: v.totalAllTime }
		}
		chainBreakdown = Object.keys(slim).length === 0 ? null : slim
	}

	const commonMethodologyMap = commonMethodology as Record<string, string>

	if (data.childProtocols?.length) {
		const childProtocols = data.childProtocols
		const childMethodologies: Array<[string, string | null, string | null]> = []
		for (const childProtocol of childProtocols) {
			if (methodologyKey && !commonMethodologyMap[methodologyKey]) {
				childMethodologies.push([
					childProtocol.displayName,
					childProtocol.methodology?.[methodologyKey] ?? null,
					childProtocol.methodologyURL ?? null
				])
			}
		}

		const areMethodologiesDifferent = new Set(childMethodologies.map((m) => m[1])).size > 1
		const topChildMethodology =
			childProtocols.length > 1 ? childMethodologies.find((m) => m[0] === childProtocols[0].displayName) : null

		return {
			total24h: data.total24h ?? null,
			total7d: data.total7d ?? null,
			total30d: data.total30d ?? null,
			totalAllTime: data.totalAllTime ?? null,
			...(methodologyKey === 'HoldersRevenue'
				? {
						methodology: methodologyKey
							? (childMethodologies.find((m) => m[1] != null)?.[1] ?? commonMethodologyMap[methodologyKey] ?? null)
							: null,
						methodologyURL: childMethodologies.find((m) => m[2] != null)?.[2] ?? null
					}
				: areMethodologiesDifferent
					? { childMethodologies: childMethodologies.filter((m) => !!(m[1] || m[2])) }
					: {
							methodology: methodologyKey
								? (topChildMethodology?.[1] ?? commonMethodologyMap[methodologyKey] ?? null)
								: null,
							methodologyURL: topChildMethodology?.[2] ?? null
						}),
			defaultChartView: data.defaultChartView ?? 'daily',
			chainBreakdown
		}
	}

	return {
		total24h: data.total24h ?? null,
		total7d: data.total7d ?? null,
		total30d: data.total30d ?? null,
		totalAllTime: data.totalAllTime ?? null,
		methodology: methodologyKey
			? (data.methodology?.[methodologyKey] ?? commonMethodologyMap[methodologyKey] ?? null)
			: null,
		methodologyURL: data.methodologyURL ?? null,
		defaultChartView: data.defaultChartView ?? 'daily',
		chainBreakdown
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
	const articlesRes = await fetchJson<IArticlesResponse>(`https://api.llama.fi/news/articles`, {
		timeout: 10_000
	}).catch((err) => {
		console.log(err)
		return { type: '', version: '', content_elements: [] }
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

function getTokenCGData(
	tokenEntry: import('~/utils/metadata/types').ITokenListEntry | null,
	tickers: CgChartResponse['data']['coinData']['tickers'] | undefined,
	cgExchangeIdentifiers: string[]
) {
	if (!tokenEntry) return null

	let cexVolume: number | null = null
	let dexVolume: number | null = null
	if (tickers) {
		const cexIds = new Set(cgExchangeIdentifiers)
		let cex = 0
		let dex = 0
		for (const t of tickers) {
			const vol = t.converted_volume?.usd ?? 0
			if (t.trust_score === 'red') continue
			if (cexIds.has(t.market?.identifier ?? '')) {
				cex += vol
			} else {
				dex += vol
			}
		}
		cexVolume = cex
		dexVolume = dex
	}

	return {
		price: {
			current: tokenEntry.current_price ?? null,
			ath: tokenEntry.ath ?? null,
			athDate: tokenEntry.ath_date ?? null,
			atl: tokenEntry.atl ?? null,
			atlDate: tokenEntry.atl_date ?? null
		},
		marketCap: { current: tokenEntry.market_cap ?? null },
		totalSupply: tokenEntry.total_supply ?? null,
		fdv: { current: tokenEntry.fully_diluted_valuation ?? null },
		volume24h: {
			total: tokenEntry.total_volume ?? null,
			cex: cexVolume,
			dex: dexVolume
		},
		symbol: tokenEntry.symbol ? tokenEntry.symbol.toUpperCase() : null
	}
}

const protocolsWithFalsyBreakdownMetrics = new Set([])

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

		type IncomeStatementData = NonNullable<IProtocolOverviewPageData['incomeStatement']>['data']
		const aggregates: IncomeStatementData =
			incomeStatement?.aggregates ??
			({
				monthly: {},
				quarterly: {},
				yearly: {},
				cumulative: {}
			} as IncomeStatementData)

		type PeriodEntry = Record<string, { value: number; 'by-label': Record<string, number> }> & { timestamp?: number }
		type AggregatesMap = Record<string, Record<string, PeriodEntry>>
		// IncomeStatementData uses a union key ('monthly' | 'quarterly' | 'yearly') which is structurally
		// compatible with Record<string, ...>, but TS doesn't allow direct assignment. We widen through
		// a single cast since the runtime shape is guaranteed to match.
		const aggregatesMap: AggregatesMap = aggregates as AggregatesMap

		if (protocolsWithFalsyBreakdownMetrics.has(metadata.displayName ?? '')) {
			for (const groupBy in aggregatesMap) {
				for (const period in aggregatesMap[groupBy]) {
					for (const label in aggregatesMap[groupBy][period]) {
						if (label === 'timestamp') continue
						const entry = aggregatesMap[groupBy][period][label]
						if (entry && typeof entry === 'object' && 'by-label' in entry) {
							entry['by-label'] = {}
						}
					}
				}
			}
		}

		const labelsByType: Record<string, Set<string>> = {}
		const metricTypes = new Set<string>()

		// Collect all breakdown labels and metric type names present in the raw aggregates.
		// The table UI renders breakdown rows based on `labelsByType`, while the Sankey reads `by-label` directly.
		// If this isn't computed, breakdown rows will be missing in the table even when `by-label` data exists.
		for (const groupBy in aggregatesMap) {
			for (const period in aggregatesMap[groupBy]) {
				aggregatesMap[groupBy][period].timestamp = period.includes('Q')
					? new Date(
							`${period.split('-')[0]}-${((parseInt(period.split('-')[1].replace('Q', '')) - 1) * 3 + 1).toString().padStart(2, '0')}`
						).getTime()
					: new Date(period.length === 4 ? `${period}-01-01` : period).getTime()

				const periodData = aggregatesMap[groupBy][period]
				for (const type in periodData) {
					if (type === 'timestamp') continue
					metricTypes.add(type)
					const byLabel = periodData?.[type]?.['by-label']
					if (!byLabel) continue
					for (const breakdownLabel in byLabel) {
						if (!labelsByType[type]) labelsByType[type] = new Set()
						labelsByType[type].add(breakdownLabel)
					}
				}
			}
		}

		const cumulativePeriod: PeriodEntry = {}
		let latestMonthlyTimestamp = 0

		for (const period in aggregatesMap.monthly ?? {}) {
			const periodData = aggregatesMap.monthly[period]
			latestMonthlyTimestamp = Math.max(latestMonthlyTimestamp, Number(periodData?.timestamp ?? 0))

			for (const label in periodData) {
				if (label === 'timestamp') continue

				const entry = periodData[label] as { value: number; 'by-label': Record<string, number> } | undefined
				if (!entry) continue

				const cumulativeEntry = cumulativePeriod[label] as
					| { value: number; 'by-label': Record<string, number> }
					| undefined

				if (!cumulativeEntry) {
					cumulativePeriod[label] = {
						value: 0,
						'by-label': {}
					}
				}

				;(cumulativePeriod[label] as { value: number; 'by-label': Record<string, number> }).value += entry.value ?? 0

				for (const breakdownLabel in entry['by-label'] ?? {}) {
					const breakdowns = (cumulativePeriod[label] as { value: number; 'by-label': Record<string, number> })[
						'by-label'
					]
					breakdowns[breakdownLabel] = (breakdowns[breakdownLabel] ?? 0) + (entry['by-label'][breakdownLabel] ?? 0)
				}
			}
		}

		if (Object.keys(cumulativePeriod).length > 0) {
			cumulativePeriod.timestamp = latestMonthlyTimestamp
			aggregatesMap.cumulative = { cumulative: cumulativePeriod }
		}

		const finalLabelsByType: Record<string, Array<string>> = {}
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

		return {
			data: aggregates,
			labelsByType: finalLabelsByType,
			methodology: methodology,
			breakdownMethodology: breakdownMethodology,
			hasOtherTokenHolderFlows: metricTypes.has('Others Token Holder Flows'),
			hasTokenHolderNetIncome: metricTypes.has('Token Holder Net Income')
		} as IProtocolOverviewPageData['incomeStatement']
	} catch (err) {
		console.log(err)
		return null
	}
}
