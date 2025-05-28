import { getBridgeOverviewPageData } from '~/containers/Bridges/queries.server'
import {
	CHAINS_ASSETS,
	CHART_API,
	PROTOCOLS_API,
	PROTOCOLS_TREASURY,
	PROTOCOL_ACTIVE_USERS_API,
	PROTOCOL_NEW_USERS_API,
	PROTOCOL_TRANSACTIONS_API,
	RAISES_API,
	REV_PROTOCOLS
} from '~/constants'
import { DEFI_SETTINGS_KEYS } from '~/contexts/LocalStorage'
import {
	getAdapterChainOverview,
	getAdapterProtocolSummary,
	getCexVolume,
	IAdapterOverview,
	IAdapterSummary
} from '~/containers/DimensionAdapters/queries'
import { getPeggedOverviewPageData } from '~/containers/Stablecoins/queries.server'
import { buildStablecoinChartData, getStablecoinDominance } from '~/containers/Stablecoins/utils'
import { getNDistinctColors, getPercentChange, slug, tokenIconUrl } from '~/utils'
import { fetchWithErrorLogging } from '~/utils/async'
import metadataCache from '~/utils/metadata'
import type {
	IChainMetadata,
	IChainOverviewData,
	IChildProtocol,
	ILiteParentProtocol,
	ILiteProtocol,
	IProtocol,
	TVL_TYPES,
	IRaises,
	ILiteChart,
	ITreasury,
	IChainAssets
} from './types'
import { formatChainAssets, toFilterProtocol, toStrikeTvl } from './utils'
import { getAnnualizedRatio } from '~/api/categories/adaptors'
import { getAllProtocolEmissions, getETFData, getProtocolEmissons } from '~/api/categories/protocols'

export async function getChainOverviewData({ chain }: { chain: string }): Promise<IChainOverviewData | null> {
	const metadata =
		chain === 'All'
			? { name: 'All', tvl: true, stablecoins: true, fees: true, dexs: true, derivatives: true }
			: metadataCache.chainMetadata[slug(chain)]

	if (!metadata) return null

	try {
		const [
			chartData,
			{ protocols, chains, fees, dexs },
			stablecoins,
			inflowsData,
			activeUsers,
			transactions,
			newUsers,
			raisesData,
			treasuriesData,
			cgData,
			nftVolumesData,
			chainAssets,
			appRevenue,
			chainFees,
			chainRevenue,
			perps,
			cexVolume,
			etfData,
			globalMcapChartData,
			rwaTvlChartData,
			upcomingUnlocks,
			chainIncentives
		]: [
			ILiteChart,
			{
				protocols: Array<IProtocol>
				chains: Array<string>
				fees: IAdapterOverview | null
				dexs: IAdapterOverview | null
			},
			{
				mcap: number | null
				change7dUsd: number | null
				change7d: string | null
				topToken: { symbol: string; mcap: number }
				dominance: string | null
				mcapChartData: Array<[number, number]> | null
			} | null,
			any,
			number | null,
			number | string,
			number | null,
			{ raises: Array<IRaises> },
			Array<ITreasury> | null,
			{
				market_data?: {
					current_price?: { usd?: string | null }
					market_cap?: { usd?: string | null }
					fully_diluted_valuation?: { usd?: string | null }
				}
			} | null,
			Record<string, number>,
			IChainAssets | null,
			IAdapterSummary | null,
			IAdapterSummary | null,
			IAdapterSummary | null,
			IAdapterOverview | null,
			number | null,
			Array<[number, number]> | null,
			Array<[number, number]> | null,
			Array<[number, { tvl: number; borrowed?: number; staking?: number; doublecounted?: number }]> | null,
			any,
			any
		] = await Promise.all([
			fetchWithErrorLogging(`${CHART_API}${chain === 'All' ? '' : `/${metadata.name}`}`).then((r) => r.json()),
			getProtocolsByChain({ chain, metadata }),
			getPeggedOverviewPageData(chain === 'All' ? null : metadata.name)
				.then((data) => {
					const { peggedAreaChartData, peggedAreaTotalData } = buildStablecoinChartData({
						chartDataByAssetOrChain: data?.chartDataByPeggedAsset,
						assetsOrChainsList: data?.peggedAssetNames,
						filteredIndexes: Object.values(data?.peggedNameToChartDataIndex || {}),
						issuanceType: 'mcap',
						selectedChain: chain === 'All' ? 'All' : metadata.name,
						doublecountedIds: data?.doublecountedIds
					})
					let totalMcapCurrent = (peggedAreaTotalData?.[peggedAreaTotalData.length - 1]?.Mcap ?? null) as number | null
					let totalMcapPrevWeek = (peggedAreaTotalData?.[peggedAreaTotalData.length - 8]?.Mcap ?? null) as number | null
					const percentChange =
						totalMcapCurrent != null && totalMcapPrevWeek != null
							? getPercentChange(totalMcapCurrent, totalMcapPrevWeek)?.toFixed(2)
							: null

					let topToken = { symbol: 'USDT', mcap: 0 }

					if (peggedAreaChartData && peggedAreaChartData.length > 0) {
						const recentMcaps = peggedAreaChartData[peggedAreaChartData.length - 1]

						for (const token in recentMcaps) {
							if (token !== 'date' && recentMcaps[token] > topToken.mcap) {
								topToken = { symbol: token, mcap: recentMcaps[token] }
							}
						}
					}

					const dominance = getStablecoinDominance(topToken, totalMcapCurrent)

					return {
						mcap: totalMcapCurrent ?? null,
						change7dUsd:
							totalMcapCurrent != null && totalMcapPrevWeek != null ? totalMcapCurrent - totalMcapPrevWeek : null,
						change7d: percentChange ?? null,
						topToken,
						dominance: dominance ?? null,
						mcapChartData:
							peggedAreaTotalData && peggedAreaTotalData.length >= 14
								? peggedAreaTotalData.slice(-14).map((p) => [+p.date * 1000, p.Mcap ?? 0] as [number, number])
								: null
					}
				})
				.catch((err) => {
					console.log('ERROR fetching stablecoins data of chain', metadata.name, err)
					return null
				}),
			!metadata.inflows
				? Promise.resolve(null)
				: getBridgeOverviewPageData(metadata.name)
						.then((data) => {
							return {
								netInflows: data?.chainVolumeData?.length
									? data.chainVolumeData[data.chainVolumeData.length - 1]['Deposits'] ?? null
									: null
							}
						})
						.catch(() => null),
			!metadata.activeUsers
				? Promise.resolve(null)
				: fetchWithErrorLogging(`${PROTOCOL_ACTIVE_USERS_API}/chain$${metadata.name}`)
						.then((res) => res.json())
						.then((data: Array<[number, number]>) => data?.[data?.length - 1]?.[1] ?? null)
						.catch(() => null),
			!metadata.activeUsers
				? Promise.resolve(null)
				: fetchWithErrorLogging(`${PROTOCOL_TRANSACTIONS_API}/chain$${metadata.name}`)
						.then((res) => res.json())
						.then((data: Array<[number, string]>) => data?.[data?.length - 1]?.[1] ?? null)
						.catch(() => null),
			!metadata.activeUsers
				? Promise.resolve(null)
				: fetchWithErrorLogging(`${PROTOCOL_NEW_USERS_API}/chain$${metadata.name}`)
						.then((res) => res.json())
						.then((data: Array<[number, number]>) => data?.[data?.length - 1]?.[1] ?? null)
						.catch(() => null),
			fetchWithErrorLogging(RAISES_API).then((r) => r.json()),
			chain === 'All' ? Promise.resolve(null) : fetchWithErrorLogging(PROTOCOLS_TREASURY).then((r) => r.json()),
			metadata.gecko_id
				? fetchWithErrorLogging(
						`https://pro-api.coingecko.com/api/v3/coins/${metadata.gecko_id}?tickers=true&community_data=false&developer_data=false&sparkline=false`,
						{
							headers: {
								'x-cg-pro-api-key': process.env.CG_KEY
							}
						}
				  ).then((res) => res.json())
				: Promise.resolve({}),
			chain && chain !== 'All'
				? fetchWithErrorLogging(`https://defillama-datasets.llama.fi/temp/chainNfts`).then((res) => res.json())
				: Promise.resolve(null),
			fetchWithErrorLogging(CHAINS_ASSETS)
				.then((res) => res.json())
				.catch(() => ({})),
			metadata.fees && chain !== 'All'
				? getAdapterChainOverview({
						type: 'fees',
						chain: metadata.name,
						excludeTotalDataChart: true,
						excludeTotalDataChartBreakdown: true,
						dataType: 'dailyAppRevenue'
				  }).catch((err) => {
						console.log(err)
						return null
				  })
				: Promise.resolve(null),
			metadata.chainFees
				? getAdapterProtocolSummary({
						type: 'fees',
						protocol: metadata.name,
						excludeTotalDataChart: true,
						excludeTotalDataChartBreakdown: true
				  }).catch((err) => {
						console.log(err)
						return null
				  })
				: Promise.resolve(null),
			metadata.chainFees
				? getAdapterProtocolSummary({
						type: 'fees',
						protocol: metadata.name,
						excludeTotalDataChart: true,
						excludeTotalDataChartBreakdown: true,
						dataType: 'dailyRevenue'
				  }).catch((err) => {
						console.log(err)
						return null
				  })
				: Promise.resolve(null),
			metadata.derivatives
				? getAdapterChainOverview({
						type: 'derivatives',
						chain: metadata.name,
						excludeTotalDataChart: true,
						excludeTotalDataChartBreakdown: true
				  }).catch((err) => {
						console.log(err)
						return null
				  })
				: Promise.resolve(null),
			getCexVolume(),
			chain === 'All'
				? getETFData()
						.then((data) => {
							const recentFlows = Object.entries(data.flows)
								.slice(-14)
								.map((item) => [
									+item[0] * 1000,
									Object.entries(item[1]).reduce((acc, curr) => {
										if (curr[0] !== 'date') {
											acc += curr[1]
										}
										return acc
									}, 0)
								])
							return recentFlows
						})
						.catch(() => null)
				: Promise.resolve(null),
			chain === 'All'
				? fetchWithErrorLogging(`https://pro-api.coingecko.com/api/v3/global/market_cap_chart?days=14`, {
						headers: {
							'x-cg-pro-api-key': process.env.CG_KEY
						}
				  })
						.then((res) => res.json())
						.then((data) => data?.market_cap_chart?.market_cap?.slice(0, 14) ?? null)
						.catch(() => null)
				: Promise.resolve(null),
			chain === 'All'
				? fetchWithErrorLogging(`https://api.llama.fi/categories`)
						.then((res) => res.json())
						.then((data) => {
							const chart = Object.entries(data.chart)

							return chart
								.slice(chart.length - 15, chart.length - 2)
								.map(([date, cat]) => [+date * 1000, cat['RWA'] ?? null])
								.filter((x) => x[1] != null)
						})
						.catch(() => null)
				: Promise.resolve(null),
			chain === 'All' ? getAllProtocolEmissions() : Promise.resolve(null),
			chain !== 'All'
				? fetchWithErrorLogging(`https://api.llama.fi/emissionsBreakdownAggregated`)
						.then((res) => res.json())
						.then(async (data) => {
							const protocolData = data.protocols.find((item) => item.chain === metadata.name)
							const protocolEmissions = await getProtocolEmissons(slug(protocolData.name))
							return {
								incentivesChart: protocolEmissions.unlockUsdChart,
								emissions24h: protocolData.emission24h,
								emissions7d: protocolData.emission7d,
								emissions30d: protocolData.emission30d
							}
						})
						.catch(() => null)
				: Promise.resolve(null)
		])

		const {
			tvl = [],
			staking = [],
			borrowed = [],
			pool2 = [],
			vesting = [],
			offers = [],
			doublecounted = [],
			liquidstaking = [],
			dcAndLsOverlap = []
		} = chartData || {}

		const tvlChart = tvl.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)]) as Array<
			[string, number]
		>

		const extraTvlChart = {
			staking: staking.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)] as [string, number]),
			borrowed: borrowed.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)] as [string, number]),
			pool2: pool2.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)] as [string, number]),
			vesting: vesting.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)] as [string, number]),
			offers: offers.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)] as [string, number]),
			doublecounted: doublecounted.map(
				([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)] as [string, number]
			),
			liquidstaking: liquidstaking.map(
				([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)] as [string, number]
			),
			dcAndLsOverlap: dcAndLsOverlap.map(
				([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)] as [string, number]
			)
		}

		const raisesChart =
			metadata.name !== 'All' && raisesData
				? (raisesData?.raises ?? []).reduce((acc, curr) => {
						if (curr.date && curr.defillamaId === `chain#${slug(metadata.name)}`) {
							acc[curr.date] = (acc[curr.date] ?? 0) + +(curr.amount ?? 0)
						}
						return acc
				  }, {} as Record<string, number>)
				: null

		const chainRaises =
			raisesData?.raises?.filter((r) => r.defillamaId === `chain#${metadata.name.toLowerCase()}`) ?? null

		const treasury =
			treasuriesData?.find(
				(t) =>
					t?.name?.toLowerCase().startsWith(`${metadata.name.toLowerCase()}`) &&
					['Services', 'Chain', 'Foundation'].includes(t?.category)
			) ?? null

		const topProtocolsByFeesChart =
			fees && fees.totalDataChartBreakdown.length > 0
				? (protocols
						.sort((a, b) => (b.fees?.total24h ?? 0) - (a.fees?.total24h ?? 0))
						.filter((a) => (a.fees?.total24h ? true : false))
						.slice(0, 14)
						.map((x) => [x.name, x.fees?.total24h ?? 0, tokenIconUrl(x.name)]) as Array<[string, number, string]>)
				: null

		const feesGenerated24h =
			fees && fees.totalDataChartBreakdown.length > 0
				? fees.protocols.reduce((acc, curr) => (acc += curr.total24h || 0), 0)
				: null

		const uniqueUnlockTokens = new Set<string>()
		let total14dUnlocks = 0
		const unlocksChart =
			upcomingUnlocks?.reduce((acc, protocol) => {
				if (protocol.tPrice && protocol.events) {
					for (const event of protocol.events) {
						if (+event.timestamp * 1e3 > Date.now() && +event.timestamp * 1e3 < Date.now() + 14 * 24 * 60 * 60 * 1000) {
							const date = new Date(event.timestamp * 1000)
							const utcTimestamp = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
							const totalTokens = event.noOfTokens.reduce((sum, amount) => sum + amount, 0)
							const valueUSD = Number((Number(totalTokens.toFixed(2)) * protocol.tPrice).toFixed(2))
							acc[utcTimestamp] = { ...(acc[utcTimestamp] || {}), [protocol.tSymbol]: valueUSD }
							uniqueUnlockTokens.add(protocol.tSymbol)
							total14dUnlocks += valueUSD
						}
					}
				}
				return acc
			}, {} as Record<string, Record<string, number>>) ?? {}
		const finalUnlocksChart = Object.entries(unlocksChart).map(([date, tokens]) => {
			const topTokens = Object.entries(tokens).sort((a, b) => b[1] - a[1]) as Array<[string, number]>
			const others = topTokens.slice(10).reduce((acc, curr) => (acc += curr[1]), 0)
			if (others) {
				uniqueUnlockTokens.add('Others')
			}
			const finalTokens = Object.fromEntries(topTokens.slice(0, 10).concat(others ? [['Others', others]] : []))
			return [+date, finalTokens]
		}) as Array<[number, Record<string, number>]>

		const chainREV =
			chainFees && fees
				? (fees?.protocols?.reduce((acc, curr) => {
						if (REV_PROTOCOLS[slug(metadata.name)]?.includes(curr.slug)) {
							acc += curr.total24h || 0
						}
						return acc
				  }, 0) ?? 0) + (chainFees?.total24h ?? 0)
				: null

		const uniqUnlockTokenColors = getNDistinctColors(uniqueUnlockTokens.size)

		return {
			chain,
			metadata,
			protocols,
			tvlChart,
			extraTvlChart,
			chainTokenInfo:
				chain !== 'All'
					? {
							gecko_id: metadata.gecko_id ?? null,
							token_symbol: metadata.tokenSymbol ?? null,
							current_price: cgData?.market_data?.current_price?.usd ?? null,
							market_cap: cgData?.market_data?.market_cap?.usd ?? null,
							fully_diluted_valuation: cgData?.market_data?.fully_diluted_valuation?.usd ?? null
					  }
					: null,
			stablecoins,
			chainFees: {
				total24h: chainFees?.total24h ?? null,
				feesGenerated24h: feesGenerated24h,
				topProtocolsChart: topProtocolsByFeesChart,
				totalREV24h: chainREV
			},
			chainRevenue: { total24h: chainRevenue?.total24h ?? null },
			appRevenue: { total24h: appRevenue?.total24h ?? null },
			dexs: {
				total24h: dexs?.total24h ?? null,
				total7d: dexs?.total7d ?? null,
				change_7dover7d: dexs?.change_7dover7d ?? null,
				dexsDominance:
					cexVolume && dexs?.total24h ? +((dexs.total24h / (cexVolume + dexs.total24h)) * 100).toFixed(2) : null,
				chart: dexs ? dexs.totalDataChart.slice(-14).map((x) => [x[0] * 1000, x[1]]) : null
			},
			perps: {
				total24h: perps?.total24h ?? null,
				total7d: perps?.total7d ?? null,
				change_7dover7d: perps?.change_7dover7d ?? null
			},
			users: { activeUsers, newUsers, transactions: transactions ? +transactions : null },
			raises: raisesChart ? Object.entries(raisesChart).map(([date, amount]) => [+date, amount]) : null,
			inflows: inflowsData,
			treasury: treasury ? { tvl: treasury.tvl ?? null, tokenBreakdowns: treasury.tokenBreakdowns ?? null } : null,
			chainRaises: chainRaises ?? null,
			chainAssets: chain !== 'All' ? formatChainAssets(chainAssets[metadata.name]) : null,
			devMetrics: null,
			nfts:
				nftVolumesData && chain !== 'All' && nftVolumesData[metadata.name.toLowerCase()]
					? { total24h: nftVolumesData[metadata.name.toLowerCase()] }
					: null,
			etfs: etfData,
			globalmcap:
				globalMcapChartData?.length > 0
					? {
							chart: globalMcapChartData,
							change7d: getPercentChange(
								globalMcapChartData[globalMcapChartData.length - 1][1],
								globalMcapChartData[globalMcapChartData.length - 7][1]
							)?.toFixed(2)
					  }
					: null,
			rwaTvlChartData,
			allChains: [{ label: 'All', to: '/' }].concat(chains.map((c) => ({ label: c, to: `/chain/${slug(c)}` }))),
			unlocks: upcomingUnlocks
				? {
						chart: finalUnlocksChart,
						total14d: total14dUnlocks,
						tokens: Array.from(uniqueUnlockTokens).map(
							(x, index) => [x, uniqUnlockTokenColors[index]] as [string, string]
						)
				  }
				: null,
			chainIncentives: chainIncentives
		}
	} catch (error) {
		const msg = `Error fetching chainOverview:${chain} ${error instanceof Error ? error.message : 'Failed to fetch'}`
		console.log(msg)
		throw new Error(msg)
	}
}

export const getProtocolsByChain = async ({ metadata, chain }: { chain: string; metadata: IChainMetadata }) => {
	const [{ protocols, chains, parentProtocols }, fees, revenue, dexs, emissionsData]: [
		{ protocols: Array<ILiteProtocol>; chains: Array<string>; parentProtocols: Array<ILiteParentProtocol> },
		IAdapterOverview | null,
		IAdapterOverview | null,
		IAdapterOverview | null,
		any
	] = await Promise.all([
		fetchWithErrorLogging(PROTOCOLS_API).then((res) => res.json()),
		metadata.fees
			? getAdapterChainOverview({
					type: 'fees',
					chain: metadata.name,
					excludeTotalDataChart: true,
					excludeTotalDataChartBreakdown: false
			  }).catch((err) => {
					console.log(err)
					return null
			  })
			: Promise.resolve(null),
		metadata.fees
			? getAdapterChainOverview({
					type: 'fees',
					chain: metadata.name,
					excludeTotalDataChart: true,
					excludeTotalDataChartBreakdown: true,
					dataType: 'dailyRevenue'
			  }).catch((err) => {
					console.log(err)
					return null
			  })
			: Promise.resolve(null),
		metadata.dexs
			? getAdapterChainOverview({
					type: 'dexs',
					chain: metadata.name,
					excludeTotalDataChart: false,
					excludeTotalDataChartBreakdown: true
			  }).catch((err) => {
					console.log(err)
					return null
			  })
			: Promise.resolve(null),
		fetchWithErrorLogging(`https://api.llama.fi/emissionsBreakdownAggregated`)
			.then((res) => res.json())
			.catch((err) => {
				console.log(err)
				return null
			})
	])

	const dimensionProtocols = {}

	for (const protocol of fees?.protocols ?? []) {
		if (protocol.total24h != null) {
			dimensionProtocols[protocol.defillamaId] = {
				...(dimensionProtocols[protocol.defillamaId] ?? {}),
				fees: {
					total24h: protocol.total24h ?? null,
					total7d: protocol.total7d ?? null,
					total30d: protocol.total30d ?? null,
					total1y: protocol.total1y ?? null,
					average1y: protocol.average1y ?? null,
					totalAllTime: protocol.totalAllTime ?? null
				}
			}
		}
	}

	for (const protocol of revenue?.protocols ?? []) {
		if (protocol.total24h != null) {
			dimensionProtocols[protocol.defillamaId] = {
				...(dimensionProtocols[protocol.defillamaId] ?? {}),
				revenue: {
					total24h: protocol.total24h ?? null,
					total7d: protocol.total7d ?? null,
					total30d: protocol.total30d ?? null,
					total1y: protocol.total1y ?? null,
					average1y: protocol.average1y ?? null,
					totalAllTime: protocol.totalAllTime ?? null
				}
			}
		}
	}

	for (const protocol of dexs?.protocols ?? []) {
		if (protocol.total24h != null) {
			dimensionProtocols[protocol.defillamaId] = {
				...(dimensionProtocols[protocol.defillamaId] ?? {}),
				dexs: {
					total24h: protocol.total24h ?? null,
					total7d: protocol.total7d ?? null,
					change_7dover7d: protocol.change_7dover7d ?? null,
					totalAllTime: protocol.totalAllTime ?? null
				}
			}
		}
	}
	const emissionsProtocols = {}
	if (emissionsData?.protocols) {
		for (const emissionProtocol of emissionsData.protocols) {
			if (
				emissionProtocol.emission24h != null ||
				emissionProtocol.emission7d != null ||
				emissionProtocol.emission30d != null ||
				emissionProtocol.emission1y != null ||
				emissionProtocol.emissionsAverage1y != null ||
				emissionProtocol.emissionsAllTime != null
			) {
				emissionsProtocols[emissionProtocol.defillamaId || emissionProtocol.name] = {
					emissions24h: emissionProtocol.emission24h ?? null,
					emissions7d: emissionProtocol.emission7d ?? null,
					emissions30d: emissionProtocol.emission30d ?? null,
					emissions1y: emissionProtocol.emission1y ?? null,
					emissionsAverage1y: emissionProtocol.emissionsAverage1y ?? null,
					emissionsAllTime: emissionProtocol.emissionsAllTime ?? null,
					name: emissionProtocol.name
				}
			}
		}
	}

	const finalProtocols: Record<string, IProtocol> = {}

	const parentStore: Record<string, Array<IChildProtocol>> = {}

	for (const protocol of protocols) {
		if (
			metadataCache.protocolMetadata[protocol.defillamaId] &&
			toFilterProtocol({
				protocolMetadata: metadataCache.protocolMetadata[protocol.defillamaId],
				protocolData: protocol,
				chainDisplayName: metadata.name
			})
		) {
			const tvls = {} as Record<
				TVL_TYPES,
				{ tvl: number; tvlPrevDay: number; tvlPrevWeek: number; tvlPrevMonth: number }
			>

			if (chain === 'All') {
				tvls.default = {
					tvl: protocol.tvl ?? null,
					tvlPrevDay: protocol.tvlPrevDay ?? null,
					tvlPrevWeek: protocol.tvlPrevWeek ?? null,
					tvlPrevMonth: protocol.tvlPrevMonth ?? null
				}
			} else {
				tvls.default = {
					tvl: protocol?.chainTvls?.[metadata.name]?.tvl ?? null,
					tvlPrevDay: protocol?.chainTvls?.[metadata.name]?.tvlPrevDay ?? null,
					tvlPrevWeek: protocol?.chainTvls?.[metadata.name]?.tvlPrevWeek ?? null,
					tvlPrevMonth: protocol?.chainTvls?.[metadata.name]?.tvlPrevMonth ?? null
				}
			}

			const tvlChange = tvls.default.tvl
				? {
						change1d: getPercentChange(tvls.default.tvl, tvls.default.tvlPrevDay),
						change7d: getPercentChange(tvls.default.tvl, tvls.default.tvlPrevWeek),
						change1m: getPercentChange(tvls.default.tvl, tvls.default.tvlPrevMonth)
				  }
				: null

			for (const chainKey in protocol.chainTvls ?? {}) {
				if (chain === 'All') {
					if (DEFI_SETTINGS_KEYS.includes(chainKey as any) || chainKey === 'excludeParent') {
						tvls[chainKey] = {
							tvl: protocol?.chainTvls?.[chainKey]?.tvl ?? null,
							tvlPrevDay: protocol?.chainTvls?.[chainKey]?.tvlPrevDay ?? null,
							tvlPrevWeek: protocol?.chainTvls?.[chainKey]?.tvlPrevWeek ?? null,
							tvlPrevMonth: protocol?.chainTvls?.[chainKey]?.tvlPrevMonth ?? null
						}
					}
				} else {
					if (chainKey.startsWith(`${metadata.name}-`)) {
						const tvlKey = chainKey.split('-')[1]
						tvls[tvlKey] = {
							tvl: protocol?.chainTvls?.[chainKey]?.tvl ?? null,
							tvlPrevDay: protocol?.chainTvls?.[chainKey]?.tvlPrevDay ?? null,
							tvlPrevWeek: protocol?.chainTvls?.[chainKey]?.tvlPrevWeek ?? null,
							tvlPrevMonth: protocol?.chainTvls?.[chainKey]?.tvlPrevMonth ?? null
						}
					}
				}
			}

			const childStore: IChildProtocol = {
				name: metadataCache.protocolMetadata[protocol.defillamaId].displayName,
				slug: metadataCache.protocolMetadata[protocol.defillamaId].name,
				chains: metadataCache.protocolMetadata[protocol.defillamaId].chains,
				category: protocol.category ?? null,
				tvl: protocol.tvl != null ? tvls : null,
				tvlChange: protocol.tvl != null ? tvlChange : null,
				mcap: protocol.mcap ?? null,
				mcaptvl: protocol.mcap && tvls?.default?.tvl ? +(protocol.mcap / tvls.default.tvl).toFixed(2) : null,
				strikeTvl: toStrikeTvl(protocol, {
					liquidstaking: tvls?.liquidstaking ? true : false,
					doublecounted: tvls?.doublecounted ? true : false
				})
			}

			if (protocol.deprecated) {
				childStore.deprecated = true
			}

			if (dimensionProtocols[protocol.defillamaId]?.fees) {
				childStore.fees = dimensionProtocols[protocol.defillamaId].fees
				childStore.fees.pf = protocol.mcap
					? getAnnualizedRatio(protocol.mcap, dimensionProtocols[protocol.defillamaId].fees.total30d)
					: null
			}

			if (dimensionProtocols[protocol.defillamaId]?.revenue) {
				childStore.revenue = dimensionProtocols[protocol.defillamaId].revenue
				childStore.revenue.ps = protocol.mcap
					? getAnnualizedRatio(protocol.mcap, dimensionProtocols[protocol.defillamaId].revenue.total30d)
					: null
			}

			if (dimensionProtocols[protocol.defillamaId]?.dexs) {
				childStore.dexs = dimensionProtocols[protocol.defillamaId].dexs
			}

			const emissionsMatch =
				emissionsProtocols[protocol.defillamaId] ||
				emissionsProtocols[metadataCache.protocolMetadata[protocol.defillamaId]?.displayName]

			if (emissionsMatch) {
				childStore.emissions = {
					total24h: emissionsMatch.emissions24h,
					total7d: emissionsMatch.emissions7d,
					total30d: emissionsMatch.emissions30d,
					total1y: emissionsMatch.emissions1y,
					average1y: emissionsMatch.emissionsAverage1y,
					totalAllTime: emissionsMatch.emissionsAllTime
				}
			}

			if (protocol.parentProtocol && metadataCache.protocolMetadata[protocol.parentProtocol]) {
				parentStore[protocol.parentProtocol] = [...(parentStore?.[protocol.parentProtocol] ?? []), childStore]
			} else {
				finalProtocols[protocol.defillamaId] = childStore
			}
		}
	}

	for (const parentProtocol of parentProtocols) {
		if (parentStore[parentProtocol.id]) {
			const parentTvl = parentStore[parentProtocol.id].some((child) => child.tvl !== null)
				? parentStore[parentProtocol.id].reduce((acc, curr) => {
						for (const key1 in curr.tvl ?? {}) {
							if (!acc[key1]) {
								acc[key1] = {}
							}
							for (const key2 in curr.tvl[key1]) {
								acc[key1][key2] = (acc[key1][key2] ?? 0) + curr.tvl[key1][key2]
							}
						}
						return acc
				  }, {} as IChildProtocol['tvl'])
				: null

			const parentFees = parentStore[parentProtocol.id].some((child) => child.fees !== null)
				? parentStore[parentProtocol.id].reduce((acc, curr) => {
						for (const key1 in curr.fees ?? {}) {
							acc[key1] = (acc[key1] ?? 0) + curr.fees[key1]
						}
						return acc
				  }, {} as IChildProtocol['fees'])
				: null

			if (parentFees) {
				parentFees.pf = getAnnualizedRatio(parentProtocol.mcap, parentFees.total30d)
			}

			const parentRevenue = parentStore[parentProtocol.id].some((child) => child.revenue !== null)
				? parentStore[parentProtocol.id].reduce((acc, curr) => {
						for (const key1 in curr.revenue ?? {}) {
							acc[key1] = (acc[key1] ?? 0) + curr.revenue[key1]
						}
						return acc
				  }, {} as IChildProtocol['revenue'])
				: null

			if (parentRevenue) {
				parentRevenue.ps = getAnnualizedRatio(parentProtocol.mcap, parentRevenue.total30d)
			}

			const parentDexs = parentStore[parentProtocol.id].some((child) => child.dexs !== null)
				? parentStore[parentProtocol.id].reduce((acc, curr) => {
						for (const key1 in curr.dexs ?? {}) {
							acc[key1] = (acc[key1] ?? 0) + curr.dexs[key1]
						}
						return acc
				  }, {} as IChildProtocol['dexs'])
				: null

			let parentEmissions = parentStore[parentProtocol.id].some((child) => child.emissions !== null)
				? parentStore[parentProtocol.id].reduce((acc, curr) => {
						for (const key1 in curr.emissions ?? {}) {
							acc[key1] = (acc[key1] ?? 0) + curr.emissions[key1]
						}
						return acc
				  }, {} as IChildProtocol['emissions'])
				: null

			if (!parentEmissions) {
				const parentEmissionsMatch = emissionsProtocols[metadataCache.protocolMetadata[parentProtocol.id]?.displayName]
				if (parentEmissionsMatch) {
					parentEmissions = {
						total24h: parentEmissionsMatch.emissions24h,
						total7d: parentEmissionsMatch.emissions7d,
						total30d: parentEmissionsMatch.emissions30d,
						total1y: parentEmissionsMatch.emissions1y,
						average1y: parentEmissionsMatch.emissionsAverage1y,
						totalAllTime: parentEmissionsMatch.emissionsAllTime
					}
				}
			}

			if (parentTvl?.excludeParent) {
				parentTvl.default.tvl -= parentTvl.excludeParent.tvl ?? 0
				parentTvl.default.tvlPrevDay -= parentTvl.excludeParent.tvlPrevDay ?? 0
				parentTvl.default.tvlPrevWeek -= parentTvl.excludeParent.tvlPrevWeek ?? 0
				parentTvl.default.tvlPrevMonth -= parentTvl.excludeParent.tvlPrevMonth ?? 0
			}

			const parentTvlChange = parentTvl?.default?.tvl
				? {
						change1d: getPercentChange(parentTvl.default.tvl, parentTvl.default.tvlPrevDay),
						change7d: getPercentChange(parentTvl.default.tvl, parentTvl.default.tvlPrevWeek),
						change1m: getPercentChange(parentTvl.default.tvl, parentTvl.default.tvlPrevMonth)
				  }
				: null

			finalProtocols[parentProtocol.id] = {
				name: metadataCache.protocolMetadata[parentProtocol.id].displayName,
				slug: metadataCache.protocolMetadata[parentProtocol.id].name,
				category: null,
				childProtocols: parentStore[parentProtocol.id],
				chains: Array.from(new Set(...parentStore[parentProtocol.id].map((p) => p.chains ?? []))),
				tvl: parentTvl,
				tvlChange: parentTvlChange,
				strikeTvl: parentStore[parentProtocol.id].some((child) => child.strikeTvl),
				mcap: parentProtocol.mcap ?? null,
				mcaptvl:
					parentProtocol.mcap && parentTvl?.default?.tvl
						? +(parentProtocol.mcap / parentTvl.default.tvl).toFixed(2)
						: null
			}

			if (parentFees) {
				finalProtocols[parentProtocol.id].fees = parentFees
			}
			if (parentRevenue) {
				finalProtocols[parentProtocol.id].revenue = parentRevenue
			}
			if (parentDexs) {
				finalProtocols[parentProtocol.id].dexs = parentDexs
			}
			if (parentEmissions) {
				finalProtocols[parentProtocol.id].emissions = parentEmissions
			}
		}
	}

	return {
		protocols: Object.values(finalProtocols).sort((a, b) => (b.tvl?.default?.tvl ?? 0) - (a.tvl?.default?.tvl ?? 0)),
		chains,
		fees,
		dexs,
		emissionsData
	}
}
