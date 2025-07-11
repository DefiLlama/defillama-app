import { capitalizeFirstLetter, firstDayOfMonth, getProtocolTokenUrlOnExplorer, slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import {
	ACTIVE_USERS_API,
	BRIDGEVOLUME_API_SLUG,
	DEV_METRICS_API,
	HACKS_API,
	HOURLY_PROTOCOL_API,
	LIQUIDITY_API,
	PROTOCOL_API,
	PROTOCOL_GOVERNANCE_COMPOUND_API,
	PROTOCOL_GOVERNANCE_SNAPSHOT_API,
	PROTOCOL_GOVERNANCE_TALLY_API,
	PROTOCOLS_API,
	PROTOCOLS_EXPENSES_API,
	PROTOCOLS_TREASURY,
	YIELD_CONFIG_API,
	YIELD_POOLS_API
} from '~/constants'
import {
	IProtocolMetadata,
	IProtocolOverviewPageData,
	IProtocolPageMetrics,
	IUpdatedProtocol,
	IArticlesResponse,
	IArticle,
	IProtocolExpenses,
	IHack
} from './types'
import { getAdapterChainOverview, getAdapterProtocolSummary, IAdapterOverview } from '../DimensionAdapters/queries'
import { cg_volume_cexs } from '~/pages/cexs'
import { DEFI_SETTINGS_KEYS } from '~/contexts/LocalStorage'
import { chainCoingeckoIdsForGasNotMcap } from '~/constants/chainTokens'
import { allColors, ProtocolChartsLabels } from './Chart/constants'
import dayjs from 'dayjs'
import { getProtocolEmissons } from '~/api/categories/protocols'

export const getProtocol = async (protocolName: string): Promise<IUpdatedProtocol> => {
	const start = Date.now()
	try {
		const data: IUpdatedProtocol = await fetchJson(`${PROTOCOL_API}/${protocolName}`)

		if (!data || (data as any).statusCode === 400) {
			throw new Error((data as any).body)
		}

		let isNewlyListedProtocol = true

		Object.values(data.chainTvls).forEach((chain) => {
			if (chain.tvl?.length > 7) {
				isNewlyListedProtocol = false
			}
		})

		// if (data?.listedAt && new Date(data.listedAt * 1000).getTime() < Date.now() - 1000 * 60 * 60 * 24 * 7) {
		// 	isNewlyListedProtocol = false
		// }

		if (isNewlyListedProtocol && !data.isParentProtocol) {
			const hourlyData = await fetchJson(`${HOURLY_PROTOCOL_API}/${protocolName}`)

			return { ...hourlyData, isHourlyChart: true }
		} else return data
	} catch (e) {
		console.log(`[ERROR] [${Date.now() - start}ms] <${PROTOCOL_API}/${protocolName}>`, e)

		return null
	}
}

export const getProtocolMetrics = ({
	protocolData,
	metadata
}: {
	protocolData: IUpdatedProtocol
	metadata: IProtocolMetadata
}): IProtocolPageMetrics => {
	let inflowsExist = false
	let multipleChains = false
	let tokenBreakdownExist = false
	if (!protocolData.misrepresentedTokens) {
		for (const chain in protocolData.chainTvls ?? {}) {
			if (protocolData.chainTvls[chain].tokensInUsd?.length > 0) {
				inflowsExist = true
				break
			}
		}

		for (const chain in protocolData.chainTvls ?? {}) {
			if (protocolData.chainTvls[chain].tokens?.length > 0) {
				tokenBreakdownExist = true
				break
			}
		}
	}

	let chainsWithTvl = 0
	for (const chain in protocolData.chainTvls ?? {}) {
		if (chain.includes('-') || chain === 'offers' || DEFI_SETTINGS_KEYS.includes(chain)) {
			continue
		}
		if (protocolData.chainTvls[chain].tvl?.length > 0) {
			chainsWithTvl++
		}
		if (chainsWithTvl > 1) {
			multipleChains = true
			break
		}
	}

	const tvlTab = inflowsExist || multipleChains || tokenBreakdownExist

	return {
		tvl: metadata.tvl ? true : false,
		tvlTab,
		dexs: metadata.dexs ? true : false,
		perps: metadata.perps ? true : false,
		options: metadata.options ? true : false,
		dexAggregators: metadata.aggregator ? true : false,
		perpsAggregators: metadata.perpsAggregators ? true : false,
		bridgeAggregators: metadata.bridgeAggregators ? true : false,
		stablecoins: protocolData.stablecoins?.length > 0,
		bridge: protocolData.category === 'Bridge' || protocolData.category === 'Cross Chain Bridge',
		treasury: metadata.treasury && !protocolData.misrepresentedTokens ? true : false,
		unlocks: metadata.emissions ? true : false,
		yields: metadata.yields ? true : false,
		fees: metadata.fees ? true : false,
		revenue: metadata.revenue ? true : false,
		bribes: metadata.bribeRevenue ? true : false,
		tokenTax: metadata.tokenTax ? true : false,
		forks: metadata.forks ? true : false,
		governance: protocolData.governanceID ? true : false,
		nfts: metadata.nfts ? true : false,
		dev: protocolData.github ? true : false,
		inflows: inflowsExist,
		liquidity: metadata.liquidity ? true : false,
		activeUsers: metadata.activeUsers ? true : false
	}
}

export const getProtocolOverviewPageData = async ({
	protocolId,
	metadata
}: {
	protocolId: string
	metadata: IProtocolMetadata
}): Promise<IProtocolOverviewPageData> => {
	const [
		protocolData,
		feesProtocols,
		revenueProtocols,
		holdersRevenueProtocols,
		bribesProtocols,
		tokenTaxProtocols,
		dexVolumeProtocols,
		dexAggregatorVolumeProtocols,
		perpVolumeProtocols,
		perpAggregatorVolumeProtocols,
		bridgeAggregatorVolumeProtocols,
		optionsPremiumVolumeProtocols,
		optionsNotionalVolumeProtocols,
		treasury,
		yieldsData,
		articles,
		incentives,
		users,
		expenses,
		yieldsConfig,
		liquidityInfo,
		liteProtocolsData,
		hacksData,
		bridgeVolumeData,
		incomeStatement
	]: [
		IUpdatedProtocol & {
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
		IAdapterOverview | null,
		IAdapterOverview | null,
		IAdapterOverview | null,
		IAdapterOverview | null,
		IAdapterOverview | null,
		IAdapterOverview | null,
		IAdapterOverview | null,
		IAdapterOverview | null,
		IAdapterOverview | null,
		IAdapterOverview | null,
		IAdapterOverview | null,
		IAdapterOverview | null,
		IProtocolOverviewPageData['treasury'] | null,
		any,
		IArticle[],
		any,
		{
			activeUsers: number | null
			newUsers: number | null
			transactions: number | null
			gasUsd: number | null
		} | null,
		IProtocolExpenses,
		any,
		any,
		any,
		Array<IHack>,
		any,
		IProtocolOverviewPageData['incomeStatement']
	] = await Promise.all([
		getProtocol(metadata.name).then(async (data) => {
			try {
				const devMetricsProtocolUrl = data.id?.includes('parent')
					? `${DEV_METRICS_API}/parent/${data?.id?.replace('parent#', '')}.json`
					: `${DEV_METRICS_API}/${data.id}.json`

				const [tokenCGData, devActivity] = await Promise.all([
					data.gecko_id
						? fetchJson(`https://fe-cache.llama.fi/cgchart/${data.gecko_id}?fullChart=true`)
								.then(({ data }) => data)
								.catch(() => null as any)
						: Promise.resolve(null),
					data.github
						? await fetchJson(devMetricsProtocolUrl, { timeout: 3_000 }).catch((e) => {
								return null
						  })
						: Promise.resolve(null)
				])

				const devMetrics = devActivity?.report
					? {
							weeklyCommits: devActivity?.report?.weekly_contributers.slice(-1)[0]?.cc ?? null,
							monthlyCommits: devActivity?.report?.monthly_contributers.slice(-1)[0]?.cc ?? null,
							weeklyDevelopers: devActivity?.report?.weekly_contributers.slice(-1)[0]?.v ?? null,
							monthlyDevelopers: devActivity?.report?.monthly_contributers.slice(-1)[0]?.v ?? null,
							lastCommit: devActivity?.last_commit_update_time ?? null,
							updatedAt: devActivity?.last_report_generated_time ?? null
					  }
					: null

				return { ...data, devMetrics, tokenCGData: tokenCGData ? getTokenCGData(tokenCGData) : null }
			} catch (e) {
				console.log(e)
				return data
			}
		}),
		metadata.fees
			? getAdapterChainOverview({
					adapterType: 'fees',
					chain: 'All',
					excludeTotalDataChart: true,
					excludeTotalDataChartBreakdown: true
			  })
			: Promise.resolve(null),
		metadata.revenue
			? getAdapterChainOverview({
					adapterType: 'fees',
					dataType: 'dailyRevenue',
					chain: 'All',
					excludeTotalDataChart: true,
					excludeTotalDataChartBreakdown: true
			  })
			: Promise.resolve(null),
		metadata.holdersRevenue
			? getAdapterChainOverview({
					adapterType: 'fees',
					dataType: 'dailyHoldersRevenue',
					chain: 'All',
					excludeTotalDataChart: true,
					excludeTotalDataChartBreakdown: true
			  })
			: Promise.resolve(null),
		metadata.bribeRevenue
			? getAdapterChainOverview({
					adapterType: 'fees',
					dataType: 'dailyBribesRevenue',
					chain: 'All',
					excludeTotalDataChart: true,
					excludeTotalDataChartBreakdown: true
			  })
			: Promise.resolve(null),
		metadata.tokenTax
			? getAdapterChainOverview({
					adapterType: 'fees',
					dataType: 'dailyTokenTaxes',
					chain: 'All',
					excludeTotalDataChart: true,
					excludeTotalDataChartBreakdown: true
			  })
			: Promise.resolve(null),
		metadata.dexs
			? getAdapterChainOverview({
					adapterType: 'dexs',
					chain: 'All',
					excludeTotalDataChart: true,
					excludeTotalDataChartBreakdown: true
			  })
			: Promise.resolve(null),
		metadata.aggregator
			? getAdapterChainOverview({
					adapterType: 'aggregators',
					chain: 'All',
					excludeTotalDataChart: true,
					excludeTotalDataChartBreakdown: true
			  })
			: Promise.resolve(null),
		metadata.perps
			? getAdapterChainOverview({
					adapterType: 'derivatives',
					chain: 'All',
					excludeTotalDataChart: true,
					excludeTotalDataChartBreakdown: true
			  })
			: Promise.resolve(null),
		metadata.perpsAggregators
			? getAdapterChainOverview({
					adapterType: 'derivatives-aggregator',
					chain: 'All',
					excludeTotalDataChart: true,
					excludeTotalDataChartBreakdown: true
			  })
			: Promise.resolve(null),
		metadata.bridgeAggregators
			? getAdapterChainOverview({
					adapterType: 'bridge-aggregators',
					chain: 'All',
					excludeTotalDataChart: true,
					excludeTotalDataChartBreakdown: true
			  })
			: Promise.resolve(null),
		metadata.options
			? getAdapterChainOverview({
					adapterType: 'options',
					dataType: 'dailyPremiumVolume',
					chain: 'All',
					excludeTotalDataChart: true,
					excludeTotalDataChartBreakdown: true
			  })
			: Promise.resolve(null),
		metadata.options
			? getAdapterChainOverview({
					adapterType: 'options',
					dataType: 'dailyNotionalVolume',
					chain: 'All',
					excludeTotalDataChart: true,
					excludeTotalDataChartBreakdown: true
			  })
			: Promise.resolve(null),
		metadata.treasury
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
		metadata.yields
			? fetchJson(YIELD_POOLS_API).catch((err) => {
					console.log('[HTTP]:[ERROR]:[PROTOCOL_YIELD]:', metadata.name, err instanceof Error ? err.message : '')
					return {}
			  })
			: null,
		fetchArticles({ tags: metadata.name }).catch((err) => {
			console.log('[HTTP]:[ERROR]:[PROTOCOL_ARTICLE]:', metadata.name, err instanceof Error ? err.message : '')
			return []
		}),
		metadata?.emissions
			? fetchJson(`https://api.llama.fi/emissionsBreakdownAggregated`)
					.then((data) => {
						const protocolEmissionsData = data.protocols.find((item) =>
							protocolId.startsWith('parent#') ? item.name === metadata.displayName : item.defillamaId === protocolId
						)

						if (!protocolEmissionsData) return null

						return {
							emissions24h: protocolEmissionsData.emission24h,
							emissions7d: protocolEmissionsData.emission7d,
							emissions30d: protocolEmissionsData.emission30d,
							emissionsAllTime: protocolEmissionsData.emissionsAllTime,
							average1y: protocolEmissionsData.emissionsAverage1y,
							methodology:
								'Tokens allocated to users through liquidity mining or incentive schemes, typically as part of governance or reward mechanisms.'
						}
					})
					.catch(() => null)
			: null,
		metadata.activeUsers
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
		metadata.expenses
			? fetchJson(PROTOCOLS_EXPENSES_API)
					.then((data) => data.find((item) => item.protocolId === protocolId))
					.catch(() => {
						return null
					})
			: null,
		metadata.liquidity
			? fetchJson(YIELD_CONFIG_API).catch(() => {
					return null
			  })
			: null,
		metadata?.liquidity
			? fetchJson(LIQUIDITY_API).catch(() => {
					return []
			  })
			: [],
		fetchJson(PROTOCOLS_API).catch(() => ({ protocols: [] })),
		fetchJson(HACKS_API).catch(() => ({ hacks: [] })),
		fetchJson(`${BRIDGEVOLUME_API_SLUG}/${slug(metadata.name)}`)
			.then((data) => data.dailyVolumes || null)
			.catch(() => null),
		getProtocolIncomeStatement({ protocolId, metadata })
	])

	const feesData = formatAdapterData({
		data: feesProtocols,
		isParentProtocol: protocolData.isParentProtocol,
		methodologyKey: 'Fees',
		protocolName: metadata.displayName,
		protocolId,
		otherProtocols: protocolData.otherProtocols
	})
	const revenueData = formatAdapterData({
		data: revenueProtocols,
		isParentProtocol: protocolData.isParentProtocol,
		methodologyKey: 'Revenue',
		protocolName: metadata.displayName,
		protocolId,
		otherProtocols: protocolData.otherProtocols
	})

	const holdersRevenueData = formatAdapterData({
		data: holdersRevenueProtocols,
		isParentProtocol: protocolData.isParentProtocol,
		methodologyKey: 'HoldersRevenue',
		protocolName: metadata.displayName,
		protocolId,
		otherProtocols: protocolData.otherProtocols
	})

	const bribesData = formatAdapterData({
		data: bribesProtocols,
		isParentProtocol: protocolData.isParentProtocol,
		methodologyKey: 'BribeRevenue',
		protocolName: metadata.displayName,
		protocolId,
		otherProtocols: protocolData.otherProtocols
	})

	const tokenTaxData = formatAdapterData({
		data: tokenTaxProtocols,
		isParentProtocol: protocolData.isParentProtocol,
		methodologyKey: 'TokenTaxes',
		protocolName: metadata.displayName,
		protocolId,
		otherProtocols: protocolData.otherProtocols
	})

	const dexVolumeData = formatAdapterData({
		data: dexVolumeProtocols,
		isParentProtocol: protocolData.isParentProtocol,
		methodologyKey: 'dexs',
		protocolName: metadata.displayName,
		protocolId,
		otherProtocols: protocolData.otherProtocols
	})

	const dexAggregatorVolumeData = formatAdapterData({
		data: dexAggregatorVolumeProtocols,
		isParentProtocol: protocolData.isParentProtocol,
		methodologyKey: 'dexAggregators',
		protocolName: metadata.displayName,
		protocolId,
		otherProtocols: protocolData.otherProtocols
	})

	const perpVolumeData = formatAdapterData({
		data: perpVolumeProtocols,
		isParentProtocol: protocolData.isParentProtocol,
		methodologyKey: 'perps',
		protocolName: metadata.displayName,
		protocolId,
		otherProtocols: protocolData.otherProtocols
	})

	const perpAggregatorVolumeData = formatAdapterData({
		data: perpAggregatorVolumeProtocols,
		isParentProtocol: protocolData.isParentProtocol,
		methodologyKey: 'perpsAggregators',
		protocolName: metadata.displayName,
		protocolId,
		otherProtocols: protocolData.otherProtocols
	})

	const bridgeAggregatorVolumeData = formatAdapterData({
		data: bridgeAggregatorVolumeProtocols,
		isParentProtocol: protocolData.isParentProtocol,
		methodologyKey: 'bridgeAggregators',
		protocolName: metadata.displayName,
		protocolId,
		otherProtocols: protocolData.otherProtocols
	})

	const optionsPremiumVolumeData = formatAdapterData({
		data: optionsPremiumVolumeProtocols,
		isParentProtocol: protocolData.isParentProtocol,
		methodologyKey: 'optionsPremiumVolume',
		protocolName: metadata.displayName,
		protocolId,
		otherProtocols: protocolData.otherProtocols
	})

	const optionsNotionalVolumeData = formatAdapterData({
		data: optionsNotionalVolumeProtocols,
		isParentProtocol: protocolData.isParentProtocol,
		methodologyKey: 'optionsNotionalVolume',
		protocolName: metadata.displayName,
		protocolId,
		otherProtocols: protocolData.otherProtocols
	})

	const otherProtocols = protocolData.otherProtocols?.map((p) => slug(p)) ?? []
	const projectYields = yieldsData?.data?.filter(
		({ project }) =>
			[metadata.name, metadata.displayName].includes(project) ||
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
		yieldsData?.data && yieldsConfig ? liquidityInfo?.find((p) => p.id === protocolData.id)?.tokenPools ?? [] : []

	const liquidityAggregated = tokenPools.reduce((agg, pool) => {
		if (!agg[pool.project]) agg[pool.project] = {}
		agg[pool.project][pool.chain] = pool.tvlUsd + (agg[pool.project][pool.chain] ?? 0)
		return agg
	}, {} as any)

	const tokenLiquidity = yieldsConfig
		? (Object.entries(liquidityAggregated)
				.filter((x) => (yieldsConfig.protocols[x[0]]?.name ? true : false))
				.map((p) => Object.entries(p[1]).map((c) => [yieldsConfig.protocols[p[0]].name, c[0], c[1]]))
				.flat()
				.sort((a, b) => b[2] - a[2]) as Array<[string, string, number]>)
		: ([] as Array<[string, string, number]>)

	const raises =
		protocolData.raises
			?.sort((a, b) => a.date - b.date)
			?.map((r) => ({
				...r,
				investors: (r.leadInvestors ?? []).concat(r.otherInvestors ?? [])
			})) ?? null

	const hasKeyMetrics =
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
			? true
			: false

	const competitors =
		liteProtocolsData && protocolData.category
			? liteProtocolsData.protocols
					.filter((p) => {
						if (p.category) {
							return (
								p.category.toLowerCase() === protocolData.category.toLowerCase() &&
								p.name.toLowerCase() !== protocolData.name?.toLowerCase() &&
								p.chains.some((c) => protocolData.chains.includes(c))
							)
						} else return false
					})
					.map((p) => {
						let commonChains = 0

						protocolData?.chains?.forEach((chain) => {
							if (p.chains.includes(chain)) {
								commonChains += 1
							}
						})

						return { name: p.name, tvl: p.tvl, commonChains }
					})
					.sort((a, b) => b.tvl - a.tvl)
			: []

	const competitorsSet = new Set<string>()

	const protocolsWithCommonChains = [...competitors].sort((a, b) => b.commonChains - a.commonChains).slice(0, 5)

	// first 5 are the protocols that are on same chain + same category
	protocolsWithCommonChains.forEach((p) => competitorsSet.add(p.name))

	// last 5 are the protocols in same category
	competitors.forEach((p) => {
		if (competitorsSet.size < 10) {
			competitorsSet.add(p.name)
		}
	})

	const hacks =
		(protocolData.id
			? hacksData
					?.filter((hack) => [String(hack.defillamaId), String(hack.parentProtocolId)].includes(String(protocolId)))
					?.sort((a, b) => a.date - b.date)
			: null) ?? null

	const tvlChart = {}
	const extraTvlCharts = Object.fromEntries(DEFI_SETTINGS_KEYS.map((key) => [key, {}]))
	if (metadata.tvl) {
		for (const chain in protocolData.chainTvls ?? {}) {
			if (!protocolData.chainTvls[chain].tvl?.length) continue
			if (chain.includes('-') || chain === 'offers') continue
			if (DEFI_SETTINGS_KEYS.includes(chain)) {
				for (const item of protocolData.chainTvls[chain].tvl) {
					extraTvlCharts[chain][item.date] = (extraTvlCharts[chain][item.date] ?? 0) + item.totalLiquidityUSD
				}
			} else {
				for (const item of protocolData.chainTvls[chain].tvl) {
					tvlChart[item.date] = (tvlChart[item.date] ?? 0) + item.totalLiquidityUSD
				}
			}
		}
	}

	for (const type in extraTvlCharts) {
		let hasKeys = false

		for (const key in extraTvlCharts[type]) {
			hasKeys = true
			break
		}

		if (!hasKeys) {
			delete extraTvlCharts[type]
		}
	}

	const tvlChartData: Array<[string, number]> = []
	for (const date in tvlChart) {
		tvlChartData.push([date, tvlChart[date]])
	}

	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const { chainMetadata } = metadataCache

	const chains = []
	for (const chain in protocolData.currentChainTvls ?? {}) {
		if (chain.includes('-') || chain === 'offers') continue
		if (DEFI_SETTINGS_KEYS.includes(chain)) continue
		if (protocolData.currentChainTvls[chain] != null) {
			chains.push([chain, protocolData.currentChainTvls[chain]])
		}
	}
	const firstChain = chains.sort((a, b) => b[1] - a[1])?.[0]?.[0] ?? null
	const chartDenominations: Array<{ symbol: string; geckoId?: string | null }> = []
	if (firstChain) {
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

	if (metadata.tvl) {
		availableCharts.push('TVL')
	}

	if (protocolData.gecko_id) {
		availableCharts.push('Mcap')
		availableCharts.push('Token Price')
		availableCharts.push('Token Volume')
		availableCharts.push('Token Liquidity')
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

	if (metadata.emissions) {
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

	let inflowsExist = false
	for (const chain in protocolData.chainTvls) {
		if (protocolData.chainTvls[chain].tokensInUsd?.length) {
			inflowsExist = true
			break
		}
	}

	if (inflowsExist) {
		availableCharts.push('USD Inflows')
	}

	if (treasury) {
		availableCharts.push('Treasury')
	}

	if (metadata.activeUsers) {
		availableCharts.push('Active Addresses')
		availableCharts.push('New Addresses')
		availableCharts.push('Transactions')
		// availableCharts.push('Gas Used')
	}

	if (yields) {
		availableCharts.push('Median APY')
	}

	if (protocolData.governanceID) {
		availableCharts.push('Total Proposals')
		availableCharts.push('Successful Proposals')
		availableCharts.push('Max Votes')
	}

	if (protocolData.devMetrics) {
		availableCharts.push('Developers')
		availableCharts.push('Devs Commits')
		availableCharts.push('Contributers')
		availableCharts.push('Contributers Commits')
	}

	if (metadata.nfts) {
		availableCharts.push('NFT Volume')
	}

	const chartColors = {}
	availableCharts.forEach((chart, index) => {
		chartColors[chart] = allColors[index]
	})

	const hallmarks = {}
	for (const hack of hacks ?? []) {
		hallmarks[hack.date] = `Hack: ${hack.classification ?? ''}`
	}
	for (const mark of protocolData.hallmarks ?? []) {
		if (hallmarks[mark[0]]) {
			continue
		}
		hallmarks[mark[0]] = mark[1]
	}

	return {
		id: String(protocolData.id),
		name: protocolData.name ?? metadata.displayName ?? null,
		category: protocolData.category ?? null,
		tags: protocolData.tags ?? null,
		otherProtocols: protocolData.otherProtocols ?? null,
		deprecated: protocolData.deprecated ?? false,
		chains: protocolData.chains ?? [],
		currentTvlByChain: metadata.tvl ? protocolData.currentChainTvls ?? {} : {},
		description: protocolData.description ?? '',
		website: protocolData.referralUrl ?? protocolData.url ?? null,
		twitter: protocolData.twitter ?? null,
		github: protocolData.github
			? typeof protocolData.github === 'string'
				? [protocolData.github]
				: protocolData.github
			: null,
		methodology:
			protocolData.methodology ||
			(metadata.tvl && protocolData.module !== 'dummy.js'
				? 'Total value of all coins held in the smart contracts of the protocol'
				: null),
		methodologyURL:
			metadata.tvl && protocolData.module && protocolData.module !== 'dummy.js'
				? `https://github.com/DefiLlama/DefiLlama-Adapters/tree/main/projects/${protocolData.module}`
				: null,
		token: {
			symbol: protocolData.symbol ?? protocolData.tokenCGData?.symbol ?? null,
			gecko_id: protocolData.gecko_id ?? null,
			gecko_url: protocolData.gecko_id ? `https://www.coingecko.com/en/coins/${protocolData.gecko_id}` : null,
			explorer_url: getProtocolTokenUrlOnExplorer(protocolData.address)
		},
		metrics: getProtocolMetrics({ protocolData, metadata }),
		fees: feesData,
		revenue: revenueData,
		holdersRevenue: holdersRevenueData,
		bribeRevenue: bribesData,
		tokenTax: tokenTaxData,
		dexVolume: dexVolumeData,
		dexAggregatorVolume: dexAggregatorVolumeData,
		perpVolume: perpVolumeData,
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
		devMetrics: protocolData.devMetrics ?? null,
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
		audits:
			+protocolData.audits > 0
				? {
						total: +protocolData.audits,
						auditLinks: protocolData.audit_links ?? [],
						note: protocolData.audit_note ?? null
				  }
				: null,
		isCEX: false,
		hasKeyMetrics,
		competitors: Array.from(competitorsSet).map((protocolName) => competitors.find((p) => p.name === protocolName)),
		hacks,
		chartDenominations,
		availableCharts,
		chartColors,
		tvlChartData,
		extraTvlCharts,
		hallmarks: Object.entries(hallmarks).map(([date, event]) => [+date * 1e3, event as string]),
		geckoId: protocolData.gecko_id ?? null,
		governanceApis: governanceApis(protocolData.governanceID) ?? null,
		incomeStatement
	}
}

function formatAdapterData({
	data,
	isParentProtocol,
	methodologyKey,
	protocolName,
	protocolId,
	otherProtocols
}: {
	data: IAdapterOverview | null
	isParentProtocol: boolean
	methodologyKey?: string
	protocolName: string
	protocolId: string
	otherProtocols?: string[]
}): {
	total24h: number | null
	total30d: number | null
	totalAllTime: number | null
	methodologyURLs?: Record<string, string>
	methodology?: string | null
	methodologyURL?: string | null
	childMethodologies?: Array<[string, string | null, string | null]>
} | null {
	if (!data) {
		return null
	}

	if (isParentProtocol) {
		const childProtocols = data?.protocols?.filter((p) => p.linkedProtocols?.includes(protocolName))

		if (childProtocols?.length === 0) {
			return null
		}

		let total24h = 0
		let total30d = 0
		let totalAllTime = 0

		const childMethodologies = []
		for (const childProtocol of childProtocols) {
			total24h += childProtocol.total24h ?? 0
			total30d += childProtocol.total30d ?? 0
			totalAllTime += childProtocol.totalAllTime ?? 0

			if (methodologyKey && !commonMethodology[methodologyKey]) {
				childMethodologies.push([
					childProtocol.name,
					childProtocol.methodology?.[methodologyKey] ?? null,
					childProtocol.methodologyURL ?? null
				])
			}
		}

		const areMethodologiesDifferent = new Set(childMethodologies.map((m) => m[1])).size > 1
		const topChildMethodology =
			otherProtocols?.length > 1 ? childMethodologies.find((m) => m[0] === otherProtocols[1]) : null

		return {
			total24h,
			total30d,
			totalAllTime,
			...(areMethodologiesDifferent
				? { childMethodologies: childMethodologies.filter((m) => (m[1] || m[2] ? true : false)) }
				: {
						methodology: methodologyKey ? topChildMethodology?.[1] ?? commonMethodology[methodologyKey] ?? null : null,
						methodologyURL: topChildMethodology?.[2] ?? null
				  })
		}
	}

	const adapterProtocol = data?.protocols.find((p) => p.defillamaId === protocolId)

	if (!adapterProtocol) {
		return null
	}

	return {
		total24h: adapterProtocol.total24h ?? null,
		total30d: adapterProtocol.total30d ?? null,
		totalAllTime: adapterProtocol.totalAllTime ?? null,
		methodology: methodologyKey
			? adapterProtocol.methodology?.[methodologyKey] ?? commonMethodology[methodologyKey] ?? null
			: null,
		methodologyURL: adapterProtocol.methodologyURL ?? null
	}
}

const commonMethodology = {
	dexs: 'Volume of all spot token swaps that go through the protocol',
	dexAggregators: 'Volume of all spot token swaps that go through the protocol',
	perps: 'Notional volume of all trades in the protocol, includes leverage',
	perpsAggregators: 'Notional volume of all trades in the protocol, includes leverage',
	bridgeAggregators: 'Sum of value of all assets that were bridged through the protocol',
	optionsPremiumVolume: 'Sum of value paid buying and selling options',
	optionsNotionalVolume: 'Sum of the notional value of all options that have been traded on the protocol'
}

export const fetchArticles = async ({ tags = '', size = 2 }) => {
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

export function getTokenCGData(tokenCGData: any) {
	const tokenPrice = tokenCGData?.prices ? tokenCGData.prices[tokenCGData.prices.length - 1][1] : null
	const tokenInfo = tokenCGData?.coinData

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
							curr['trust_score'] !== 'red' && cg_volume_cexs.includes(curr.market.identifier)
								? curr.converted_volume.usd ?? 0
								: 0),
					0
				) ?? null,
			dex:
				tokenInfo?.['tickers']?.reduce(
					(acc, curr) =>
						(acc +=
							curr['trust_score'] === 'red' || cg_volume_cexs.includes(curr.market.identifier)
								? 0
								: curr.converted_volume.usd ?? 0),
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
	).map((g) => g.toLowerCase())

export async function getProtocolIncomeStatement({
	protocolId,
	metadata
}: {
	protocolId: string
	metadata: IProtocolMetadata
}): Promise<{
	feesByMonth: Record<string, number>
	revenueByMonth: Record<string, number>
	holdersRevenueByMonth: Record<string, number> | null
	incentivesByMonth: Record<string, number> | null
	monthDates: Array<[number, string]>
} | null> {
	try {
		if (!metadata.fees && !metadata.revenue) {
			return null
		}

		const [fees, revenue, holdersRevenue, incentives] = await Promise.all([
			getAdapterProtocolSummary({
				adapterType: 'fees',
				protocol: metadata.name,
				excludeTotalDataChart: false,
				excludeTotalDataChartBreakdown: true
			}),
			getAdapterProtocolSummary({
				adapterType: 'fees',
				protocol: metadata.name,
				excludeTotalDataChart: false,
				excludeTotalDataChartBreakdown: true,
				dataType: 'dailyRevenue'
			}),
			metadata.holdersRevenue
				? getAdapterProtocolSummary({
						adapterType: 'fees',
						protocol: metadata.name,
						excludeTotalDataChart: false,
						excludeTotalDataChartBreakdown: true,
						dataType: 'dailyHoldersRevenue'
				  })
				: Promise.resolve(null),
			getProtocolEmissons(metadata.name)
				.then((data) => data.unlockUsdChart ?? [])
				.then((chart) => {
					const nonZeroIndex = chart.findIndex(([_, value]) => value > 0)
					return chart.slice(nonZeroIndex)
				})
				.catch(() => [])
		])

		const feesByMonth: Record<string, number> = {}
		const revenueByMonth: Record<string, number> = {}
		const holdersRevenueByMonth: Record<string, number> = {}
		const incentivesByMonth: Record<string, number> = {}
		const monthDates = new Set<number>()

		for (const [date, value] of fees.totalDataChart ?? []) {
			const dateKey = +firstDayOfMonth(+date * 1e3) * 1e3
			feesByMonth[dateKey] = (feesByMonth[dateKey] ?? 0) + value
			monthDates.add(dateKey)
		}

		for (const [date, value] of revenue.totalDataChart ?? []) {
			const dateKey = +firstDayOfMonth(+date * 1e3) * 1e3
			revenueByMonth[dateKey] = (revenueByMonth[dateKey] ?? 0) + value
			monthDates.add(dateKey)
		}

		for (const [date, value] of holdersRevenue?.totalDataChart ?? []) {
			const dateKey = +firstDayOfMonth(+date * 1e3) * 1e3
			holdersRevenueByMonth[dateKey] = (holdersRevenueByMonth[dateKey] ?? 0) + value
			monthDates.add(dateKey)
		}

		for (const [date, value] of incentives ?? []) {
			const dateKey = +firstDayOfMonth(+date * 1e3) * 1e3
			incentivesByMonth[dateKey] = (incentivesByMonth[dateKey] ?? 0) + value
			monthDates.add(dateKey)
		}

		return {
			feesByMonth,
			revenueByMonth,
			holdersRevenueByMonth: holdersRevenue ? holdersRevenueByMonth : null,
			incentivesByMonth: incentives.length > 0 ? incentivesByMonth : null,
			monthDates: Array.from(monthDates)
				.sort((a, b) => b - a)
				.map((date) => [date, dayjs(date).format('MMM YYYY')] as [number, string])
		}
	} catch (err) {
		console.log(err)
		return null
	}
}
