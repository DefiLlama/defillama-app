import type { IParentProtocol } from '~/api/types'
import { DIMENISIONS_OVERVIEW_API, DIMENISIONS_SUMMARY_BASE_API } from '~/constants'
import { capitalizeFirstLetter, getBlockExplorer, slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { IGetOverviewResponseBody, IJSON, ProtocolAdaptorSummaryResponse } from './types'

export enum ADAPTOR_TYPES {
	DEXS = 'dexs',
	FEES = 'fees',
	AGGREGATORS = 'aggregators',
	PERPS = 'derivatives',
	PERPS_AGGREGATOR = 'aggregator-derivatives',
	OPTIONS = 'options',
	BRIDGE_AGGREGATORS = 'bridge-aggregators'
}

export const VOLUME_TYPE_ADAPTORS = [
	'dexs',
	'derivatives',
	'options',
	'aggregators',
	'aggregator-derivatives',
	'bridge-aggregators'
]

const getOverviewItem = (
	type: string,
	protocolName: string,
	dataType?: string,
	excludeTotalDataChart?: boolean,
	excludeTotalDataChartBreakdown?: boolean
): Promise<ProtocolAdaptorSummaryResponse> => {
	return fetchJson(
		`${DIMENISIONS_SUMMARY_BASE_API}/${type}/${slug(protocolName)}${dataType ? `?dataType=${dataType}` : ''}`
	)
}

export interface ProtocolAdaptorSummaryProps extends Omit<ProtocolAdaptorSummaryResponse, 'totalDataChart'> {
	type: string
	totalDataChart: [IJoin2ReturnType, string[]]
	allAddresses?: Array<string>
	totalAllTimeTokenTaxes?: number
	totalAllTimeBribes?: number
	blockExplorers?: Array<{
		blockExplorerLink: string
		blockExplorerName: string
		chain: string | null
		address: string
	}>
}

export const getDimensionProtocolPageData = async ({
	adapterType,
	protocolName,
	dataType,
	metadata
}: {
	adapterType: string
	protocolName: string
	dataType?: string
	metadata?: any
}): Promise<ProtocolAdaptorSummaryProps> => {
	let label: string
	if (adapterType === 'volumes') {
		label = 'Volume'
	} else if (adapterType === 'options') {
		label = 'Premium volume'
	} else {
		label = capitalizeFirstLetter(adapterType)
	}
	const allCharts: IChartsList = []

	let secondLabel: string
	const promises: Promise<ProtocolAdaptorSummaryResponse | null>[] = [
		getOverviewItem(adapterType, protocolName, dataType)
	]
	if (adapterType === 'fees') {
		if (metadata?.revenue) promises.push(getOverviewItem(adapterType, protocolName, 'dailyRevenue'))
		if (metadata?.bribeRevenue) promises.push(getOverviewItem(adapterType, protocolName, 'dailyBribesRevenue'))
		if (metadata?.tokenTax) promises.push(getOverviewItem(adapterType, protocolName, 'dailyTokenTaxes'))
		secondLabel = 'Revenue'
	} else if (adapterType === 'options') {
		promises.push(getOverviewItem(adapterType, protocolName, 'dailyNotionalVolume'))
		secondLabel = 'Notional volume'
	}
	const [firstType, secondType, thirdType, fourthType] = await Promise.allSettled(promises)

	if (firstType?.status === 'rejected') {
		console.log(firstType.reason)
		return null
	}

	if (firstType?.value?.totalDataChart) allCharts.push([label, firstType.value.totalDataChart])

	if (secondLabel && secondType?.status === 'fulfilled' && secondType.value?.totalDataChart) {
		allCharts.push([secondLabel, secondType.value.totalDataChart])
	}

	if (
		thirdType?.status === 'fulfilled' &&
		thirdType.value?.totalDataChart &&
		!(thirdType.value.totalDataChart.length === 1 && thirdType.value.totalDataChart[0][1] === 0)
	) {
		allCharts.push(['Bribes', thirdType.value.totalDataChart])
	}

	if (
		fourthType?.status === 'fulfilled' &&
		fourthType.value?.totalDataChart &&
		!(fourthType.value.totalDataChart.length === 1 && fourthType.value.totalDataChart[0][1] === 0)
	) {
		allCharts.push(['TokenTax', fourthType.value.totalDataChart])
	}

	const blockExplorers = (
		firstType.value?.allAddresses ?? (firstType.value?.address ? [firstType.value.address] : [])
	).map((address) => {
		const { blockExplorerLink, blockExplorerName } = getBlockExplorer(address)
		const splittedAddress = address.split(':')
		return {
			blockExplorerLink,
			blockExplorerName,
			chain: splittedAddress.length > 1 ? splittedAddress[0] : null,
			address: splittedAddress.length > 1 ? splittedAddress[1] : splittedAddress[0]
		}
	})

	return {
		...firstType.value,
		logo: getLlamaoLogo(firstType.value?.logo),
		dailyRevenue: secondType?.status === 'fulfilled' ? (secondType.value?.total24h ?? null) : null,
		dailyBribesRevenue: thirdType?.status === 'fulfilled' ? (thirdType.value?.total24h ?? null) : null,
		dailyTokenTaxes: fourthType?.status === 'fulfilled' ? (fourthType.value?.total24h ?? null) : null,
		totalAllTimeTokenTaxes: fourthType?.status === 'fulfilled' ? (fourthType.value?.totalAllTime ?? null) : null,
		totalAllTimeBribes: thirdType?.status === 'fulfilled' ? (thirdType.value?.totalAllTime ?? null) : null,
		type: adapterType,
		totalDataChart: [joinCharts2(...allCharts), allCharts.map(([label]) => label)],
		blockExplorers
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
	total1y?: IGetOverviewResponseBody['total1y']
	average1y?: IGetOverviewResponseBody['average1y']
	totalDataChart: [IJoin2ReturnType, string[]]
	chain: string
	tvlData?: IJSON<number>
	totalDataChartBreakdown?: IGetOverviewResponseBody['totalDataChartBreakdown']
	allChains?: IGetOverviewResponseBody['allChains']
	totalAllTime?: ProtocolAdaptorSummaryResponse['totalAllTime']
	type: string
	dexsDominance?: number
	categories?: Array<string>
	isSimpleFees?: boolean
	premium?: IOverviewProps
	parentProtocols?: Array<IParentProtocol>
}

type IChartsList = Array<[string, IGetOverviewResponseBody['totalDataChart']]>
export type IJoin2ReturnType = Array<IJSON<number | string> & { date: string }>
export const joinCharts2 = (...lists: Array<[string, Array<[number, number]>]>): IJoin2ReturnType =>
	Object.values(
		lists.reduce(
			(acc, [name, list]) => {
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
			},
			{} as IJSON<IJoin2ReturnType[number]>
		)
	).map<IJoin2ReturnType[number]>((bar) => {
		const date = bar.date
		delete bar.date
		const orderedItems = Object.entries(bar)
		return {
			date,
			...orderedItems.reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {} as IJoin2ReturnType[number])
		}
	})

// - used in /fees and /fees/chain/[chain]
export const getFeesAndRevenueProtocolsByChain = async ({ chain }: { chain?: string }) => {
	const apiUrl = `${DIMENISIONS_OVERVIEW_API}/fees${
		chain && chain !== 'All' ? '/' + slug(chain) : ''
	}?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`

	const [fees, revenue, holdersRevenue] = await Promise.all([
		fetchJson(apiUrl).catch((err) => {
			console.log('Error at ', apiUrl, err)
			return null
		}),
		fetchJson(`${apiUrl}&dataType=dailyRevenue`)
			.then((res) => {
				return (
					res?.protocols?.reduce((acc, protocol) => {
						if (protocol.category !== 'Chain') {
							acc = { ...acc, [protocol.name]: protocol }
						}
						return acc
					}, {}) ?? {}
				)
			})
			.catch((err) => {
				console.log('Error at ', apiUrl + '&dataType=dailyRevenue', err)
				return null
			}),
		fetchJson(`${apiUrl}&dataType=dailyHoldersRevenue`)
			.then((res) => {
				return (
					res?.protocols?.reduce((acc, protocol) => {
						if (protocol.category !== 'Chain') {
							acc = { ...acc, [protocol.name]: protocol }
						}
						return acc
					}, {}) ?? {}
				)
			})
			.catch((err) => {
				console.log('Error at ', apiUrl + '&dataType=dailyHoldersRevenue', err)
				return null
			})
	])

	// TODO: fix missing parent protocols fees and revenue
	return (
		fees?.protocols?.reduce((acc, protocol) => {
			if (protocol.category !== 'Chain') {
				acc = [
					...acc,
					{
						...protocol,
						category: protocol.category,
						displayName: protocol.displayName ?? protocol.name,
						revenue24h: revenue?.[protocol.name]?.total24h ?? null,
						revenue7d: revenue?.[protocol.name]?.total7d ?? null,
						revenue30d: revenue?.[protocol.name]?.total30d ?? null,
						revenue1y: revenue?.[protocol.name]?.total1y ?? null,
						averageRevenue1y: revenue?.[protocol.name]?.average1y ?? null,
						feesChange_7dover7d: protocol?.change_7dover7d ?? null,
						feesChange_30dover30d: protocol?.change_30dover30d ?? null,
						revenueChange_7dover7d: revenue?.[protocol.name]?.change_7dover7d ?? null,
						revenueChange_30dover30d: revenue?.[protocol.name]?.change_30dover30d ?? null,
						holdersRevenue24h: holdersRevenue?.[protocol.name]?.total24h ?? null,
						holdersRevenue30d: holdersRevenue?.[protocol.name]?.total30d ?? null,
						holdersRevenueChange_7dover7d: holdersRevenue?.[protocol.name]?.change_7dover7d ?? null,
						holdersRevenueChange_30dover30d: holdersRevenue?.[protocol.name]?.change_30dover30d ?? null
					}
				]
			}

			return acc
		}, []) ?? []
	)
}

export const getDexVolumeByChain = async ({
	chain,
	excludeTotalDataChart,
	excludeTotalDataChartBreakdown
}: {
	chain?: string
	excludeTotalDataChart: boolean
	excludeTotalDataChartBreakdown: boolean
}) => {
	const data = await fetchJson(
		`${DIMENISIONS_OVERVIEW_API}/dexs${
			chain && chain !== 'All' ? '/' + slug(chain) : ''
		}?excludeTotalDataChart=${excludeTotalDataChart}&excludeTotalDataChartBreakdown=${excludeTotalDataChartBreakdown}`
	).catch((err) => {
		console.log(err)
		return null
	})

	return data
}

export const getPerpsVolumeByChain = async ({
	chain,
	excludeTotalDataChart,
	excludeTotalDataChartBreakdown
}: {
	chain?: string
	excludeTotalDataChart: boolean
	excludeTotalDataChartBreakdown: boolean
}) => {
	const data = await fetchJson(
		`${DIMENISIONS_OVERVIEW_API}/derivatives${
			chain && chain !== 'All' ? '/' + slug(chain) : ''
		}?excludeTotalDataChart=${excludeTotalDataChart}&excludeTotalDataChartBreakdown=${excludeTotalDataChartBreakdown}`
	).catch((err) => {
		console.log(err)
		return null
	})

	return data
}

export const getOpenInterestByChain = async ({ chain }: { chain?: string }) => {
	const data = await fetchJson(
		`${DIMENISIONS_OVERVIEW_API}/open-interest${
			chain && chain !== 'All' ? '/' + slug(chain) : ''
		}?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=openInterestAtEnd`
	).catch((err) => {
		console.log(err)
		return null
	})

	return data
}
