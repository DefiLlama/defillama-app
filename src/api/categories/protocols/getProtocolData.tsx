import { formatPercentage, selectColor, slug, timeFromNow, tokenIconPaletteUrl } from '~/utils'
import { getColor } from '~/utils/getColor'
import { maxAgeForNext } from '~/api'
import {
	getProtocol,
	fuseProtocolData,
	getProtocolsRaw,
	getProtocolEmissons,
	getForkPageData
} from '~/api/categories/protocols'
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
	YIELD_PROJECT_MEDIAN_API,
	PROTOCOL_GOVERNANCE_TALLY_API,
	HACKS_API,
	DEV_METRICS_API,
	NFT_MARKETPLACES_STATS_API,
	NFT_MARKETPLACES_VOLUME_API
} from '~/constants'
import { fetchOverCache, fetchOverCacheJson } from '~/utils/perf'
import { cg_volume_cexs } from '../../../pages/cexs'
import { chainCoingeckoIds } from '~/constants/chainTokens'

export const getProtocolDataLite = async (protocol: string) => {
	const [protocolRes]: [IProtocolResponse] = await Promise.all([getProtocol(protocol)])

	if (!protocolRes) {
		return { notFound: true, props: null }
	}

	let inflowsExist = false

	if (protocolRes.chainTvls) {
		Object.keys(protocolRes.chainTvls).forEach((chain) => {
			if (protocolRes.chainTvls[chain].tokensInUsd?.length > 0 && !inflowsExist) {
				inflowsExist = true
			}
			delete protocolRes.chainTvls[chain].tokensInUsd
			delete protocolRes.chainTvls[chain].tokens
		})
	}

	const protocolData = fuseProtocolData(protocolRes)

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

	const [allProtocols, users, feesProtocols, revenueProtocols, volumeProtocols, derivatesProtocols] = await Promise.all(
		[
			getProtocolsRaw(),
			fetch(ACTIVE_USERS_API)
				.then((res) => res.json())
				.then((data) => data?.[protocolData.id] ?? null)
				.catch(() => null),
			null,
			fetch(`https://api.llama.fi/overview/fees?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`)
				.then((res) => res.json())
				.catch((err) => {
					console.log(`Couldn't fetch fees and revenue protocols list at path: ${protocol}`, 'Error:', err)
					return {}
				}),
			fetch(
				`https://api.llama.fi/overview/fees?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true&dataType=dailyRevenue`
			)
				.then((res) => res.json())
				.catch((err) => {
					console.log(`Couldn't fetch fees and revenue protocols list at path: ${protocol}`, 'Error:', err)
					return {}
				}),
			fetch(`https://api.llama.fi/overview/dexs?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`)
				.then((res) => res.json())
				.catch((err) => {
					console.log(`Couldn't fetch dex protocols list at path: ${protocol}`, 'Error:', err)
					return {}
				}),
			fetch(`https://api.llama.fi/overview/derivatives?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`)
				.then((res) => res.json())
				.catch((err) => {
					console.log(`Couldn't fetch derivates protocols list at path: ${protocol}`, 'Error:', err)
					return {}
				})
		]
	)
	let controversialProposals = []

	const feesData = feesProtocols?.protocols?.filter(
		(p) => p.name === protocolData.name || p.parentProtocol === protocolData.id
	)

	const revenueData = revenueProtocols?.protocols?.filter(
		(p) => p.name === protocolData.name || p.parentProtocol === protocolData.id
	)

	const volumeData = volumeProtocols?.protocols?.filter(
		(p) => p.name === protocolData.name || p.parentProtocol === protocolData.id
	)

	const derivativesData = derivatesProtocols?.protocols?.filter(
		(p) => p.name === protocolData.name || p.parentProtocol === protocolData.id
	)

	const similarProtocols =
		allProtocols && protocolData.category
			? allProtocols.protocols
					.filter((p) => {
						if (p.category) {
							return (
								p.category.toLowerCase() === protocolData.category.toLowerCase() &&
								p.name.toLowerCase() !== protocolData.name?.toLowerCase()
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

	const dailyRevenue = revenueData?.reduce((acc, curr) => (acc += curr.dailyRevenue || 0), 0) ?? null
	const dailyBribesRevenue = revenueData?.reduce((acc, curr) => (acc += curr.dailyBribesRevenue || 0), 0) ?? null
	const dailyTokenTaxes = revenueData?.reduce((acc, curr) => (acc += curr.dailyTokenTaxes || 0), 0) ?? null
	const dailyFees = feesData?.reduce((acc, curr) => (acc += curr.dailyFees || 0), 0) ?? null
	const fees30d = feesData?.reduce((acc, curr) => (acc += curr.total30d || 0), 0) ?? null
	const revenue30d = revenueData?.reduce((acc, curr) => (acc += curr.total30d || 0), 0) ?? null
	const bribesRevenue30d = revenueData?.reduce((acc, curr) => (acc += curr.bribesRevenue30d || 0), 0) ?? null
	const tokenTaxesRevenue30d = revenueData?.reduce((acc, curr) => (acc += curr.tokenTaxesRevenue30d || 0), 0) ?? null
	const dailyVolume = volumeData?.reduce((acc, curr) => (acc += curr.dailyVolume || 0), 0) ?? null
	const dailyDerivativesVolume = derivativesData?.reduce((acc, curr) => (acc += curr.dailyVolume || 0), 0) ?? null
	const allTimeFees = feesData?.reduce((acc, curr) => (acc += curr.totalAllTime || 0), 0) ?? null
	const allTimeVolume = volumeData?.reduce((acc, curr) => (acc += curr.totalAllTime || 0), 0) ?? null
	const allTimeDerivativesVolume = derivativesData?.reduce((acc, curr) => (acc += curr.totalAllTime || 0), 0) ?? null
	const metrics = protocolData.metrics || {}

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
			articles: [],
			protocol,
			devMetrics: {},
			nftVolumeData: {},
			protocolData: {
				...protocolData,
				symbol: protocolData.symbol ?? null,
				metrics: {
					...metrics,
					devMetrics: false,
					fees: metrics.fees || dailyFees || allTimeFees ? true : false,
					dexs: metrics.dexs || dailyVolume || allTimeVolume ? true : false,
					derivatives: metrics.derivatives || dailyDerivativesVolume || allTimeDerivativesVolume ? true : false,
					medianApy: false,
					inflows: inflowsExist,
					unlocks: false,
					bridge: false,
					treasury: false,
					tokenLiquidity: false,
					nftVolume: false
				}
			},
			backgroundColor: '#ffffff',
			similarProtocols: Array.from(similarProtocolsSet).map((protocolName) =>
				similarProtocols.find((p) => p.name === protocolName)
			),
			chartColors: [],
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
			dailyVolume,
			allTimeVolume,
			dailyDerivativesVolume,
			allTimeDerivativesVolume,
			controversialProposals,
			governanceApis: governanceApis.filter((x) => !!x),
			methodologyUrls: {
				tvl: protocolData.module
					? `https://github.com/DefiLlama/DefiLlama-Adapters/tree/main/projects/${protocolData.module}`
					: null,
				fees: feesData?.[0]?.methodologyURL ?? null,
				dexs: volumeData?.[0]?.methodologyURL ?? null,
				derivatives: derivativesData?.[0]?.methodologyURL ?? null
			},
			chartDenominations,
			protocolHasForks: false,
			hacksData: null,
			dailyBribesRevenue,
			dailyTokenTaxes,
			bribesRevenue30d,
			tokenTaxesRevenue30d
		},
		revalidate: maxAgeForNext([22])
	}
}

export const getProtocolData = async (protocol: string) => {
	const [
		protocolRes,
		articles,
		expenses,
		treasuries,
		yields,
		yieldsConfig,
		liquidityInfo,
		forks,
		hacks,
		nftMarketplaces
	]: [
		IProtocolResponse,
		IArticle[],
		any,
		Array<{ id: string; tokenBreakdowns: { [cat: string]: number } }>,
		any,
		any,
		any,
		any,
		any,
		any
	] = await Promise.all([
		getProtocol(protocol),
		fetchArticles({ tags: protocol }).catch((err) => {
			console.log('[HTTP]:[ERROR]:[PROTOCOL_ARTICLE]:', protocol, err instanceof Error ? err.message : '')
			return []
		}),
		fetchOverCacheJson(PROTOCOLS_EXPENSES_API).catch((err) => {
			console.log('[HTTP]:[ERROR]:[PROTOCOL_EXPENSES]:', protocol, err instanceof Error ? err.message : '')
			return []
		}),
		fetchOverCacheJson(PROTOCOLS_TREASURY).catch((err) => {
			console.log('[HTTP]:[ERROR]:[PROTOCOL_TREASURY]:', protocol, err instanceof Error ? err.message : '')
			return []
		}),
		fetchOverCacheJson(YIELD_POOLS_API).catch((err) => {
			console.log('[HTTP]:[ERROR]:[PROTOCOL_YIELD]:', protocol, err instanceof Error ? err.message : '')
			return {}
		}),
		fetchOverCacheJson(YIELD_CONFIG_API).catch((err) => {
			console.log('[HTTP]:[ERROR]:[PROTOCOL_YIELDCONFIG]:', protocol, err instanceof Error ? err.message : '')
			return null
		}),
		fetchOverCacheJson('https://defillama-datasets.llama.fi/liquidity.json').catch((err) => {
			console.log('[HTTP]:[ERROR]:[PROTOCOL_LIQUIDITYINFO]:', protocol, err instanceof Error ? err.message : '')
			return []
		}),
		getForkPageData().catch((err) => {
			console.log('[HTTP]:[ERROR]:[PROTOCOL_FORKS]:', protocol, err instanceof Error ? err.message : '')
			return {}
		}),
		fetchOverCacheJson(HACKS_API).catch((err) => {
			console.log('[HTTP]:[ERROR]:[PROTOCOL_HACKS]:', protocol, err instanceof Error ? err.message : '')
			return []
		}),
		fetchOverCache(NFT_MARKETPLACES_STATS_API)
			.then((r) => r.json())
			.catch((err) => {
				console.log('[HTTP]:[ERROR]:[PROTOCOL_NFTMARKETPLACES]:', protocol, err instanceof Error ? err.message : '')
				return []
			})
	])

	if (!protocolRes) {
		return { notFound: true, props: null }
	}

	let inflowsExist = false

	let nftDataExist = !!nftMarketplaces?.find((market) => slug(market.exchangeName) === slug(protocol))
	let nftVolumeData = []

	if (nftDataExist) {
		nftVolumeData = await fetchOverCache(NFT_MARKETPLACES_VOLUME_API)
			.then((r) => r.json())
			.then((r) => {
				const chartByDate = r
					.filter((r) => slug(r.exchangeName) === slug(protocol))
					.map(({ day, sum, sumUsd }) => {
						return { date: day, volume: sum, volumeUsd: sumUsd }
					})
				return chartByDate
			})

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

	const protocolData = fuseProtocolData(protocolRes)

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

	const devMetricsProtocolUrl = protocolData.id?.includes('parent')
		? `${DEV_METRICS_API}/parent/${protocolData?.id?.replace('parent#', '')}.json`
		: `${DEV_METRICS_API}/${protocolData.id}.json`

	const [
		backgroundColor,
		allProtocols,
		users,
		feesProtocols,
		revenueProtocols,
		volumeProtocols,
		derivatesProtocols,
		medianApy,
		tokenCGData,
		emissions,
		devMetrics
	] = await Promise.all([
		getColor(tokenIconPaletteUrl(protocolData.name)),
		getProtocolsRaw(),
		fetchOverCache(ACTIVE_USERS_API)
			.then((res) => res.json())
			.then((data) => data?.[protocolData.id] ?? null)
			.catch(() => null),
		fetchOverCache(`https://api.llama.fi/overview/fees?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`)
			.then((res) => res.json())
			.catch((err) => {
				console.log(`Couldn't fetch fees and revenue protocols list at path: ${protocol}`, 'Error:', err)
				return {}
			}),
		fetchOverCache(
			`https://api.llama.fi/overview/fees?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true&dataType=dailyRevenue`
		)
			.then((res) => res.json())
			.catch((err) => {
				console.log(`Couldn't fetch fees and revenue protocols list at path: ${protocol}`, 'Error:', err)
				return {}
			}),
		fetchOverCache(`https://api.llama.fi/overview/dexs?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`)
			.then((res) => res.json())
			.catch((err) => {
				console.log(`Couldn't fetch dex protocols list at path: ${protocol}`, 'Error:', err)
				return {}
			}),
		fetchOverCache(
			`https://api.llama.fi/overview/derivatives?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
		)
			.then((res) => res.json())
			.catch((err) => {
				console.log(`Couldn't fetch derivates protocols list at path: ${protocol}`, 'Error:', err)
				return {}
			}),
		fetchOverCache(`${YIELD_PROJECT_MEDIAN_API}/${protocol}`)
			.then((res) => res.json())
			.catch(() => {
				return { data: [] }
			}),
		protocolData.gecko_id
			? fetchOverCache(
					`https://pro-api.coingecko.com/api/v3/coins/${protocolData.gecko_id}?tickers=true&community_data=false&developer_data=false&sparkline=false&x_cg_pro_api_key=${process.env.CG_KEY}`
			  )
					.then((res) => res.json())
					.catch(() => {})
			: {},
		getProtocolEmissons(protocol),
		fetchOverCache(devMetricsProtocolUrl)
			.then((r) => r.json())
			.catch((e) => {
				return null
			})
	])

	const governanceData = await Promise.all(
		governanceApis.map((gapi) =>
			gapi
				? fetchOverCache(gapi)
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

	let controversialProposals = []

	governanceData.forEach((item) => {
		if (item && item.length > 0) {
			controversialProposals = [...controversialProposals, ...item]
		}
	})

	const feesData = feesProtocols?.protocols?.filter(
		(p) => p.name === protocolData.name || p.parentProtocol === protocolData.id
	)

	const revenueData = revenueProtocols?.protocols?.filter(
		(p) => p.name === protocolData.name || p.parentProtocol === protocolData.id
	)

	const volumeData = volumeProtocols?.protocols?.filter(
		(p) => p.name === protocolData.name || p.parentProtocol === protocolData.id
	)

	const derivativesData = derivatesProtocols?.protocols?.filter(
		(p) => p.name === protocolData.name || p.parentProtocol === protocolData.id
	)

	const chartTypes = [
		'TVL',
		'Mcap',
		'Token Price',
		'FDV',
		'Fees',
		'Revenue',
		'Volume',
		'Derivatives Volume',
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
		'NFT Volume'
	]

	const colorTones = Object.fromEntries(chartTypes.map((type, index) => [type, selectColor(index, backgroundColor)]))

	const similarProtocols =
		allProtocols && protocolData.category
			? allProtocols.protocols
					.filter((p) => {
						if (p.category) {
							return (
								p.category.toLowerCase() === protocolData.category.toLowerCase() &&
								p.name.toLowerCase() !== protocolData.name?.toLowerCase()
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

	const dailyRevenue = revenueData?.reduce((acc, curr) => (acc += curr.dailyRevenue || 0), 0) ?? null
	const dailyBribesRevenue = revenueData?.reduce((acc, curr) => (acc += curr.dailyBribesRevenue || 0), 0) ?? null
	const dailyTokenTaxes = revenueData?.reduce((acc, curr) => (acc += curr.dailyTokenTaxes || 0), 0) ?? null
	const dailyFees = feesData?.reduce((acc, curr) => (acc += curr.dailyFees || 0), 0) ?? null
	const fees30d = feesData?.reduce((acc, curr) => (acc += curr.total30d || 0), 0) ?? null
	const revenue30d = revenueData?.reduce((acc, curr) => (acc += curr.total30d || 0), 0) ?? null
	const bribesRevenue30d = revenueData?.reduce((acc, curr) => (acc += curr.bribesRevenue30d || 0), 0) ?? null
	const tokenTaxesRevenue30d = revenueData?.reduce((acc, curr) => (acc += curr.tokenTaxesRevenue30d || 0), 0) ?? null
	const dailyVolume = volumeData?.reduce((acc, curr) => (acc += curr.dailyVolume || 0), 0) ?? null
	const dailyDerivativesVolume = derivativesData?.reduce((acc, curr) => (acc += curr.dailyVolume || 0), 0) ?? null
	const allTimeFees = feesData?.reduce((acc, curr) => (acc += curr.totalAllTime || 0), 0) ?? null
	const allTimeVolume = volumeData?.reduce((acc, curr) => (acc += curr.totalAllTime || 0), 0) ?? null
	const allTimeDerivativesVolume = derivativesData?.reduce((acc, curr) => (acc += curr.totalAllTime || 0), 0) ?? null
	const metrics = protocolData.metrics || {}
	const treasury = treasuries.find((p) => p.id.replace('-treasury', '') === protocolData.id)
	const projectYields = yields?.data?.filter(({ project }) => project === protocol)

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

	const tokenValue = tokenCGData?.['market_data']?.['current_price']?.['usd']
		? tokensUnlockedInNextEvent * tokenCGData['market_data']['current_price']['usd']
		: null

	const unlockPercent =
		tokenValue && tokenCGData?.['market_data']?.['market_cap']?.['usd']
			? (tokenValue / tokenCGData['market_data']['market_cap']['usd']) * 100
			: null
	const nextEventDescription =
		tokensUnlockedInNextEvent && unlockPercent
			? `${unlockPercent ? formatPercentage(unlockPercent) + '% ' : ''}`
			: `${tokensUnlockedInNextEvent.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${
					protocolData.symbol ?? 'tokens'
			  }`

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
				symbol: protocolData.symbol ?? null,
				metrics: {
					...metrics,
					devMetrics: !!devMetrics,
					fees: metrics.fees || dailyFees || allTimeFees ? true : false,
					dexs: metrics.dexs || dailyVolume || allTimeVolume ? true : false,
					derivatives: metrics.derivatives || dailyDerivativesVolume || allTimeDerivativesVolume ? true : false,
					medianApy: medianApy.data.length > 0,
					inflows: inflowsExist,
					unlocks: emissions?.chartData?.documented?.length > 0 ? true : false,
					bridge: protocolData.category === 'Bridge' || protocolData.category === 'Cross Chain',
					treasury: treasury?.tokenBreakdowns ? true : false,
					tokenLiquidity: protocolData.symbol && tokenLiquidity.length > 0 ? true : false,
					nftVolume: nftDataExist
				}
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
			dailyVolume,
			allTimeVolume,
			dailyDerivativesVolume,
			allTimeDerivativesVolume,
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
					feesData.length > 1
						? 'Sum of all fees from ' +
						  (feesData.reduce((acc, curr) => (acc = [...acc, curr.name] || 0), []) ?? []).join(',')
						: feesData?.[0]?.methodology?.['Fees'] ?? null,
				revenue:
					revenueData.length > 1
						? 'Sum of all revenue from ' +
						  (revenueData.reduce((acc, curr) => (acc = [...acc, curr.name] || 0), []) ?? []).join(',')
						: revenueData?.[0]?.methodology?.['Revenue'] ?? null,
				users:
					'This only counts users that interact with protocol directly (so not through another contract, such as a dex aggregator), and only on arbitrum, avax, bsc, ethereum, xdai, optimism, polygon.'
			},
			expenses: expenses.find((e) => e.protocolId == protocolData.id) ?? null,
			tokenLiquidity,
			tokenCGData: {
				price: {
					current: tokenCGData?.['market_data']?.['current_price']?.['usd'] ?? null,
					ath: tokenCGData?.['market_data']?.['ath']?.['usd'] ?? null,
					athDate: tokenCGData?.['market_data']?.['ath_date']?.['usd'] ?? null,
					atl: tokenCGData?.['market_data']?.['atl']?.['usd'] ?? null,
					atlDate: tokenCGData?.['market_data']?.['atl_date']?.['usd'] ?? null
				},
				marketCap: { current: tokenCGData?.['market_data']?.['market_cap']?.['usd'] ?? null },
				totalSupply: tokenCGData?.['market_data']?.['total_supply'] ?? null,
				fdv: { current: tokenCGData?.['market_data']?.['fully_diluted_valuation']?.['usd'] ?? null },
				volume24h: {
					total: tokenCGData?.['market_data']?.['total_volume']?.['usd'] ?? null,
					cex:
						tokenCGData?.['tickers']?.reduce(
							(acc, curr) =>
								(acc +=
									curr['trust_score'] !== 'red' && cg_volume_cexs.includes(curr.market.identifier)
										? curr.converted_volume.usd ?? 0
										: 0),
							0
						) ?? null,
					dex:
						tokenCGData?.['tickers']?.reduce(
							(acc, curr) =>
								(acc +=
									curr['trust_score'] === 'red' || cg_volume_cexs.includes(curr.market.identifier)
										? 0
										: curr.converted_volume.usd ?? 0),
							0
						) ?? null
				}
			},
			nextEventDescription: upcomingEvent[0]?.timestamp
				? `${nextEventDescription} will be unlocked ${timeFromNow(upcomingEvent[0].timestamp)}`
				: null,
			methodologyUrls: {
				tvl: protocolData.module
					? `https://github.com/DefiLlama/DefiLlama-Adapters/tree/main/projects/${protocolData.module}`
					: null,
				fees: feesData?.[0]?.methodologyURL ?? null,
				dexs: volumeData?.[0]?.methodologyURL ?? null,
				derivatives: derivativesData?.[0]?.methodologyURL ?? null
			},
			chartDenominations,
			protocolHasForks: (forks?.props?.tokens ?? []).includes(protocolData.name),
			hacksData: (protocolData.id ? hacks?.find((hack) => hack.defillamaId === protocolData.id) : null) ?? null,
			dailyBribesRevenue,
			dailyTokenTaxes,
			bribesRevenue30d,
			tokenTaxesRevenue30d
		},
		revalidate: maxAgeForNext([22])
	}
}
