import type { LiteProtocol, IParentProtocol } from '~/api/types'
import { PROTOCOLS_API, ADAPTORS_SUMMARY_BASE_API, MCAPS_API } from '~/constants'
import { getUniqueArray } from '~/containers/DexsAndFees/utils'
import { capitalizeFirstLetter, chainIconUrl } from '~/utils'
import { getAPIUrl } from './client'
import { IGetOverviewResponseBody, IJSON, ProtocolAdaptorSummary, ProtocolAdaptorSummaryResponse } from './types'
import { getCexVolume, handleFetchResponse } from './utils'
import { chainCoingeckoIds } from '~/constants/chainTokens'

import { fetchWithErrorLogging } from '~/utils/async'

const fetch = fetchWithErrorLogging

/* export const getDex = async (dexName: string): Promise<IDexResponse> =>
	await fetch(`${DEX_BASE_API}/${dexName}`).then((r) => r.json())

export const getDexs = (): Promise<IGetDexsResponseBody> => fetch(`${DEXS_API}?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`).then((r) => r.json()) */

// - used in /[dex]
/* export async function getDexPageData(dex: string) {
	const dexResponse = await fetch(`${DEX_BASE_API}/${dex}`).then((r) => r.json())

	return {
		props: dexResponse
	}
} */
export const getOverviewItem = (
	type: string,
	protocolName: string,
	dataType?: string
): Promise<ProtocolAdaptorSummaryResponse> =>
	fetch(`${ADAPTORS_SUMMARY_BASE_API}/${type}/${protocolName}${dataType ? `?dataType=${dataType}` : ''}`).then(
		handleFetchResponse
	)
export const getOverview = (
	type: string,
	chain?: string,
	dataType?: string,
	includeTotalDataChart?: boolean,
	fullChart?: boolean
): Promise<IGetOverviewResponseBody> =>
	fetch(getAPIUrl(type, chain, !includeTotalDataChart, true, dataType, fullChart)).then(handleFetchResponse)

export interface ProtocolAdaptorSummaryProps extends Omit<ProtocolAdaptorSummaryResponse, 'totalDataChart'> {
	type: string
	totalDataChart: [IJoin2ReturnType, string[]]
	allAddresses?: Array<string>
}

export const generateGetOverviewItemPageDate = async (
	item: ProtocolAdaptorSummaryResponse,
	type: string,
	protocolName: string
): Promise<ProtocolAdaptorSummaryProps> => {
	let label: string
	if (type === 'volumes') {
		label = 'Volume'
	} else if (type === 'options') {
		label = 'Notional volume'
	} else {
		label = capitalizeFirstLetter(type)
	}
	const allCharts: IChartsList = []
	if (item.totalDataChart) allCharts.push([label, item.totalDataChart])
	let secondType: ProtocolAdaptorSummaryResponse
	let secondLabel: string
	if (type === 'fees') {
		secondType = await getOverviewItem(type, protocolName, 'dailyRevenue')
		secondLabel = 'Revenue'
	} else if (type === 'options') {
		secondType = await getOverviewItem(type, protocolName, 'dailyPremiumVolume')
		secondLabel = 'Premium volume'
	}
	if (secondLabel && secondType?.totalDataChart) allCharts.push([secondLabel, secondType.totalDataChart])

	return {
		...item,
		logo: getLlamaoLogo(item.logo),
		dailyRevenue: secondType?.total24h ?? null,
		type,
		totalDataChart: [joinCharts2(...allCharts), allCharts.map(([label]) => label)]
	}
}

export const getOverviewItemPageData = async (
	type: string,
	protocolName: string,
	dataType?: string
): Promise<ProtocolAdaptorSummaryProps> => {
	const item = await getOverviewItem(type, protocolName, dataType)
	return generateGetOverviewItemPageDate(item, type, protocolName)
}

function getMCap(protocolsData: { protocols: LiteProtocol[] }) {
	const protocolsRaw = protocolsData?.protocols
	return (
		protocolsRaw?.reduce((acc, pd) => {
			acc[pd.name] = pd.mcap
			return acc
		}, {}) ?? {}
	)
}

function getTVLData(protocolsData: { protocols: LiteProtocol[] }, chain?: string) {
	const protocolsRaw = chain
		? protocolsData?.protocols.map((p) => ({
				...p,
				tvl: p?.chainTvls?.[chain]?.tvl ?? null
		  }))
		: protocolsData?.protocols
	return (
		protocolsRaw?.reduce((acc, pd) => {
			acc[pd.defillamaId] = pd.tvl
			return acc
		}, {}) ?? {}
	)
}
const getMapingCoinGeckoId = (name: string): string => {
	const _name = {
		Cronos: 'crypto-com-chain',
		Doge: 'dogecoin',
		Polygon: 'matic-network',
		Avalanche: 'avalanche-2',
		BSC: 'binancecoin'
	}[name]
	return _name ?? name
}

// - used in /[type] and /[type]/chains/[chain]
export const getChainPageData = async (type: string, chain?: string): Promise<IOverviewProps> => {
	const feesOrRevenueApi =
		type === 'options'
			? getAPIUrl(type, chain, false, true, 'dailyPremiumVolume')
			: getAPIUrl(type, chain, true, true, 'dailyRevenue')

	const [request, protocolsData, feesOrRevenue, cexVolume]: [
		IGetOverviewResponseBody,
		{ protocols: LiteProtocol[]; parentProtocols: IParentProtocol[] },
		IGetOverviewResponseBody,
		number
	] = await Promise.all([
		fetch(getAPIUrl(type, chain, type === 'fees', true)).then(handleFetchResponse),
		fetch(PROTOCOLS_API).then(handleFetchResponse),
		fetch(feesOrRevenueApi).then(handleFetchResponse),
		type === 'dexs' ? getCexVolume() : Promise.resolve(0)
	])

	const {
		protocols = [],
		total24h,
		total7d,
		change_1d,
		change_7d,
		change_1m,
		chain: filtredChain,
		change_7dover7d,
		totalDataChart,
		totalDataChartBreakdown,
		allChains
	} = request
	const chains = protocols.filter((e) => e.protocolType === 'chain').map((e) => e.name)

	const chainMcaps = await fetch(MCAPS_API, {
		method: 'POST',
		body: JSON.stringify({
			coins: Object.values(chains)
				.filter((c) => chainCoingeckoIds[c]?.geckoId)
				.map((c: string) => `coingecko:${chainCoingeckoIds[c].geckoId}`)
		})
	})
		.then((r) => r.json())
		.catch((err) => {
			console.log(err)
			return {}
		})

	const chainMcap =
		chains?.reduce((acc, curr) => {
			const geckoId = chainCoingeckoIds[curr]?.geckoId

			if (geckoId) {
				acc[curr] = chainMcaps[`coingecko:${geckoId}`]?.mcap ?? null
			}
			return acc
		}, {}) ?? {}

	const tvlData: IJSON<number> = getTVLData(protocolsData, filtredChain)
	const mcapData = { ...getMCap(protocolsData), ...chainMcap }
	const label: string = type === 'options' ? 'Notional volume' : capitalizeFirstLetter(type)

	const allCharts: IChartsList = []

	if (totalDataChart) {
		allCharts.push([label, totalDataChart])
	}

	if (type === 'options' && feesOrRevenue?.totalDataChart) {
		allCharts.push(['Premium volume', feesOrRevenue.totalDataChart])
	}

	const revenueProtocols =
		type === 'fees'
			? feesOrRevenue?.protocols?.reduce(
					(acc, protocol) => ({ ...acc, [protocol.name]: protocol }),
					{} as IJSON<ProtocolAdaptorSummary>
			  ) ?? {}
			: {}

	const { parentProtocols } = protocolsData
	const parentProtocolsMap = parentProtocols.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {})

	const protocolsWithSubrows = protocols.reduce((acc, protocol) => {
		// Assign mainrow and sub-row if has any
		let mainRow: undefined | IOverviewProps['protocols'][number] = undefined
		let subRow: undefined | IOverviewProps['protocols'][number]['subRows'][number] = null
		if (parentProtocolsMap[protocol.parentProtocol]) {
			mainRow = parentProtocolsMap[protocol.parentProtocol]
			subRow = {
				...protocol,
				logo: getLlamaoLogo(protocol.logo),
				displayName: protocol.displayName ?? protocol.name,
				tvl: tvlData[protocol.defillamaId] ?? null,
				volumetvl: tvlData[protocol.defillamaId] ? protocol.total24h / tvlData[protocol.defillamaId] : null,
				dominance: (100 * protocol.total24h) / total24h,
				revenue24h: revenueProtocols?.[protocol.name]?.total24h ?? null,
				revenue7d: revenueProtocols?.[protocol.name]?.total7d ?? null,
				revenue30d: revenueProtocols?.[protocol.name]?.total30d ?? null,
				mcap: mcapData[protocol.name] || null,
				pf: getAnnualizedRatio(mcapData[protocol.name], protocol.total30d),
				ps: getAnnualizedRatio(mcapData[protocol.name], revenueProtocols?.[protocol.name]?.total30d)
			}
			// If already included parent protocol we add the new child
			if (acc[protocol.parentProtocol]) acc[protocol.parentProtocol].subRows.push(subRow)
			// If first time processed parent protocol we create the subrows list
			else acc[protocol.parentProtocol] = { ...acc[protocol.parentProtocol], subRows: [subRow] }
		} else mainRow = protocol

		// Main row, either parent or single protocol
		const protocolTVL = tvlData[protocol.defillamaId]
		mainRow = {
			...mainRow,
			...acc[protocol.parentProtocol],
			logo: getLlamaoLogo(protocol.logo),
			category: protocol.category,
			displayName: mainRow.displayName ?? mainRow.name,
			revenue24h: revenueProtocols?.[protocol.name]?.total24h ?? null,
			revenue7d: revenueProtocols?.[protocol.name]?.total7d ?? null,
			revenue30d: revenueProtocols?.[protocol.name]?.total30d ?? null,
			tvl: protocolTVL ?? null,
			dominance: (100 * protocol.total24h) / total24h,
			module: protocol.module,
			dailyUserFees: protocol.dailyUserFees ?? null,
			mcap: mcapData[protocol.name] || null,
			pf: getAnnualizedRatio(mcapData[protocol.name], protocol.total30d),
			ps: getAnnualizedRatio(mcapData[protocol.name], revenueProtocols?.[protocol.name]?.total30d)
		}
		// Stats for parent protocol
		if (acc[protocol.parentProtocol]) {
			// stats
			mainRow.total24h = acc[protocol.parentProtocol].subRows.reduce(reduceSumByAttribute('total24h'), null)
			mainRow.total7d = acc[protocol.parentProtocol].subRows.reduce(reduceSumByAttribute('total7d'), null)
			mainRow.total30d = acc[protocol.parentProtocol].subRows.reduce(reduceSumByAttribute('total30d'), null)
			mainRow.totalAllTime = acc[protocol.parentProtocol].subRows.reduce(reduceSumByAttribute('totalAllTime'), null)
			mainRow.tvl = acc[protocol.parentProtocol].subRows.reduce(reduceSumByAttribute('tvl'), null)
			mainRow.revenue24h = acc[protocol.parentProtocol].subRows.reduce(reduceSumByAttribute('revenue24h'), null)
			mainRow.revenue7d = acc[protocol.parentProtocol].subRows.reduce(reduceSumByAttribute('revenue7d'), null)
			mainRow.revenue30d = acc[protocol.parentProtocol].subRows.reduce(reduceSumByAttribute('revenue30d'), null)
			mainRow.dailyRevenue = acc[protocol.parentProtocol].subRows.reduce(reduceSumByAttribute('dailyRevenue'), null)
			mainRow.dailyUserFees = acc[protocol.parentProtocol].subRows.reduce(reduceSumByAttribute('dailyUserFees'), null)
			mainRow.dailyCreatorRevenue = acc[protocol.parentProtocol].subRows.reduce(
				reduceSumByAttribute('dailyCreatorRevenue'),
				null
			)
			mainRow.dailyHoldersRevenue = acc[protocol.parentProtocol].subRows.reduce(
				reduceSumByAttribute('dailyHoldersRevenue'),
				null
			)
			mainRow.dailyPremiumVolume = acc[protocol.parentProtocol].subRows.reduce(
				reduceSumByAttribute('dailyPremiumVolume'),
				null
			)
			mainRow.dailyProtocolRevenue = acc[protocol.parentProtocol].subRows.reduce(
				reduceSumByAttribute('dailyProtocolRevenue'),
				null
			)
			mainRow.dailySupplySideRevenue = acc[protocol.parentProtocol].subRows.reduce(
				reduceSumByAttribute('dailySupplySideRevenue'),
				null
			)
			mainRow.mcap = acc[protocol.parentProtocol].subRows.reduce(reduceSumByAttribute('mcap'), null)
			// mainRow.mcap = acc[protocol.parentProtocol].subRows.reduce(reduceHigherByAttribute('mcap'), null)
			mainRow.chains = getUniqueArray(acc[protocol.parentProtocol].subRows.map((d) => d.chains).flat())
			mainRow.methodology = getParentProtocolMethodology(
				mainRow.displayName,
				acc[protocol.parentProtocol].subRows.map((r) => r.displayName)
			)
			const total14dto7d = acc[protocol.parentProtocol].subRows.reduce(reduceSumByAttribute('total14dto7d'), null)
			mainRow.change_7dover7d = ((mainRow.total7d - total14dto7d) / total14dto7d) * 100
			mainRow.pf = getAnnualizedRatio(mainRow.mcap, mainRow.total30d)
			mainRow.ps = getAnnualizedRatio(mainRow.mcap, mainRow.revenue30d)
		}
		// Computed stats
		mainRow.volumetvl = mainRow.total24h / mainRow.tvl

		mainRow.dominance = (100 * mainRow.total24h) / total24h

		// Return acc
		acc[protocol.parentProtocol ?? protocol.module] = mainRow
		return acc
	}, {} as IJSON<IOverviewProps['protocols'][number]>)

	/* 	if (revenue?.totalDataChart)
			allCharts.push(["Revenue", revenue.totalDataChart]) */

	return {
		protocols: Object.values(protocolsWithSubrows),
		total24h,
		total7d,
		change_1d,
		change_7d,
		change_1m,
		change_7dover7d,
		totalDataChart: [joinCharts2(...allCharts), allCharts.map(([label]) => label)],
		chain: filtredChain ?? null,
		tvlData,
		totalDataChartBreakdown,
		allChains,
		dexsDominance: cexVolume ? +((total24h / (cexVolume + total24h)) * 100).toFixed(2) : null,
		type
	}
}

export const getAnnualizedRatio = (numerator?: number | null, denominator?: number | null) => {
	if (numerator && denominator && numerator !== null && denominator !== null)
		return Number((numerator / (denominator * 12)).toFixed(2))
	return null
}

export const getLlamaoLogo = (logo: string | null) => {
	if (!logo) return null
	let llamoLogo = logo
	if (llamoLogo.includes('chains'))
		llamoLogo = llamoLogo.replace('https://icons.llama.fi/', 'https://icons.llamao.fi/icons/')
	llamoLogo = llamoLogo.replace('https://icons.llama.fi/', 'https://icons.llamao.fi/icons/protocols/')
	return llamoLogo.split('.').slice(0, -1).join('.')
}

export const reduceSumByAttribute = (attribute: string) => (acc, curr) => {
	if (curr[attribute] !== null) {
		if (acc === undefined) return curr[attribute]
		return (acc += curr[attribute])
	}
	return acc
}

const reduceHigherByAttribute = (attribute: string) => (acc, curr) => {
	if (curr[attribute] !== null) {
		if (acc === undefined || curr[attribute] > acc) return curr[attribute]
	}
	return acc
}

const getParentProtocolMethodology = (name: string, versionNames: string[]) => {
	const text = (() => {
		if (versionNames.length === 1)
			return {
				isSumString: `All`,
				versions: `${versionNames[0].toUpperCase()}`
			}
		else
			return {
				isSumString: `Sum of all`,
				versions: `${versionNames.slice(0, -1).join(', ')} and ${versionNames[versionNames.length - 1].toUpperCase()}`
			}
	})()
	return {
		UserFees: `${text.isSumString} user fees from ${text.versions}`,
		Fees: `${text.isSumString} fees from ${text.versions}`,
		Revenue: `${text.isSumString} revenue from ${text.versions}`,
		ProtocolRevenue: `${text.isSumString} protocol revenue from ${text.versions}`,
		HoldersRevenue: `${text.isSumString} holders revenue from ${text.versions}`,
		SupplySideRevenue: `${text.isSumString} supply side revenue from ${text.versions}`
	}
}

export interface IOverviewProps {
	protocols: Array<
		IGetOverviewResponseBody['protocols'][number] & {
			subRows?: IGetOverviewResponseBody['protocols']
			volumetvl?: number
			tvl?: number
			dominance?: number
			change_7dover7d?: IGetOverviewResponseBody['change_7dover7d']
			dailyVolume?: number
			id?: string
		}
	>
	total24h?: IGetOverviewResponseBody['total24h']
	total7d?: IGetOverviewResponseBody['total7d']
	change_1d?: IGetOverviewResponseBody['change_1d']
	change_7d?: IGetOverviewResponseBody['change_7d']
	change_1m?: IGetOverviewResponseBody['change_1m']
	change_7dover7d?: IGetOverviewResponseBody['change_7dover7d']
	totalDataChart: [IJoin2ReturnType, string[]]
	chain: string
	tvlData?: IJSON<number>
	totalDataChartBreakdown?: IGetOverviewResponseBody['totalDataChartBreakdown']
	allChains?: IGetOverviewResponseBody['allChains']
	totalAllTime?: ProtocolAdaptorSummaryResponse['totalAllTime']
	type: string
	dexsDominance?: number
	categories?: Array<string>
}

// - used in /[type]/chains
export const getChainsPageData = async (type: string): Promise<IOverviewProps> => {
	const { allChains, total24h: allChainsTotal24h } = await getOverview(type)

	const [protocolsData, ...dataByChain] = await Promise.all([
		fetch(PROTOCOLS_API)
			.then(handleFetchResponse)
			.catch((err) => {
				console.log(PROTOCOLS_API, err)
				return {}
			}),
		...allChains.map((chain) => getOverview(type, chain, undefined, true, true).then((res) => ({ ...res, chain })))
	])

	let protocols = dataByChain
		.map(
			({
				total24h,
				change_1d,
				change_7d,
				chain,
				change_1m,
				protocols,
				change_7dover7d,
				total7d,
				total30d,
				dailyRevenue,
				dailyUserFees,
				dailyHoldersRevenue,
				dailyCreatorRevenue,
				dailySupplySideRevenue,
				dailyProtocolRevenue,
				dailyPremiumVolume
			}) => {
				if (!protocols) return undefined
				const tvlData = getTVLData(protocolsData, chain)
				return {
					name: chain,
					displayName: chain,
					disabled: null,
					logo: chainIconUrl(chain),
					total24h,
					tvl: protocols.reduce((acc, curr) => {
						// TODO: This should be mapped using defillamaId to get accurate tvl!
						const tvl = tvlData[curr.defillamaId]
						acc += !Number.isNaN(tvl) ? tvl : 0
						return acc
					}, 0),
					change_7dover7d,
					total7d,
					total30d,
					change_1d,
					change_7d,
					change_1m,
					dominance: (100 * total24h) / allChainsTotal24h,
					chains: [chain],
					totalAllTime: protocols.reduce((acc, curr) => (acc += curr.totalAllTime), 0),
					protocolsStats: null,
					breakdown24h: null,
					module: chain,
					dailyRevenue: dailyRevenue ?? null,
					dailyUserFees: dailyUserFees ?? null,
					dailyHoldersRevenue: dailyHoldersRevenue ?? null,
					dailyCreatorRevenue: dailyCreatorRevenue ?? null,
					dailySupplySideRevenue: dailySupplySideRevenue ?? null,
					dailyProtocolRevenue: dailyProtocolRevenue ?? null,
					dailyPremiumVolume: dailyPremiumVolume ?? null,
					mcap: null,
					ps: null,
					pf: null
				}
			}
		)
		.filter(notUndefined)

	const allCharts = dataByChain.map((chainData) => [chainData.chain, chainData.totalDataChart]) as IChartsList
	let aggregatedChart = joinCharts2(...allCharts)
	const sum = (obj: IJSON<string | number>) => {
		return Object.values(obj).reduce<number>((acc, curr) => (typeof curr === 'number' ? (acc += curr) : acc), 0)
	}
	aggregatedChart = aggregatedChart.slice(
		aggregatedChart.findIndex((it) => sum(it) !== 0),
		aggregatedChart.length - [...aggregatedChart].reverse().findIndex((it) => sum(it) !== 0)
	)
	return {
		type,
		protocols,
		chain: 'all',
		totalDataChart: [aggregatedChart, allCharts.map(([label]) => label)]
	}
}

type IChartsList = Array<[string, IGetOverviewResponseBody['totalDataChart']]>
export type IJoin2ReturnType = Array<IJSON<number | string> & { date: string }>
export const joinCharts2 = (...lists: Array<[string, Array<[number, number]>]>): IJoin2ReturnType =>
	Object.values(
		lists.reduce((acc, [name, list]) => {
			list?.forEach(([timestamp, value]) => {
				if (acc[timestamp])
					acc[String(timestamp)] = {
						...acc[String(timestamp)],
						[name]: value
					}
				else
					acc[String(timestamp)] = {
						[name]: value,
						date: String(timestamp)
					}
			})
			return acc
		}, {} as IJSON<IJoin2ReturnType[number]>)
	).map<IJoin2ReturnType[number]>((bar) => {
		const date = bar.date
		delete bar.date
		const ordredItems = Object.entries(bar)
		return {
			date,
			...ordredItems.reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {} as IJoin2ReturnType[number])
		}
	})

export function notUndefined<T>(x: T | undefined): x is T {
	return x !== undefined
}

export function formatOverviewProtocolsList() {}
