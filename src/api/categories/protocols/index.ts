import { capitalizeFirstLetter, getColorFromNumber, standardizeProtocolName } from '~/utils'
import type { IFusedProtocolData, IOracleProtocols, IProtocolResponse } from '~/api/types'
import {
	ACTIVE_USERS_API,
	CATEGORY_API,
	FORK_API,
	HOURLY_PROTOCOL_API,
	ORACLE_API,
	PROTOCOLS_API,
	PROTOCOL_API,
	PROTOCOL_EMISSIONS_API,
	PROTOCOL_EMISSIONS_LIST_API,
	PROTOCOL_EMISSION_API,
	YIELD_POOLS_API,
	LSD_RATES_API
} from '~/constants'
import { BasicPropsToKeep, formatProtocolsData } from './utils'
import {
	getChainPageData as getChainPageDataByType,
	getChainsPageData as getChainsPageDataByType
} from '~/api/categories/adaptors'
import { getPeggedAssets } from '../stablecoins'
import { fetchWithErrorLogging } from '~/utils/async'
import { fetchOverCache, fetchOverCacheJson } from '~/utils/perf'

export const getProtocolsRaw = () => fetchWithErrorLogging(PROTOCOLS_API).then((r) => r.json())

export const getProtocols = () =>
	fetchWithErrorLogging(PROTOCOLS_API)
		.then((r) => r.json())
		.then(({ protocols, chains, parentProtocols }) => ({
			protocolsDict: protocols.reduce((acc, curr) => {
				acc[standardizeProtocolName(curr.name)] = curr
				return acc
			}, {}),
			protocols,
			chains,
			parentProtocols
		}))

export const getProtocol = async (protocolName: string) => {
	try {
		const data: IProtocolResponse = await fetchOverCache(`${PROTOCOL_API}/${protocolName}`).then((res) => res.json())

		if (!data || (data as any).statusCode === 400) {
			throw new Error((data as any).body)
		}

		let isNewlyListedProtocol = true

		Object.values(data.chainTvls).forEach((chain) => {
			if (chain.tvl?.length > 7) {
				isNewlyListedProtocol = false
			}
		})

		if (isNewlyListedProtocol && !data.isParentProtocol) {
			const hourlyData = await fetchOverCacheJson(`${HOURLY_PROTOCOL_API}/${protocolName}`)

			return { ...hourlyData, isHourlyChart: true }
		} else return data
	} catch (e) {
		console.log('[ERROR] generating ', `${PROTOCOL_API}/${protocolName}`, e)

		return null
	}
}

export const getAllProtocolEmissions = async () => {
	try {
		const res = await fetchWithErrorLogging(`${PROTOCOL_EMISSIONS_API}`).then((res) => res.json())
		return res
			.map((protocol) => {
				let event = protocol.events.find((e) => e.timestamp >= Date.now() / 1000)
				let upcomingEvent = []

				if (!event || (event.noOfTokens.length === 1 && event.noOfTokens[0] === 0)) {
					upcomingEvent = [{ timestamp: null }]
				} else {
					const comingEvents = protocol.events.filter((e) => e.timestamp === event.timestamp)
					upcomingEvent = [...comingEvents]
				}
				const coin = protocol.tokenPrice?.[0] ?? {}
				const tSymbol = protocol.name === 'LooksRare' ? 'LOOKS' : coin.symbol ?? null

				return {
					...protocol,
					upcomingEvent,
					tPrice: coin.price ?? null,
					tSymbol
				}
			})
			.sort((a, b) => {
				const x = a.upcomingEvent?.[0]?.timestamp
				const y = b.upcomingEvent?.[0]?.timestamp
				// equal items sort equally
				if (x === y) {
					return 0
				}

				// nulls sort after anything else
				if (x === null) {
					return 1
				}
				if (y === null) {
					return -1
				}

				return x < y ? -1 : 1
			})
	} catch (e) {
		console.log(e)
		return []
	}
}

export const getProtocolEmissons = async (protocolName: string) => {
	try {
		const list = await fetchWithErrorLogging(PROTOCOL_EMISSIONS_LIST_API).then((r) => r.json())
		if (!list.includes(protocolName))
			return { chartData: { documented: [], realtime: [] }, categories: { documented: [], realtime: [] } }

		const res = await fetchWithErrorLogging(`${PROTOCOL_EMISSION_API}/${protocolName}`)
			.then((r) => r.json())
			.then((r) => JSON.parse(r.body))

		const { metadata, name, futures } = res

		const documentedData = res.documentedData ?? {}
		const realTimeData = res.realTimeData ?? {}

		const protocolEmissions = { documented: {}, realtime: {} }
		const emissionCategories = { documented: [], realtime: [] }

		const prices = await fetchWithErrorLogging(`https://coins.llama.fi/prices/current/${metadata.token}?searchWidth=4h`)
			.then((res) => res.json())
			.catch((err) => {
				console.log(err)
				return {}
			})

		const tokenPrice = prices?.coins?.[metadata.token] ?? {}

		documentedData.data?.forEach((emission) => {
			const label = emission.label
				.split(' ')
				.map((l) => capitalizeFirstLetter(l))
				.join(' ')

			if (emissionCategories['documented'].includes(label)) {
				return
			}

			emissionCategories['documented'].push(label)

			emission.data.forEach((value) => {
				if (!protocolEmissions['documented'][value.timestamp]) {
					protocolEmissions['documented'][value.timestamp] = {}
				}

				protocolEmissions['documented'][value.timestamp] = {
					...protocolEmissions['documented'][value.timestamp],
					[label]: value.unlocked
				}
			})
		})

		realTimeData.data?.forEach((emission) => {
			const label = emission.label
				.split(' ')
				.map((l) => capitalizeFirstLetter(l))
				.join(' ')

			if (emissionCategories['realtime'].includes(label)) {
				return
			}

			emissionCategories['realtime'].push(label)

			emission.data.forEach((value) => {
				if (!protocolEmissions['realtime'][value.timestamp]) {
					protocolEmissions['realtime'][value.timestamp] = {}
				}

				protocolEmissions['realtime'][value.timestamp] = {
					...protocolEmissions['realtime'][value.timestamp],
					[label]: value.unlocked
				}
			})
		})

		const chartData = {
			documented: Object.entries(protocolEmissions['documented']).map(
				([date, values]: [string, { [key: string]: number }]) => ({
					date,
					...values
				})
			),
			realtime: Object.entries(protocolEmissions['realtime']).map(
				([date, values]: [string, { [key: string]: number }]) => ({
					date,
					...values
				})
			)
		}

		const pieChartData = {
			documented: Object.entries(chartData.documented[chartData.documented.length - 1] || {})
				.filter(([key]) => key !== 'date')
				.map(([name, value]) => ({ name, value })),
			realtime: Object.entries(chartData.realtime[chartData.realtime.length - 1] || {})
				.filter(([key]) => key !== 'date')
				.map(([name, value]) => ({ name, value }))
		}

		const stackColors = { documented: {}, realtime: {} }

		pieChartData['documented'].forEach(({ name }, index) => {
			stackColors['documented'][name] = getColorFromNumber(index, 6)
		})
		pieChartData['realtime'].forEach(({ name }, index) => {
			stackColors['realtime'][name] = getColorFromNumber(index, 6)
		})

		if (protocolName == 'looksrare') {
			tokenPrice.symbol = 'LOOKS'
		}

		return {
			chartData,
			pieChartData,
			stackColors,
			sources: metadata?.sources ?? [],
			notes: metadata?.notes ?? [],
			events: metadata?.events ?? [],
			tokenAllocation: {
				documented: documentedData.tokenAllocation ?? {},
				realtime: realTimeData.tokenAllocation ?? {}
			},
			futures: futures ?? {},
			categories: emissionCategories,
			hallmarks: {
				documented: documentedData.data?.length > 0 ? [[Date.now() / 1000, 'Today']] : [],
				realtime: realTimeData.data?.length > 0 ? [[Date.now() / 1000, 'Today']] : []
			},
			name: name || null,
			tokenPrice
		}
	} catch (e) {
		console.log(e)

		return { chartData: { documented: [], realtime: [] }, categories: { documented: [], realtime: [] } }
	}
}

export const fuseProtocolData = (protocolData: IProtocolResponse): IFusedProtocolData => {
	const tvlBreakdowns = protocolData?.currentChainTvls ?? {}

	const historicalChainTvls = protocolData?.chainTvls ?? {}

	const tvlByChain =
		Object.entries(protocolData?.currentChainTvls ?? {})?.sort(
			(a: [string, number], b: [string, number]) => b[1] - a[1]
		) ?? []

	const onlyChains = tvlByChain.filter((c) => {
		const name = c[0]

		if (name[0] === name[0]?.toLowerCase() || name.includes('-')) {
			return false
		} else return true
	})

	const chains = onlyChains.length === 0 ? protocolData?.chains ?? [] : [onlyChains[0][0]]

	return {
		...protocolData,
		tvlBreakdowns,
		tvlByChain,
		chains,
		historicalChainTvls
	}
}

// used in /protocols/[category]
export async function getProtocolsPageData(category?: string, chain?: string) {
	const { protocols, chains, parentProtocols } = await getProtocols()

	const chainsSet = new Set()

	protocols.forEach(({ chains, category: pCategory }) => {
		chains.forEach((chain) => {
			if (!category || !chain) {
				chainsSet.add(chain)
			} else {
				if (pCategory?.toLowerCase() === category?.toLowerCase() && chains.includes(chain)) {
					chainsSet.add(chain)
				}
			}
		})
	})

	let filteredProtocols = formatProtocolsData({ category, protocols, chain })

	return {
		filteredProtocols,
		chain: chain ?? 'All',
		category,
		chains: chains.filter((chain) => chainsSet.has(chain)),
		parentProtocols
	}
}
// - used in /airdrops, /protocols, /recent, /top-gainers-and-losers, /top-protocols, /watchlist
export async function getSimpleProtocolsPageData(propsToKeep?: BasicPropsToKeep) {
	const { protocols, chains, parentProtocols } = await getProtocolsRaw()

	const filteredProtocols = formatProtocolsData({
		protocols,
		protocolProps: propsToKeep
	})

	return { protocols: filteredProtocols, chains, parentProtocols }
}

// - used in /oracles and /oracles/[name]
export async function getOraclePageData(oracle = null) {
	try {
		const [{ chart = {}, oracles = {} }, { protocols }] = await Promise.all(
			[ORACLE_API, PROTOCOLS_API].map((url) => fetchWithErrorLogging(url).then((r) => r.json()))
		)

		const oracleExists = !oracle || oracles[oracle]

		if (!oracleExists) {
			return {
				notFound: true
			}
		}

		const filteredProtocols = formatProtocolsData({ oracle, protocols })

		let chartData = Object.entries(chart)

		const oraclesUnique = Object.entries(chartData[chartData.length - 1][1])
			.sort((a, b) => b[1].tvl - a[1].tvl)
			.map((orc) => orc[0])

		if (oracle) {
			let data = []
			chartData.forEach(([date, tokens]) => {
				const value = tokens[oracle]
				if (value) {
					data.push([date, value])
				}
			})
			chartData = data
		}

		const oraclesProtocols: IOracleProtocols = {}

		for (const orc in oracles) {
			oraclesProtocols[orc] = oracles[orc]?.length
		}

		let oracleLinks = [{ label: 'All', to: `/oracles` }].concat(
			oraclesUnique.map((o: string) => ({ label: o, to: `/oracles/${o}` }))
		)

		const colors = {}

		oraclesUnique.forEach((chain, index) => {
			colors[chain] = getColorFromNumber(index, 6)
		})

		colors['Others'] = '#AAAAAA'

		return {
			props: {
				tokens: oraclesUnique,
				tokenLinks: oracleLinks,
				token: oracle,
				tokensProtocols: oraclesProtocols,
				filteredProtocols,
				chartData,
				oraclesColors: colors
			}
		}
	} catch (e) {
		console.log(e)
		return {
			notFound: true
		}
	}
}

// - used in /forks and /forks/[name]
export async function getForkPageData(fork = null) {
	try {
		const [{ chart = {}, forks = {} }, { protocols }] = await Promise.all(
			[FORK_API, PROTOCOLS_API].map((url) => fetchWithErrorLogging(url).then((r) => r.json()))
		)

		const forkExists = !fork || forks[fork]

		if (!forkExists) {
			return {
				notFound: true
			}
		}

		let chartData = Object.entries(chart)

		const forksUnique = Object.entries(chartData[chartData.length - 1][1])
			.sort((a, b) => b[1].tvl - a[1].tvl)
			.map((fr) => fr[0])

		const protocolsData = formatProtocolsData({ protocols })

		let parentTokens = []

		if (fork) {
			let data = []
			chartData.forEach(([date, tokens]) => {
				const value = tokens[fork]
				if (value) {
					data.push([date, value])
				}
			})
			chartData = data
			const protocol = protocolsData.find((p) => p.name.toLowerCase() === fork.toLowerCase())
			if (protocol) {
				parentTokens.push(protocol)
			}
		} else {
			forksUnique.forEach((fork) => {
				const protocol = protocolsData.find((p) => p.name.toLowerCase() === fork.toLowerCase())
				if (protocol) {
					parentTokens.push(protocol)
				}
			})
		}

		const forksProtocols = {}

		for (const frk in forks) {
			forksProtocols[frk] = forks[frk]?.length
		}

		let forkLinks = [{ label: 'All', to: `/forks` }].concat(
			forksUnique.map((o: string) => ({ label: o, to: `/forks/${o}` }))
		)

		const filteredProtocols = formatProtocolsData({ fork, protocols })

		const colors = {}

		forksUnique.forEach((chain, index) => {
			colors[chain] = getColorFromNumber(index, 6)
		})

		colors['Others'] = '#AAAAAA'

		return {
			props: {
				tokens: forksUnique,
				tokenLinks: forkLinks,
				token: fork,
				tokensProtocols: forksProtocols,
				filteredProtocols,
				chartData,
				parentTokens,
				forkColors: colors
			}
		}
	} catch (e) {
		console.log(e)
		return {
			notFound: true
		}
	}
}

// - used in /categories and /categories/[name]
export async function getCategoriesPageData(category = null) {
	try {
		const [{ chart = {}, categories = {} }] = await Promise.all(
			[CATEGORY_API, PROTOCOLS_API].map((url) => fetchWithErrorLogging(url).then((r) => r.json()))
		)

		const categoryExists = !category || categories[category]

		if (!categoryExists) {
			return {
				notFound: true
			}
		}

		let chartData = Object.entries(chart)

		if (category) {
			let data = []

			chartData.forEach(([date, tokens]) => {
				const value = tokens[category]
				if (value) {
					data.push([date, value])
				}
			})
			chartData = data
		}

		const uniqueCategories = Object.keys(categories).filter((c) => c !== 'CEX')
		const colors = {}

		Object.keys(categories).map((c, index) => {
			colors[c] = getColorFromNumber(index, 9)
		})

		return { chartData, categoryColors: colors, uniqueCategories }
	} catch (e) {
		console.log(e)
		return {
			notFound: true
		}
	}
}

export const getNewChainsPageData = async (category: string) => {
	const [
		{ categories, chainTvls, ...rest },
		{ protocols: dexsProtocols },
		{ protocols: feesAndRevenueProtocols },
		{ chains: stablesChainData },
		activeUsers
	] = await Promise.all([
		fetchWithErrorLogging(`https://api.llama.fi/chains2/${category}`).then((res) => res.json()),
		getChainsPageDataByType('dexs'),
		getChainPageDataByType('fees'),
		getPeggedAssets(),
		fetchWithErrorLogging(ACTIVE_USERS_API).then((res) => res.json())
	])

	const categoryLinks = [
		{ label: 'All', to: '/chains' },
		{ label: 'Non-EVM', to: '/chains/Non-EVM' }
	].concat(
		categories.map((category) => ({
			label: category,
			to: `/chains/${category}`
		}))
	)

	const colors = {}

	rest.chainsUnique.forEach((chain, index) => {
		colors[chain] = getColorFromNumber(index, 10)
	})

	colors['Others'] = '#AAAAAA'

	const feesAndRevenueChains = feesAndRevenueProtocols.filter((p) => p.category === 'Chain')
	const dexsChains = dexsProtocols
	const stablesChainMcaps = stablesChainData.map((chain) => {
		return {
			name: chain.name,
			mcap: Object.values(chain.totalCirculatingUSD).reduce((a: number, b: number) => a + b)
		}
	})

	return {
		props: {
			...rest,
			category,
			categories: categoryLinks,
			colorsByChain: colors,
			chainTvls: chainTvls.map((chain) => {
				const { total24h, revenue24h } =
					feesAndRevenueChains.find((x) => x.name.toLowerCase() === chain.name.toLowerCase()) || {}

				const { total24h: dexsTotal24h } =
					dexsChains.find((x) => x.name.toLowerCase() === chain.name.toLowerCase()) || {}

				const users = Object.entries(activeUsers).find(
					([name]) => name.toLowerCase() === 'chain#' + chain.name.toLowerCase()
				)

				return {
					...chain,
					totalVolume24h: dexsTotal24h || 0,
					totalFees24h: total24h || 0,
					totalRevenue24h: revenue24h || 0,
					stablesMcap: stablesChainMcaps.find((x) => x.name.toLowerCase() === chain.name.toLowerCase())?.mcap ?? 0,
					users: (users?.[1] as any)?.users?.value ?? 0
				}
			})
		}
	}
}

// - used in /lsd
export async function getLSDPageData() {
	const [{ protocols }] = await Promise.all(
		[PROTOCOLS_API].map((url) => fetchWithErrorLogging(url).then((r) => r.json()))
	)
	const pools = (await fetchWithErrorLogging(YIELD_POOLS_API).then((r) => r.json())).data

	const lsdRates = await fetchWithErrorLogging(LSD_RATES_API).then((r) => r.json())

	// filter for LSDs
	const lsdProtocols = protocols
		.filter((p) => (p.category === 'Liquid Staking' || ['Stafi'].includes(p.name)) && p.chains.includes('Ethereum'))
		.map((p) => p.name)
		.filter((p) => p !== 'Genius')

	// get historical data
	const lsdProtocolsSlug = lsdProtocols.map((p) => p.replace(/\s+/g, '-').toLowerCase())
	const history = await Promise.all(
		lsdProtocolsSlug.map((p) => fetchWithErrorLogging(`${PROTOCOL_API}/${p}`).then((r) => r.json()))
	)

	let lsdApy = pools
		.filter((p) => lsdProtocolsSlug.includes(p.project) && p.chain === 'Ethereum' && p.symbol.includes('ETH'))
		.map((p) => ({
			...p,
			name: p.project
				.split('-')
				.map((i) =>
					i === 'stakewise' ? 'StakeWise' : i === 'eth' ? i.toUpperCase() : i.charAt(0).toUpperCase() + i.slice(1)
				)
				.join(' ')
		}))
	lsdApy = lsdApy.map((p) => ({ ...p, name: p.project === 'binance-staked-eth' ? 'Binance staked ETH' : p.name }))

	const nameGeckoMapping = {}
	for (const p of history) {
		nameGeckoMapping[p.name] = p.name === 'Frax Ether' ? 'frax-share' : p.gecko_id
	}

	const colors = {}
	lsdProtocols.forEach((protocol, index) => {
		colors[protocol] = getColorFromNumber(index, 10)
	})

	colors['Others'] = '#AAAAAA'

	return {
		props: {
			chartData: history,
			lsdColors: colors,
			lsdRates,
			nameGeckoMapping,
			lsdApy
		}
	}
}

export function formatGovernanceData(data: {
	proposals: Array<{ scores: Array<number>; choices: Array<string>; id: string }>
	stats: {
		months: {
			[date: string]: {
				total?: number
				successful?: number
				proposals: Array<string>
			}
		}
	}
}) {
	const proposals = Object.values(data.proposals).map((proposal) => {
		const winningScore = [...proposal.scores].sort((a, b) => b - a)[0]
		const totalVotes = proposal.scores.reduce((acc, curr) => (acc += curr), 0)

		return {
			...proposal,
			winningChoice: winningScore ? proposal.choices[proposal.scores.findIndex((x) => x === winningScore)] : '',
			winningPerc:
				totalVotes && winningScore ? `(${Number(((winningScore / totalVotes) * 100).toFixed(2))}% of votes)` : ''
		}
	})

	const activity = Object.entries(data.stats.months || {}).map(([date, values]) => ({
		date: Math.floor(new Date(date).getTime() / 1000),
		Total: values.total || 0,
		Successful: values.successful || 0
	}))

	const maxVotes = Object.entries(data.stats.months || {}).map(([date, values]) => {
		let maxVotes = 0
		values.proposals?.forEach((proposal) => {
			const votes = proposals.find((p) => p.id === proposal)?.['scores_total'] ?? 0

			if (votes > maxVotes) {
				maxVotes = votes
			}
		})

		return {
			date: Math.floor(new Date(date).getTime() / 1000),
			'Max Votes': maxVotes.toFixed(2)
		}
	})

	return { maxVotes, activity, proposals }
}
