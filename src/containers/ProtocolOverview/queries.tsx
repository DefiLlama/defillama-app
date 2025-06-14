import { darken, transparentize } from 'polished'
import { slug, tokenIconPaletteUrl } from '~/utils'
import { oldBlue, primaryColor } from '~/constants/colors'
import { fetchWithErrorLogging, fetchWithTimeout } from '~/utils/async'
import {
	ACTIVE_USERS_API,
	DEV_METRICS_API,
	HOURLY_PROTOCOL_API,
	PROTOCOL_API,
	PROTOCOLS_TREASURY,
	YIELD_POOLS_API
} from '~/constants'
import {
	IProtocolMetadata,
	IProtocolOverviewPageData,
	IProtocolPageMetrics,
	IProtocolPageStyles,
	IUpdatedProtocol,
	CardType,
	IArticlesResponse,
	IArticle
} from './types'
import { getAdapterChainOverview, IAdapterOverview } from '../DimensionAdapters/queries'
import { getProtocolEmissons } from '~/api/categories/protocols'

export const getProtocol = async (protocolName: string): Promise<IUpdatedProtocol> => {
	const start = Date.now()
	try {
		const data: IUpdatedProtocol = await fetchWithErrorLogging(`${PROTOCOL_API}/${protocolName}`).then((res) =>
			res.json()
		)

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
			const hourlyData = await fetchWithErrorLogging(`${HOURLY_PROTOCOL_API}/${protocolName}`).then((res) => res.json())

			return { ...hourlyData, isHourlyChart: true }
		} else return data
	} catch (e) {
		console.log(`[ERROR] [${Date.now() - start}ms] <${PROTOCOL_API}/${protocolName}>`, e)

		return null
	}
}

export const getProtocolPageStyles = async (protocolName: string): Promise<IProtocolPageStyles> => {
	const bgColor = await getColor(tokenIconPaletteUrl(protocolName))

	const bgColor2 = bgColor.length < 7 ? oldBlue : bgColor
	const backgroundColor = isDarkColor(bgColor2) ? oldBlue : bgColor2

	return getStyles(backgroundColor)
}

function getStyles(color: string) {
	let color2 = color.length < 7 ? oldBlue : color

	let finalColor = isDarkColor(color2) ? oldBlue : color2

	return {
		'--primary-color': finalColor,
		'--bg-color': transparentize(0.6, finalColor),
		'--btn-bg': transparentize(0.9, finalColor),
		'--btn-hover-bg': transparentize(0.8, finalColor),
		'--btn-text': darken(0.1, finalColor)
	}
}

export const defaultPageStyles = {
	'--primary-color': oldBlue,
	'--bg-color': 'rgba(31,103,210,0.4)',
	'--btn-bg': 'rgba(31,103,210,0.1)',
	'--btn-hover-bg': 'rgba(31,103,210,0.2)',
	'--btn-text': '#1851a6'
} as React.CSSProperties

function isDarkColor(color: string) {
	// Convert hex to RGB
	const hex = color.replace('#', '')
	const r = parseInt(hex.substring(0, 2), 16)
	const g = parseInt(hex.substring(2, 4), 16)
	const b = parseInt(hex.substring(4, 6), 16)

	// Calculate relative luminance
	const max = Math.max(r, g, b)
	const min = Math.min(r, g, b)

	// Calculate saturation (0-1)
	const saturation = max === 0 ? 0 : (max - min) / max

	// Check if the color is grayish by comparing RGB components and saturation
	const tolerance = 15 // RGB difference tolerance
	const saturationThreshold = 0.15 // Colors with saturation below this are considered grayish

	const isGrayish =
		Math.abs(r - g) <= tolerance &&
		Math.abs(g - b) <= tolerance &&
		Math.abs(r - b) <= tolerance &&
		saturation <= saturationThreshold

	return isGrayish
}

const getColor = async (path: string) => {
	try {
		if (!path) return primaryColor

		const color = await fetchWithErrorLogging(path).then((res) => res.text())

		if (!color.startsWith('#')) {
			console.log(path, color)
			return primaryColor
		}

		return color
	} catch (error) {
		console.log(path, 'rugged, but handled')
		return primaryColor
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
	if (!protocolData.misrepresentedTokens) {
		for (const chain in protocolData.chainTvls ?? {}) {
			if (protocolData.chainTvls[chain].tokensInUsd?.length > 0 && !inflowsExist) {
				inflowsExist = true
			}
		}
	}

	return {
		tvl: metadata.tvl ? true : false,
		dexs: metadata.dexs ? true : false,
		perps: metadata.perps ? true : false,
		options: metadata.options ? true : false,
		dexAggregators: metadata.aggregator ? true : false,
		perpsAggregators: metadata.perpsAggregators ? true : false,
		bridgeAggregators: metadata.bridgeAggregators ? true : false,
		stablecoins: protocolData.stablecoins?.length > 0,
		bridge: protocolData.category === 'Bridge' || protocolData.category === 'Cross Chain',
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
		inflows: inflowsExist
	}
}

const chartTypes = [
	'TVL',
	'Mcap',
	'Token Price',
	'FDV',
	'Fees',
	'Revenue',
	'Holders Revenue',
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
	'Options Premium Volume',
	'Options Notional Volume',
	'Perps Aggregators Volume',
	'Bridge Aggregators Volume',
	'DEX Aggregators Volume',
	'Incentives'
]

export const getProtocolOverviewPageData = async ({
	protocolId,
	metadata
}: {
	protocolId: string
	metadata: IProtocolMetadata
}): Promise<IProtocolOverviewPageData> => {
	const [
		protocolData,
		pageStyles,
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
		users
	]: [
		IUpdatedProtocol & {
			devMetrics?: {
				weeklyCommits: number | null
				monthlyCommits: number | null
				weeklyDevelopers: number | null
				monthlyDevelopers: number | null
				lastCommit: number | null
			}
		},
		IProtocolPageStyles,
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
		{
			ownTokens: number
			stablecoins: number
			majors: number
			others: number
		} | null,
		any,
		IArticle[],
		any,
		{
			activeUsers: number | null
			newUsers: number | null
			transactions: number | null
			gasUsd: number | null
		} | null
	] = await Promise.all([
		getProtocol(metadata.name).then(async (data) => {
			try {
				const devMetricsProtocolUrl = data.id?.includes('parent')
					? `${DEV_METRICS_API}/parent/${data?.id?.replace('parent#', '')}.json`
					: `${DEV_METRICS_API}/${data.id}.json`

				const devActivity = data.github
					? await fetchWithTimeout(devMetricsProtocolUrl, 3_000)
							.then((r) => r.json())
							.catch((e) => {
								return null
							})
					: null

				const devMetrics = devActivity?.report
					? {
							weeklyCommits: devActivity?.report?.weekly_contributers.slice(-1)[0]?.cc ?? null,
							monthlyCommits: devActivity?.report?.monthly_contributers.slice(-1)[0]?.cc ?? null,
							weeklyDevelopers: devActivity?.report?.weekly_contributers.slice(-1)[0]?.v ?? null,
							monthlyDevelopers: devActivity?.report?.monthly_contributers.slice(-1)[0]?.v ?? null,
							lastCommit: devActivity?.last_commit_update_time ?? null
					  }
					: null

				return { ...data, devMetrics }
			} catch (e) {
				console.log(e)
				return data
			}
		}),
		getProtocolPageStyles(metadata.name),
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
			? fetchWithErrorLogging(PROTOCOLS_TREASURY)
					.then((res) => res.json())
					.then((res) => res.find((item) => item.id === `${protocolId}-treasury`)?.tokenBreakdowns ?? null)
					.catch(() => null)
			: Promise.resolve(null),
		metadata.yields
			? fetchWithErrorLogging(YIELD_POOLS_API)
					.then((res) => res.json())
					.catch((err) => {
						console.log('[HTTP]:[ERROR]:[PROTOCOL_YIELD]:', metadata.name, err instanceof Error ? err.message : '')
						return {}
					})
			: null,
		fetchArticles({ tags: metadata.name }).catch((err) => {
			console.log('[HTTP]:[ERROR]:[PROTOCOL_ARTICLE]:', metadata.name, err instanceof Error ? err.message : '')
			return []
		}),
		metadata?.emissions
			? fetchWithErrorLogging(`https://api.llama.fi/emissionsBreakdownAggregated`)
					.then((res) => res.json())
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
			? fetchWithTimeout(ACTIVE_USERS_API, 10_000)
					.then((res) => res.json())
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
			: null
	])

	const cards: CardType[] = []

	if (treasury) {
		cards.push('treasury')
	}

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

	if (feesData || bribesData || tokenTaxData) {
		cards.push('fees')
	}

	if (revenueData || bribesData || tokenTaxData) {
		cards.push('revenue')
	}

	if (holdersRevenueData || bribesData || tokenTaxData) {
		cards.push('holdersRevenue')
	}

	if (dexVolumeData) {
		cards.push('dexVolume')
	}

	if (dexAggregatorVolumeData) {
		cards.push('dexAggregatorVolume')
	}

	if (perpVolumeData) {
		cards.push('perpVolume')
	}

	if (perpAggregatorVolumeData) {
		cards.push('perpAggregatorVolume')
	}

	if (bridgeAggregatorVolumeData) {
		cards.push('bridgeAggregatorVolume')
	}

	if (optionsPremiumVolumeData) {
		cards.push('optionsPremiumVolume')
	}

	if (optionsNotionalVolumeData) {
		cards.push('optionsNotionalVolume')
	}

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
	if (yields) {
		cards.push('yields')
	}

	// if (true) {
	// 	cards.push('governance')
	// }

	// if (true) {
	// 	cards.push('unlocks')
	// }

	if (incentives) {
		cards.push('incentives')
	}

	if (revenueData && incentives) {
		cards.push('earnings')
	}

	if (protocolData.devMetrics) {
		cards.push('devActivity')
	}

	if (users) {
		cards.push('users')
	}

	console.log({ users })

	return {
		name: protocolData.name,
		symbol: protocolData.symbol ?? null,
		category: protocolData.category ?? null,
		otherProtocols: protocolData.otherProtocols ?? null,
		deprecated: protocolData.deprecated ?? false,
		chains: protocolData.chains ?? [],
		currentTvlByChain: protocolData.currentChainTvls ?? {},
		description: protocolData.description ?? '',
		website: protocolData.referralUrl ?? protocolData.url ?? null,
		twitter: protocolData.twitter ?? null,
		github: protocolData.github
			? typeof protocolData.github === 'string'
				? [protocolData.github]
				: protocolData.github
			: null,
		methodology:
			protocolData.methodology ??
			(metadata.tvl && protocolData.module && protocolData.module !== 'dummy.js'
				? 'Total value of all coins held in the smart contracts of the protocol'
				: null),
		methodologyURL:
			metadata.tvl && protocolData.module && protocolData.module !== 'dummy.js'
				? `https://github.com/DefiLlama/DefiLlama-Adapters/tree/main/projects/${protocolData.module}`
				: null,
		pageStyles,
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
		treasury,
		unlocks: null,
		governance: null,
		yields,
		articles,
		incentives,
		devMetrics: protocolData.devMetrics ?? null,
		users,
		cards,
		isCEX: false
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
	const articlesRes: IArticlesResponse = await fetchWithTimeout(`https://api.llama.fi/news/articles`, 10_000)
		.then((res) => res.json())
		.catch((err) => {
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
