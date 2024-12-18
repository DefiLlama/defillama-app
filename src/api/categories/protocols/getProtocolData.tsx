import { last } from 'lodash'

import { formatPercentage, selectColor, slug, timeFromNow, tokenIconPaletteUrl } from '~/utils'
import { getColor } from '~/utils/getColor'
import { maxAgeForNext } from '~/api'
import { fuseProtocolData, getProtocolsRaw, getProtocolEmissons, getForkPageData } from '~/api/categories/protocols'
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
	NFT_MARKETPLACES_VOLUME_API,
	RAISES_API,
	DIMENISIONS_OVERVIEW_API,
	LIQUIDITY_API
} from '~/constants'
import { cg_volume_cexs } from '../../../pages/cexs'
import { chainCoingeckoIds } from '~/constants/chainTokens'
import { sluggify } from '~/utils/cache-client'
import protocolMetadata from 'metadata/protocols.json'
import { fetchWithErrorLogging } from '~/utils/async'

export const getProtocolDataLite = async (protocol: string, protocolRes: IProtocolResponse) => {
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
			fetchWithErrorLogging(ACTIVE_USERS_API)
				.then((res) => res.json())
				.then((data) => data?.[protocolData.id] ?? null)
				.catch(() => null),
			fetchWithErrorLogging(
				`${DIMENISIONS_OVERVIEW_API}/fees?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
			)
				.then((res) => res.json())
				.catch((err) => {
					console.log(`Couldn't fetch fees protocols list at path: ${protocol}`, 'Error:', err)
					return {}
				}),
			fetchWithErrorLogging(
				`${DIMENISIONS_OVERVIEW_API}/fees?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true&dataType=dailyRevenue`
			)
				.then((res) => res.json())
				.catch((err) => {
					console.log(`Couldn't fetch revenue protocols list at path: ${protocol}`, 'Error:', err)
					return {}
				}),
			fetchWithErrorLogging(
				`${DIMENISIONS_OVERVIEW_API}/dexs?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
			)
				.then((res) => res.json())
				.catch((err) => {
					console.log(`Couldn't fetch dex protocols list at path: ${protocol}`, 'Error:', err)
					return {}
				}),
			fetchWithErrorLogging(
				`${DIMENISIONS_OVERVIEW_API}/derivatives?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
			)
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

	const perpsData = derivatesProtocols?.protocols?.filter(
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

	const dailyRevenue = revenueData?.reduce((acc, curr) => (acc += curr.total24h || 0), 0) ?? null
	const dailyBribesRevenue = revenueData?.reduce((acc, curr) => (acc += curr.dailyBribesRevenue || 0), 0) ?? null
	const dailyTokenTaxes = revenueData?.reduce((acc, curr) => (acc += curr.dailyTokenTaxes || 0), 0) ?? null
	const dailyFees = feesData?.reduce((acc, curr) => (acc += curr.total24h || 0), 0) ?? null
	const fees30d = feesData?.reduce((acc, curr) => (acc += curr.total30d || 0), 0) ?? null
	const revenue30d = revenueData?.reduce((acc, curr) => (acc += curr.total30d || 0), 0) ?? null
	const bribesRevenue30d = revenueData?.reduce((acc, curr) => (acc += curr.bribesRevenue30d || 0), 0) ?? null
	const tokenTaxesRevenue30d = revenueData?.reduce((acc, curr) => (acc += curr.tokenTaxesRevenue30d || 0), 0) ?? null
	const dailyVolume = volumeData?.reduce((acc, curr) => (acc += curr.total24h || 0), 0) ?? null
	const allTimeFees = feesData?.reduce((acc, curr) => (acc += curr.totalAllTime || 0), 0) ?? null
	const allTimeVolume = volumeData?.reduce((acc, curr) => (acc += curr.totalAllTime || 0), 0) ?? null
	const dailyPerpsVolume =
		perpsData?.reduce((acc, curr) => {
			if (curr.total24h && curr.total24h > 0) {
				acc += curr.total24h
			}
			return acc
		}, 0) ?? null
	const allTimePerpsVolume =
		perpsData?.reduce((acc, curr) => {
			if (curr.totalAllTime && curr.totalAllTime > 0) {
				acc += curr.totalAllTime
			}
			return acc
		}, 0) ?? null

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
					tvl: protocolMetadata[protocolData.id]?.tvl ? true : false,
					devMetrics: false,
					fees: protocolMetadata[protocolData.id]?.fees ? true : false,
					revenue: protocolMetadata[protocolData.id]?.revenue ? true : false,
					dexs: protocolMetadata[protocolData.id]?.dexs ? true : false,
					perps: protocolMetadata[protocolData.id]?.perps ? true : false,
					aggregators: protocolMetadata[protocolData.id]?.aggregator ? true : false,
					perpsAggregators: protocolMetadata[protocolData.id]?.perpsAggregators ? true : false,
					options: protocolMetadata[protocolData.id]?.options ? true : false,
					medianApy: false,
					inflows: inflowsExist,
					unlocks: protocolMetadata[protocolData.id]?.unlocks ? true : false,
					bridge: protocolData.category === 'Bridge' || protocolData.category === 'Cross Chain',
					treasury: protocolMetadata[protocolData.id]?.treasury ? true : false,
					tokenLiquidity: protocolMetadata[protocolData.id]?.liquidity ? true : false,
					nftVolume: protocolMetadata[protocolData.id]?.nfts ? true : false
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
			dailyPerpsVolume,
			allTimePerpsVolume,
			controversialProposals,
			governanceApis: governanceApis.filter((x) => !!x),
			methodologyUrls: {
				tvl: protocolData.module
					? `https://github.com/DefiLlama/DefiLlama-Adapters/tree/main/projects/${protocolData.module}`
					: null,
				fees: feesData?.[0]?.methodologyURL ?? null,
				dexs: volumeData?.[0]?.methodologyURL ?? null,
				perps: perpsData?.[0]?.methodologyURL ?? null
			},
			chartDenominations,
			protocolHasForks: false,
			hacksData: null,
			dailyBribesRevenue,
			dailyTokenTaxes,
			bribesRevenue30d,
			tokenTaxesRevenue30d,
			clientSide: true
		},
		revalidate: maxAgeForNext([22])
	}
}

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
export const getProtocolData = async (protocol: string, protocolRes: IProtocolResponse) => {
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
		forks,
		hacks,
		raises,
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
		fetchArticles({ tags: protocol }).catch((err) => {
			console.log('[HTTP]:[ERROR]:[PROTOCOL_ARTICLE]:', protocol, err instanceof Error ? err.message : '')
			return []
		}),
		protocolMetadata[protocolData.id]?.expenses
			? fetchWithErrorLogging(PROTOCOLS_EXPENSES_API)
					.then((res) => res.json())
					.catch((err) => {
						console.log('[HTTP]:[ERROR]:[PROTOCOL_EXPENSES]:', protocol, err instanceof Error ? err.message : '')
						return []
					})
			: [],
		protocolMetadata[protocolData.id]?.treasury
			? fetchWithErrorLogging(PROTOCOLS_TREASURY)
					.then((res) => res.json())
					.catch((err) => {
						console.log('[HTTP]:[ERROR]:[PROTOCOL_TREASURY]:', protocol, err instanceof Error ? err.message : '')
						return []
					})
			: [],
		fetchWithErrorLogging(YIELD_POOLS_API)
			.then((res) => res.json())
			.catch((err) => {
				console.log('[HTTP]:[ERROR]:[PROTOCOL_YIELD]:', protocol, err instanceof Error ? err.message : '')
				return {}
			}),
		fetchWithErrorLogging(YIELD_CONFIG_API)
			.then((res) => res.json())
			.catch((err) => {
				console.log('[HTTP]:[ERROR]:[PROTOCOL_YIELDCONFIG]:', protocol, err instanceof Error ? err.message : '')
				return null
			}),
		protocolMetadata[protocolData.id]?.liquidity
			? fetchWithErrorLogging(LIQUIDITY_API)
					.then((res) => res.json())
					.catch((err) => {
						console.log('[HTTP]:[ERROR]:[PROTOCOL_LIQUIDITYINFO]:', protocol, err instanceof Error ? err.message : '')
						return []
					})
			: [],
		getForkPageData().catch((err) => {
			console.log('[HTTP]:[ERROR]:[PROTOCOL_FORKS]:', protocol, err instanceof Error ? err.message : '')
			return {}
		}),
		protocolMetadata[protocolData.id]?.hacks
			? fetchWithErrorLogging(HACKS_API)
					.then((res) => res.json())
					.catch((err) => {
						console.log('[HTTP]:[ERROR]:[PROTOCOL_HACKS]:', protocol, err instanceof Error ? err.message : '')
						return []
					})
			: [],
		protocolMetadata[protocolData.id]?.raises
			? fetchWithErrorLogging(RAISES_API)
					.then((res) => res.json())
					.then((r) => r.raises)
					.catch((err) => {
						console.log('[HTTP]:[ERROR]:[PROTOCOL_RAISES]:', protocol, err instanceof Error ? err.message : '')
						return []
					})
			: [],
		getColor(tokenIconPaletteUrl(protocolData.name)),
		getProtocolsRaw(),
		protocolMetadata[protocolData.id]?.activeUsers
			? fetchWithErrorLogging(ACTIVE_USERS_API)
					.then((res) => res.json())
					.then((data) => data?.[protocolData.id] ?? null)
					.catch(() => null)
			: null,
		protocolMetadata[protocolData.id]?.fees
			? fetchWithErrorLogging(
					`${DIMENISIONS_OVERVIEW_API}/fees?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
			  )
					.then((res) => res.json())
					.catch((err) => {
						console.log(`Couldn't fetch fees and revenue protocols list at path: ${protocol}`, 'Error:', err)
						return {}
					})
			: [],
		protocolMetadata[protocolData.id]?.revenue
			? fetchWithErrorLogging(
					`${DIMENISIONS_OVERVIEW_API}/fees?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true&dataType=dailyRevenue`
			  )
					.then((res) => res.json())
					.catch((err) => {
						console.log(`Couldn't fetch fees and revenue protocols list at path: ${protocol}`, 'Error:', err)
						return {}
					})
			: {},
		protocolMetadata[protocolData.id]?.dexs
			? fetchWithErrorLogging(
					`${DIMENISIONS_OVERVIEW_API}/dexs?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
			  )
					.then((res) => res.json())
					.catch((err) => {
						console.log(`Couldn't fetch dex protocols list at path: ${protocol}`, 'Error:', err)
						return {}
					})
			: {},
		protocolMetadata[protocolData.id]?.perps
			? fetchWithErrorLogging(
					`${DIMENISIONS_OVERVIEW_API}/derivatives?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
			  )
					.then((res) => res.json())
					.catch((err) => {
						console.log(`Couldn't fetch derivates protocols list at path: ${protocol}`, 'Error:', err)
						return {}
					})
			: {},
		fetchWithErrorLogging(`${YIELD_PROJECT_MEDIAN_API}/${protocol}`)
			.then((res) => res.json())
			.catch(() => {
				return { data: [] }
			}),
		protocolData.gecko_id
			? fetchWithErrorLogging(`https://fe-cache.llama.fi/cgchart/${protocolData.gecko_id}?fullChart=true`)
					.then((res) => res.json())
					.then(({ data }) => data)
					.catch(() => null as any)
			: null,
		protocolMetadata[protocolData.id]?.emissions
			? getProtocolEmissons(protocol)
			: { chartData: { documented: [], realtime: [] }, categories: { documented: [], realtime: [] } },
		fetchWithErrorLogging(devMetricsProtocolUrl)
			.then((r) => r.json())
			.catch((e) => {
				return null
			}),
		protocolMetadata[protocolData.id]?.aggregator
			? fetchWithErrorLogging(
					`${DIMENISIONS_OVERVIEW_API}/aggregators?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
			  )
					.then((res) => res.json())
					.catch((err) => {
						console.log(`Couldn't fetch options protocols list at path: ${protocol}`, 'Error:', err)
						return {}
					})
			: {},
		protocolMetadata[protocolData.id]?.options
			? fetchWithErrorLogging(
					`${DIMENISIONS_OVERVIEW_API}/options?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
			  )
					.then((res) => res.json())
					.catch((err) => {
						console.log(`Couldn't fetch options protocols list at path: ${protocol}`, 'Error:', err)
						return {}
					})
			: {},
		protocolMetadata[protocolData.id]?.perpsAggregators
			? fetchWithErrorLogging(
					`${DIMENISIONS_OVERVIEW_API}/aggregator-derivatives?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
			  )
					.then((res) => res.json())
					.catch((err) => {
						console.log(`Couldn't fetch derivatives-aggregators protocols list at path: ${protocol}`, 'Error:', err)
						return {}
					})
			: {},
		fetchGovernanceData(governanceApis)
	])

	let inflowsExist = false

	let nftDataExist = protocolMetadata[protocolData.id]?.nfts ? true : false
	let nftVolumeData = []

	if (nftDataExist) {
		nftVolumeData = await fetchWithErrorLogging(NFT_MARKETPLACES_VOLUME_API)
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

	const protocolRaises = raises?.filter((r) => r.defillamaId === protocolData.id)

	if (protocolRaises?.length > 0) {
		protocolData.raises = protocolRaises
	}

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

	const chartTypes = [
		'TVL',
		'Mcap',
		'Token Price',
		'FDV',
		'Fees',
		'Revenue',
		'Volume',
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
		'Bridge Aggregators Volume'
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

	const dailyRevenue = revenueData?.reduce((acc, curr) => (acc += curr.total24h || 0), 0) ?? null
	const dailyBribesRevenue = revenueData?.reduce((acc, curr) => (acc += curr.dailyBribesRevenue || 0), 0) ?? null
	const dailyTokenTaxes = revenueData?.reduce((acc, curr) => (acc += curr.dailyTokenTaxes || 0), 0) ?? null
	const dailyFees = feesData?.reduce((acc, curr) => (acc += curr.total24h || 0), 0) ?? null
	const fees30d = feesData?.reduce((acc, curr) => (acc += curr.total30d || 0), 0) ?? null
	const revenue30d = revenueData?.reduce((acc, curr) => (acc += curr.total30d || 0), 0) ?? null
	const bribesRevenue30d = revenueData?.reduce((acc, curr) => (acc += curr.bribesRevenue30d || 0), 0) ?? null
	const tokenTaxesRevenue30d = revenueData?.reduce((acc, curr) => (acc += curr.tokenTaxesRevenue30d || 0), 0) ?? null
	const dailyVolume = volumeData?.reduce((acc, curr) => (acc += curr.total24h || 0), 0) ?? null
	const dailyPerpsVolume = perpsData?.reduce((acc, curr) => (acc += curr.total24h || 0), 0) ?? null
	const dailyAggregatorsVolume = aggregatorsData?.reduce((acc, curr) => (acc += curr.total24h || 0), 0) ?? null
	const allTimeAggregatorsVolume = aggregatorsData?.reduce((acc, curr) => (acc += curr.totalAllTime || 0), 0) ?? null
	const dailyPerpsAggregatorVolume = perpsAggregatorData?.reduce((acc, curr) => (acc += curr.total24h || 0), 0) ?? null
	const allTimePerpsAggregatorVolume =
		perpsAggregatorData?.reduce((acc, curr) => (acc += curr.totalAllTime || 0), 0) ?? null
	const dailyOptionsVolume = optionsData?.reduce((acc, curr) => (acc += curr.total24h || 0), 0) ?? null
	const allTimeFees = feesData?.reduce((acc, curr) => (acc += curr.totalAllTime || 0), 0) ?? null
	const allTimeVolume = volumeData?.reduce((acc, curr) => (acc += curr.totalAllTime || 0), 0) ?? null
	const allTimePerpsVolume = perpsData?.reduce((acc, curr) => (acc += curr.totalAllTime || 0), 0) ?? null
	const metrics = protocolData.metrics || {}
	const treasury = treasuries.find((p) => p.id.replace('-treasury', '') === protocolData.id)
	const projectYields = yields?.data?.filter(
		({ project }) =>
			project === protocol ||
			(protocolData?.parentProtocol ? false : protocolData?.otherProtocols?.map((p) => sluggify(p)).includes(project))
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

	const tokenMcap = tokenCGData?.mcaps ? last(tokenCGData.mcaps)[1] : null
	const tokenPrice = tokenCGData?.prices ? last(tokenCGData.prices)[1] : null
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
				symbol: protocolData.symbol ?? null,
				metrics: {
					...metrics,
					tvl: protocolMetadata[protocolData.id]?.tvl ? true : false,
					devMetrics: !!devMetrics,
					fees: protocolMetadata[protocolData.id]?.fees ? true : false,
					revenue: protocolMetadata[protocolData.id]?.revenue ? true : false,
					dexs: protocolMetadata[protocolData.id]?.dexs ? true : false,
					perps: protocolMetadata[protocolData.id]?.perps ? true : false,
					aggregators: protocolMetadata[protocolData.id]?.aggregator ? true : false,
					perpsAggregators: protocolMetadata[protocolData.id]?.perpsAggregators ? true : false,
					bridgeAggregators: protocolMetadata[protocolData.id]?.bridgeAggregators ? true : false,
					options: protocolMetadata[protocolData.id]?.options ? true : false,
					medianApy: medianApy.data.length > 0,
					inflows: inflowsExist,
					unlocks: protocolMetadata[protocolData.id]?.unlocks ? true : false,
					bridge: protocolData.category === 'Bridge' || protocolData.category === 'Cross Chain',
					treasury: protocolMetadata[protocolData.id]?.treasury ? true : false,
					tokenLiquidity: protocolMetadata[protocolData.id]?.liquidity ? true : false,
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
			tokenCGData: {
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
			},
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
				perps: perpsData?.[0]?.methodologyURL ?? null
			},
			chartDenominations,
			protocolHasForks: (forks?.props?.tokens ?? []).includes(protocolData.name),
			hacksData:
				(protocolData.id
					? hacks?.filter((hack) => +hack.defillamaId === +protocolData.id)?.sort((a, b) => a.date - b.date)
					: null) ?? null,
			dailyBribesRevenue,
			dailyTokenTaxes,
			bribesRevenue30d,
			tokenTaxesRevenue30d
		},
		revalidate: maxAgeForNext([22])
	}
}
