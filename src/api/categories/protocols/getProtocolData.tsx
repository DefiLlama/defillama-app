import { formatPercentage, getNDistinctColors, slug, timeFromNow } from '~/utils'
import { maxAgeForNext } from '~/api'
import { fuseProtocolData, getProtocolsRaw } from '~/api/categories/protocols'
import { IProtocolResponse } from '~/api/types'
import { fetchArticles, IArticle } from '~/api/categories/news'
import {
	ACTIVE_USERS_API,
	PROTOCOLS_EXPENSES_API,
	PROTOCOLS_TREASURY,
	PROTOCOL_GOVERNANCE_SNAPSHOT_API,
	PROTOCOL_GOVERNANCE_COMPOUND_API,
	YIELD_CONFIG_API,
	YIELD_POOLS_API,
	PROTOCOL_GOVERNANCE_TALLY_API,
	HACKS_API,
	DEV_METRICS_API,
	NFT_MARKETPLACES_VOLUME_API,
	RAISES_API,
	DIMENISIONS_OVERVIEW_API,
	LIQUIDITY_API
} from '~/constants'
import { cg_volume_cexs } from '../../../pages/cexs'
import { chainCoingeckoIds } from '~/constants/chainTokens'
import { sluggify } from '~/utils/cache-client'
import { fetchWithErrorLogging, fetchWithTimeout } from '~/utils/async'
import metadata from '~/utils/metadata'
import { getProtocolMetrics, getProtocolPageStyles } from '~/containers/ProtocolOverview/queries'
const { protocolMetadata } = metadata

const chartTypes = [
	'TVL',
	'Mcap',
	'Token Price',
	'FDV',
	'Fees',
	'Revenue',
	'DEX Volume',
	'Perps Volume',
	'Unlocks',
	'Active Addresses',
	'New Addresses',
	'Transactions',
	'Gas Used',
	'Staking',
	'Borrowed',
	'Median APY',
	'USD Inflows',
	'Total Proposals',
	'Successful Proposals',
	'Max Votes',
	'Treasury',
	'Bridge Deposits',
	'Bridge Withdrawals',
	'Token Volume',
	'Token Liquidity',
	'Tweets',
	'Developers',
	'Contributers',
	'Devs Commits',
	'Contributers Commits',
	'NFT Volume',
	'Premium Volume',
	'Perps Aggregators Volume',
	'Bridge Aggregators Volume',
	'DEX Aggregators Volume'
]

const fetchGovernanceData = async (apis: Array<string>) => {
	const governanceData = await Promise.all(
		apis.map((gapi) =>
			gapi
				? fetchWithErrorLogging(gapi)
						.then((res) => res.json())
						.then((data) => {
							return Object.values(data.proposals)
								.sort((a, b) => (b['score_curve'] || 0) - (a['score_curve'] || 0))
								.slice(0, 3)
						})
						.catch((err) => {
							console.log(err)
							return []
						})
				: null
		)
	)

	return governanceData
}
export const getProtocolData = async (
	protocol: string,
	protocolRes: IProtocolResponse,
	isCpusHot: boolean,
	metadata: any
) => {
	if (!protocolRes) {
		return { notFound: true, props: null }
	}

	const protocolData = fuseProtocolData(protocolRes)

	const devMetricsProtocolUrl = protocolData.id?.includes('parent')
		? `${DEV_METRICS_API}/parent/${protocolData?.id?.replace('parent#', '')}.json`
		: `${DEV_METRICS_API}/${protocolData.id}.json`

	const governanceApis = (
		protocolData.governanceID?.map((gid) =>
			gid.startsWith('snapshot:')
				? `${PROTOCOL_GOVERNANCE_SNAPSHOT_API}/${gid.split('snapshot:')[1].replace(/(:|’|')/g, '/')}.json`
				: gid.startsWith('compound:')
				? `${PROTOCOL_GOVERNANCE_COMPOUND_API}/${gid.split('compound:')[1].replace(/(:|’|')/g, '/')}.json`
				: gid.startsWith('tally:')
				? `${PROTOCOL_GOVERNANCE_TALLY_API}/${gid.split('tally:')[1].replace(/(:|’|')/g, '/')}.json`
				: `${PROTOCOL_GOVERNANCE_TALLY_API}/${gid.replace(/(:|’|')/g, '/')}.json`
		) ?? []
	).map((g) => g.toLowerCase())

	const [
		articles,
		expenses,
		treasuries,
		yields,
		yieldsConfig,
		liquidityInfo,
		hacks,
		raises,
		pageStyles,
		allProtocols,
		users,
		feesProtocols,
		revenueProtocols,
		bribesProtocols,
		tokenTaxProtocols,
		volumeProtocols,
		derivatesProtocols,
		tokenCGData,
		emissions,
		devMetrics,
		aggregatorProtocols,
		optionsProtocols,
		derivatesAggregatorProtocols,
		governanceData
	]: [
		IArticle[],
		any,
		Array<{ id: string; tokenBreakdowns: { [cat: string]: number } }>,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any
	] = await Promise.all([
		!isCpusHot
			? fetchArticles({ tags: protocol }).catch((err) => {
					console.log('[HTTP]:[ERROR]:[PROTOCOL_ARTICLE]:', protocol, err instanceof Error ? err.message : '')
					return []
			  })
			: [],
		protocolMetadata[protocolData.id]?.expenses && !isCpusHot
			? fetchWithErrorLogging(PROTOCOLS_EXPENSES_API)
					.then((res) => res.json())
					.catch((err) => {
						console.log('[HTTP]:[ERROR]:[PROTOCOL_EXPENSES]:', protocol, err instanceof Error ? err.message : '')
						return []
					})
			: [],
		protocolMetadata[protocolData.id]?.treasury && !isCpusHot
			? fetchWithErrorLogging(PROTOCOLS_TREASURY)
					.then((res) => res.json())
					.catch((err) => {
						console.log('[HTTP]:[ERROR]:[PROTOCOL_TREASURY]:', protocol, err instanceof Error ? err.message : '')
						return []
					})
			: [],
		protocolMetadata[protocolData.id]?.yields && !isCpusHot
			? fetchWithErrorLogging(YIELD_POOLS_API)
					.then((res) => res.json())
					.catch((err) => {
						console.log('[HTTP]:[ERROR]:[PROTOCOL_YIELD]:', protocol, err instanceof Error ? err.message : '')
						return {}
					})
			: {},
		!isCpusHot
			? fetchWithErrorLogging(YIELD_CONFIG_API)
					.then((res) => res.json())
					.catch((err) => {
						console.log('[HTTP]:[ERROR]:[PROTOCOL_YIELDCONFIG]:', protocol, err instanceof Error ? err.message : '')
						return null
					})
			: null,
		protocolMetadata[protocolData.id]?.liquidity && !isCpusHot
			? fetchWithErrorLogging(LIQUIDITY_API)
					.then((res) => res.json())
					.catch((err) => {
						console.log('[HTTP]:[ERROR]:[PROTOCOL_LIQUIDITYINFO]:', protocol, err instanceof Error ? err.message : '')
						return []
					})
			: [],
		protocolMetadata[protocolData.id]?.hacks && !isCpusHot
			? fetchWithErrorLogging(HACKS_API)
					.then((res) => res.json())
					.catch((err) => {
						console.log('[HTTP]:[ERROR]:[PROTOCOL_HACKS]:', protocol, err instanceof Error ? err.message : '')
						return []
					})
			: [],
		protocolMetadata[protocolData.id]?.raises && !isCpusHot
			? fetchWithErrorLogging(RAISES_API)
					.then((res) => res.json())
					.then((r) => r.raises)
					.catch((err) => {
						console.log('[HTTP]:[ERROR]:[PROTOCOL_RAISES]:', protocol, err instanceof Error ? err.message : '')
						return []
					})
			: [],
		getProtocolPageStyles(protocolData.name),
		getProtocolsRaw(),
		protocolMetadata[protocolData.id]?.activeUsers && !isCpusHot
			? fetchWithTimeout(ACTIVE_USERS_API, 10_000)
					.then((res) => res.json())
					.then((data) => data?.[protocolData.id] ?? null)
					.catch(() => null)
			: null,
		protocolMetadata[protocolData.id]?.fees && !isCpusHot
			? fetchWithErrorLogging(
					`${DIMENISIONS_OVERVIEW_API}/fees?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
			  )
					.then((res) => res.json())
					.catch((err) => {
						console.log(`Couldn't fetch fees and revenue protocols list at path: ${protocol}`, 'Error:', err)
						return {}
					})
			: [],
		protocolMetadata[protocolData.id]?.revenue && !isCpusHot
			? fetchWithErrorLogging(
					`${DIMENISIONS_OVERVIEW_API}/fees?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true&dataType=dailyRevenue`
			  )
					.then((res) => res.json())
					.catch((err) => {
						console.log(`Couldn't fetch fees and revenue protocols list at path: ${protocol}`, 'Error:', err)
						return {}
					})
			: {},
		protocolMetadata[protocolData.id]?.bribeRevenue && !isCpusHot
			? fetchWithErrorLogging(
					`${DIMENISIONS_OVERVIEW_API}/fees?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true&dataType=dailyBribesRevenue`
			  )
					.then((res) => res.json())
					.catch((err) => {
						console.log(`Couldn't fetch fees and revenue protocols list at path: ${protocol}`, 'Error:', err)
						return {}
					})
			: {},
		protocolMetadata[protocolData.id]?.tokenTax && !isCpusHot
			? fetchWithErrorLogging(
					`${DIMENISIONS_OVERVIEW_API}/fees?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true&dataType=dailyTokenTaxes`
			  )
					.then((res) => res.json())
					.catch((err) => {
						console.log(`Couldn't fetch fees and revenue protocols list at path: ${protocol}`, 'Error:', err)
						return {}
					})
			: {},
		protocolMetadata[protocolData.id]?.dexs && !isCpusHot
			? fetchWithErrorLogging(
					`${DIMENISIONS_OVERVIEW_API}/dexs?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
			  )
					.then((res) => res.json())
					.catch((err) => {
						console.log(`Couldn't fetch dex protocols list at path: ${protocol}`, 'Error:', err)
						return {}
					})
			: {},
		protocolMetadata[protocolData.id]?.perps && !isCpusHot
			? fetchWithErrorLogging(
					`${DIMENISIONS_OVERVIEW_API}/derivatives?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
			  )
					.then((res) => res.json())
					.catch((err) => {
						console.log(`Couldn't fetch derivates protocols list at path: ${protocol}`, 'Error:', err)
						return {}
					})
			: {},
		/* protocolMetadata[protocolData.id]?.yields && !isCpusHot
				? fetchWithErrorLogging(`${YIELD_PROJECT_MEDIAN_API}/${protocol}`)
						.then((res) => res.json())
						.catch(() => {
							return { data: [] }
						})
				: { data: [] }, */
		protocolData.gecko_id && !isCpusHot
			? fetchWithErrorLogging(`https://fe-cache.llama.fi/cgchart/${protocolData.gecko_id}?fullChart=true`)
					.then((res) => res.json())
					.then(({ data }) => data)
					.catch(() => null as any)
			: null,
		/* protocolMetadata[protocolData.id]?.emissions && !isCpusHot
				? getProtocolEmissons(protocol)
				: { chartData: { documented: [], realtime: [] }, categories: { documented: [], realtime: [] } }, */
		{ chartData: { documented: [], realtime: [] }, categories: { documented: [], realtime: [] } },
		protocolData.github && !isCpusHot
			? fetchWithTimeout(devMetricsProtocolUrl, 10_000)
					.then((r) => r.json())
					.catch((e) => {
						return null
					})
			: null,
		protocolMetadata[protocolData.id]?.aggregator && !isCpusHot
			? fetchWithErrorLogging(
					`${DIMENISIONS_OVERVIEW_API}/aggregators?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
			  )
					.then((res) => res.json())
					.catch((err) => {
						console.log(`Couldn't fetch options protocols list at path: ${protocol}`, 'Error:', err)
						return {}
					})
			: {},
		protocolMetadata[protocolData.id]?.options && !isCpusHot
			? fetchWithErrorLogging(
					`${DIMENISIONS_OVERVIEW_API}/options?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true&dataType=dailyPremiumVolume`
			  )
					.then((res) => res.json())
					.catch((err) => {
						console.log(`Couldn't fetch options protocols list at path: ${protocol}`, 'Error:', err)
						return {}
					})
			: {},
		protocolMetadata[protocolData.id]?.perpsAggregators && !isCpusHot
			? fetchWithErrorLogging(
					`${DIMENISIONS_OVERVIEW_API}/aggregator-derivatives?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
			  )
					.then((res) => res.json())
					.catch((err) => {
						console.log(`Couldn't fetch derivatives-aggregators protocols list at path: ${protocol}`, 'Error:', err)
						return {}
					})
			: {},
		// fetchGovernanceData(!isCpusHot ? governanceApis : [])
		fetchGovernanceData([])
	])

	let inflowsExist = false

	let nftDataExist = protocolMetadata[protocolData.id]?.nfts ? true : false
	let nftVolumeData = []

	if (nftDataExist && !isCpusHot) {
		nftVolumeData = await fetchWithTimeout(NFT_MARKETPLACES_VOLUME_API, 10_000)
			.then((r) => r.json())
			.then((r) => {
				const chartByDate = r
					.filter((r) => slug(r.exchangeName) === slug(protocol))
					.map(({ day, sum, sumUsd }) => {
						return { date: day, volume: sum, volumeUsd: sumUsd }
					})
				return chartByDate
			})
			.catch(() => [])

		nftDataExist = (nftVolumeData?.length ?? 0) > 0
	}

	if (protocolRes.chainTvls) {
		Object.keys(protocolRes.chainTvls).forEach((chain) => {
			if (protocolRes.chainTvls[chain].tokensInUsd?.length > 0 && !inflowsExist) {
				inflowsExist = true
			}
			delete protocolRes.chainTvls[chain].tokensInUsd
			delete protocolRes.chainTvls[chain].tokens
		})
	}

	const protocolRaises = raises?.filter((r) => r.defillamaId === protocolData.id)

	if (protocolRaises?.length > 0) {
		protocolData.raises = protocolRaises
	}

	let controversialProposals = []

	// governanceData.forEach((item) => {
	// 	if (item && item.length > 0) {
	// 		controversialProposals = [...controversialProposals, ...item]
	// 	}
	// })

	const feesData = feesProtocols?.protocols?.filter(
		(p) => p.name === protocolData.name || p.parentProtocol === protocolData.id
	)

	const revenueData = revenueProtocols?.protocols?.filter(
		(p) => p.name === protocolData.name || p.parentProtocol === protocolData.id
	)

	const bribesData = bribesProtocols?.protocols?.filter(
		(p) => p.name === protocolData.name || p.parentProtocol === protocolData.id
	)

	const tokenTaxData = tokenTaxProtocols?.protocols?.filter(
		(p) => p.name === protocolData.name || p.parentProtocol === protocolData.id
	)

	const volumeData = volumeProtocols?.protocols?.filter(
		(p) => p.name === protocolData.name || p.parentProtocol === protocolData.id
	)

	const perpsData = derivatesProtocols?.protocols?.filter(
		(p) => p.name === protocolData.name || p.parentProtocol === protocolData.id
	)

	const aggregatorsData = aggregatorProtocols?.protocols?.filter(
		(p) => p.name === protocolData.name || p.parentProtocol === protocolData.id
	)

	const optionsData = optionsProtocols?.protocols?.filter(
		(p) => p.name === protocolData.name || p.parentProtocol === protocolData.id
	)

	const perpsAggregatorData = derivatesAggregatorProtocols?.protocols?.filter(
		(p) => p.name === protocolData.name || p.parentProtocol === protocolData.id
	)

	const backgroundColor = pageStyles['--primary-color']
	const colors = getNDistinctColors(chartTypes.length, backgroundColor)
	const colorTones = {
		...Object.fromEntries(chartTypes.map((type, index) => [type, colors[index]])),
		TVL: backgroundColor
	}

	const similarProtocols =
		allProtocols && protocolData.category
			? allProtocols.protocols
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

	const similarProtocolsSet = new Set<string>()

	const protocolsWithCommonChains = [...similarProtocols].sort((a, b) => b.commonChains - a.commonChains).slice(0, 5)

	// first 5 are the protocols that are on same chain + same category
	protocolsWithCommonChains.forEach((p) => similarProtocolsSet.add(p.name))

	// last 5 are the protocols in same category
	similarProtocols.forEach((p) => {
		if (similarProtocolsSet.size < 10) {
			similarProtocolsSet.add(p.name)
		}
	})

	const dailyRevenue = revenueData?.reduce((acc, curr) => (acc += curr.total24h || 0), 0) ?? null
	const dailyBribesRevenue = bribesData?.reduce((acc, curr) => (acc += curr.total24h || 0), 0) ?? null
	const dailyTokenTaxes = tokenTaxData?.reduce((acc, curr) => (acc += curr.total24h || 0), 0) ?? null
	const dailyFees = feesData?.reduce((acc, curr) => (acc += curr.total24h || 0), 0) ?? null
	const fees30d = feesData?.reduce((acc, curr) => (acc += curr.total30d || 0), 0) ?? null
	const revenue30d = revenueData?.reduce((acc, curr) => (acc += curr.total30d || 0), 0) ?? null
	const bribesRevenue30d = bribesData?.reduce((acc, curr) => (acc += curr.total30d || 0), 0) ?? null
	const tokenTaxesRevenue30d = tokenTaxData?.reduce((acc, curr) => (acc += curr.total30d || 0), 0) ?? null
	const dailyVolume = volumeData?.reduce((acc, curr) => (acc += curr.total24h || 0), 0) ?? null
	const dailyPerpsVolume = perpsData?.reduce((acc, curr) => (acc += curr.total24h || 0), 0) ?? null
	const dailyAggregatorsVolume = aggregatorsData?.reduce((acc, curr) => (acc += curr.total24h || 0), 0) ?? null
	const allTimeAggregatorsVolume = aggregatorsData?.reduce((acc, curr) => (acc += curr.totalAllTime || 0), 0) ?? null
	const dailyPerpsAggregatorVolume = perpsAggregatorData?.reduce((acc, curr) => (acc += curr.total24h || 0), 0) ?? null
	const allTimePerpsAggregatorVolume =
		perpsAggregatorData?.reduce((acc, curr) => (acc += curr.totalAllTime || 0), 0) ?? null
	const dailyOptionsVolume = optionsData?.reduce((acc, curr) => (acc += curr.total24h || 0), 0) ?? null
	const allTimeFees = feesData?.reduce((acc, curr) => (acc += curr.totalAllTime || 0), 0) ?? null
	const allTimeRevenue = revenueData?.reduce((acc, curr) => (acc += curr.totalAllTime || 0), 0) ?? null
	const allTimeBribesRevenue = bribesData?.reduce((acc, curr) => (acc += curr.totalAllTime || 0), 0) ?? null
	const allTimeTokenTaxesRevenue = tokenTaxData?.reduce((acc, curr) => (acc += curr.totalAllTime || 0), 0) ?? null
	const allTimeVolume = volumeData?.reduce((acc, curr) => (acc += curr.totalAllTime || 0), 0) ?? null
	const allTimePerpsVolume = perpsData?.reduce((acc, curr) => (acc += curr.totalAllTime || 0), 0) ?? null
	const metrics = protocolData.metrics || {}
	const treasury = treasuries.find((p) => p.id.replace('-treasury', '') === protocolData.id)
	const otherProtocols = protocolData?.otherProtocols?.map((p) => sluggify(p)) ?? []
	const projectYields = yields?.data?.filter(
		({ project }) => project === protocol || (protocolData?.parentProtocol ? false : otherProtocols.includes(project))
	)

	// token liquidity
	const tokenPools =
		yields?.data && yieldsConfig ? liquidityInfo.find((p) => p.id === protocolData.id)?.tokenPools ?? [] : []

	const liquidityAggregated = tokenPools.reduce((agg, pool) => {
		if (!agg[pool.project]) agg[pool.project] = {}
		agg[pool.project][pool.chain] = pool.tvlUsd + (agg[pool.project][pool.chain] ?? 0)
		return agg
	}, {} as any)

	const tokenLiquidity = yieldsConfig
		? Object.entries(liquidityAggregated)
				.filter((x) => (yieldsConfig.protocols[x[0]]?.name ? true : false))
				.map((p) => Object.entries(p[1]).map((c) => [yieldsConfig.protocols[p[0]].name, c[0], c[1]]))
				.flat()
				.sort((a, b) => b[2] - a[2])
		: []

	const protocolUpcomingEvent = emissions?.events?.find((e) => e.timestamp >= Date.now() / 1000)
	let upcomingEvent = []
	if (
		!protocolUpcomingEvent ||
		(protocolUpcomingEvent.noOfTokens.length === 1 && protocolUpcomingEvent.noOfTokens[0] === 0)
	) {
		upcomingEvent = [{ timestamp: null }]
	} else {
		const comingEvents = emissions?.events?.filter((e) => e.timestamp === protocolUpcomingEvent.timestamp) ?? []
		upcomingEvent = [...comingEvents]
	}

	const tokensUnlockedInNextEvent = upcomingEvent
		.map((x) => x.noOfTokens ?? [])
		.reduce((acc, curr) => (acc += curr.length === 2 ? curr[1] - curr[0] : curr[0]), 0)

	const tokenMcap = tokenCGData?.mcaps ? tokenCGData.mcaps[tokenCGData.mcaps.length - 1][1] : null
	const tokenPrice = tokenCGData?.prices ? tokenCGData.prices[tokenCGData.prices.length - 1][1] : null
	const tokenInfo = tokenCGData?.coinData
	const tokenValue = tokenPrice ? tokensUnlockedInNextEvent * tokenPrice : null
	const unlockPercent = tokenValue && tokenMcap ? (tokenValue / tokenMcap) * 100 : null

	const nextEventDescription = unlockPercent
		? `${formatPercentage(unlockPercent)}% ${protocolData.symbol ?? 'tokens'}`
		: tokensUnlockedInNextEvent
		? `${tokensUnlockedInNextEvent.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${
				protocolData.symbol ?? 'tokens'
		  }`
		: null

	const chartDenominations: Array<{ symbol: string; geckoId?: string | null }> = []

	if (protocolData.chains && protocolData.chains.length > 0) {
		chartDenominations.push({ symbol: 'USD', geckoId: null })

		if (chainCoingeckoIds[protocolData.chains[0]]?.geckoId) {
			chartDenominations.push(chainCoingeckoIds[protocolData.chains[0]])
		} else {
			chartDenominations.push(chainCoingeckoIds['Ethereum'])
		}
	}

	return {
		props: {
			articles,
			protocol,
			devMetrics,
			nftVolumeData,
			protocolData: {
				...protocolData,
				symbol: protocolData.symbol ?? null
			},
			backgroundColor,
			similarProtocols: Array.from(similarProtocolsSet).map((protocolName) =>
				similarProtocols.find((p) => p.name === protocolName)
			),
			chartColors: colorTones,
			users: users
				? {
						activeUsers: users.users?.value ?? null,
						newUsers: users.newUsers?.value ?? null,
						transactions: users.txs?.value ?? null,
						gasUsd: users.gasUsd?.value ?? null
				  }
				: null,
			dailyRevenue,
			dailyFees,
			allTimeFees,
			fees30d,
			revenue30d,
			dailyBribesRevenue,
			dailyTokenTaxes,
			bribesRevenue30d,
			tokenTaxesRevenue30d,
			allTimeRevenue,
			allTimeBribesRevenue,
			allTimeTokenTaxesRevenue,
			dailyVolume,
			allTimeVolume,
			dailyPerpsVolume,
			allTimePerpsVolume,
			dailyAggregatorsVolume,
			allTimeAggregatorsVolume,
			dailyPerpsAggregatorVolume,
			allTimePerpsAggregatorVolume,
			dailyOptionsVolume,
			controversialProposals,
			governanceApis: governanceApis.filter((x) => !!x),
			treasury: treasury?.tokenBreakdowns ?? null,
			yields:
				yields && yields.data && projectYields.length > 0
					? {
							noOfPoolsTracked: projectYields.length,
							averageAPY: projectYields.reduce((acc, { apy }) => acc + apy, 0) / projectYields.length
					  }
					: null,
			helperTexts: {
				fees:
					feesData?.length > 1
						? 'Sum of all fees from ' +
						  (feesData.reduce((acc, curr) => (acc = [...acc, curr.name]), []) ?? []).join(',')
						: feesData?.[0]?.methodology?.['Fees'] ?? null,
				revenue:
					revenueData?.length > 1
						? 'Sum of all revenue from ' +
						  (revenueData.reduce((acc, curr) => (acc = [...acc, curr.name]), []) ?? []).join(',')
						: revenueData?.[0]?.methodology?.['Revenue'] ?? null,
				users:
					'This only counts users that interact with protocol directly (so not through another contract, such as a dex aggregator), and only on arbitrum, avax, bsc, ethereum, xdai, optimism, polygon.'
			},
			expenses: expenses.find((e) => e.protocolId == protocolData.id) ?? null,
			tokenLiquidity,
			tokenCGData: getTokenCGData(tokenCGData),
			nextEventDescription:
				upcomingEvent[0]?.timestamp && nextEventDescription
					? `${nextEventDescription} will be unlocked ${timeFromNow(upcomingEvent[0].timestamp)}`
					: null,
			methodologyUrls: {
				tvl: protocolData.module
					? `https://github.com/DefiLlama/DefiLlama-Adapters/tree/main/projects/${protocolData.module}`
					: null,
				fees: feesData?.[0]?.methodologyURL ?? null,
				dexs: volumeData?.[0]?.methodologyURL ?? null,
				perps: perpsData?.[0]?.methodologyURL ?? null,
				treasury: protocolData.treasury
					? `https://github.com/DefiLlama/DefiLlama-Adapters/blob/main/projects/treasury/${protocolData.treasury}`
					: null,
				stablecoins: protocolData.stablecoins
					? protocolData.stablecoins
							.map(
								(name) =>
									`${name}$https://github.com/DefiLlama/peggedassets-server/blob/master/src/adapters/peggedAssets/${name}/index.ts`
							)
							.join(',')
					: null
			},
			chartDenominations,
			hacksData:
				(protocolData.id
					? hacks?.filter((hack) => +hack.defillamaId === +protocolData.id)?.sort((a, b) => a.date - b.date)
					: null) ?? null,
			clientSide: isCpusHot,
			pageStyles,
			metrics: getProtocolMetrics({ protocolData: protocolRes as any, metadata })
		},
		revalidate: maxAgeForNext([22])
	}
}

function getTokenCGData(tokenCGData: any) {
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
		}
	}
}
