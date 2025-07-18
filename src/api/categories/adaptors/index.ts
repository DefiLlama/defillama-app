import type { IParentProtocol } from '~/api/types'
import { DIMENISIONS_SUMMARY_BASE_API, DIMENISIONS_OVERVIEW_API } from '~/constants'
import { getUniqueArray } from '~/containers/DimensionAdapters/utils'
import { capitalizeFirstLetter, getBlockExplorer, getPercentChange, slug } from '~/utils'
import { getAPIUrl } from './client'
import { IGetOverviewResponseBody, IJSON, ProtocolAdaptorSummaryResponse } from './types'

import { fetchJson } from '~/utils/async'

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

/* export const getDex = async (dexName: string): Promise<IDexResponse> =>
	await fetchJson(`${DEX_BASE_API}/${dexName}`)

export const getDexs = (): Promise<IGetDexsResponseBody> => fetchJson(`${DEXS_API}?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`) */

// - used in /[dex]
/* export async function getDexPageData(dex: string) {
	const dexResponse = await fetchJson(`${DEX_BASE_API}/${dex}`)

	return {
		props: dexResponse
	}
} */
export const getOverviewItem = (
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
export const getOverview = (
	type: string,
	chain?: string,
	dataType?: string,
	includeTotalDataChart?: boolean,
	fullChart?: boolean
): Promise<IGetOverviewResponseBody> =>
	fetchJson(getAPIUrl(type, chain, !includeTotalDataChart, true, dataType, fullChart))

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
		dailyRevenue: secondType?.status === 'fulfilled' ? secondType.value?.total24h ?? null : null,
		dailyBribesRevenue: thirdType?.status === 'fulfilled' ? thirdType.value?.total24h ?? null : null,
		dailyTokenTaxes: fourthType?.status === 'fulfilled' ? fourthType.value?.total24h ?? null : null,
		totalAllTimeTokenTaxes: fourthType?.status === 'fulfilled' ? fourthType.value?.totalAllTime ?? null : null,
		totalAllTimeBribes: thirdType?.status === 'fulfilled' ? thirdType.value?.totalAllTime ?? null : null,
		type: adapterType,
		totalDataChart: [joinCharts2(...allCharts), allCharts.map(([label]) => label)],
		blockExplorers
	}
}

export const groupProtocolsByParent = ({
	parentProtocols,
	protocols,
	type,
	enabledSettings,
	total24h
}: {
	parentProtocols: Array<IParentProtocol>
	protocols: IOverviewProps['protocols']
	type: IOverviewProps['type']
	enabledSettings: Record<string, boolean>
	total24h?: number
}) => {
	const parentProtocolsMap = parentProtocols?.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {}) ?? {}
	const finalProtocolsList = protocols.reduce((acc, protocol) => {
		let mainRow

		if (protocol.parentProtocol && parentProtocolsMap[protocol.parentProtocol]) {
			mainRow = { ...(acc[protocol.parentProtocol] || parentProtocolsMap[protocol.parentProtocol]) }

			if (!protocol.total24h) protocol.total24h = 0

			const subRows = [...(acc[protocol.parentProtocol]?.subRows ?? []), protocol]

			mainRow.total24h = subRows.reduce(reduceSumByAttribute('total24h'), null)
			mainRow.total7d = subRows.reduce(reduceSumByAttribute('total7d'), null)
			mainRow.total30d = subRows.reduce(reduceSumByAttribute('total30d'), null)
			mainRow.total1y = subRows.reduce(reduceSumByAttribute('total1y'), null)
			mainRow.average1y = subRows.reduce(reduceSumByAttribute('average1y'), null)
			mainRow.totalAllTime = subRows.reduce(reduceSumByAttribute('totalAllTime'), null)
			mainRow.totalAllTimeBribes = subRows.reduce(reduceSumByAttribute('totalAllTimeBribes'), null)
			mainRow.totalAllTimeTokenTax = subRows.reduce(reduceSumByAttribute('totalAllTimeTokenTax'), null)
			const total48hto24h = subRows.reduce(reduceSumByAttribute('total48hto24h'), null)
			const total7DaysAgo = subRows.reduce(reduceSumByAttribute('total7DaysAgo'), null)
			const total30DaysAgo = subRows.reduce(reduceSumByAttribute('total30DaysAgo'), null)
			mainRow.change_1d = getPercentChange(mainRow.total24h, total48hto24h)
			mainRow.change_7d = getPercentChange(mainRow.total24h, total7DaysAgo)
			mainRow.change_1m = getPercentChange(mainRow.total24h, total30DaysAgo)
			mainRow.tvl = subRows.reduce(reduceSumByAttribute('tvl'), null)
			mainRow.revenue24h = subRows.reduce(reduceSumByAttribute('revenue24h'), null)
			mainRow.revenue7d = subRows.reduce(reduceSumByAttribute('revenue7d'), null)
			mainRow.revenue30d = subRows.reduce(reduceSumByAttribute('revenue30d'), null)
			mainRow.bribes24h = subRows.reduce(reduceSumByAttribute('bribes24h'), null)
			mainRow.bribes7d = subRows.reduce(reduceSumByAttribute('bribes7d'), null)
			mainRow.bribes30d = subRows.reduce(reduceSumByAttribute('bribes30d'), null)
			mainRow.bribes1y = subRows.reduce(reduceSumByAttribute('bribes1y'), null)
			mainRow.tokenTax24h = subRows.reduce(reduceSumByAttribute('tokenTax24h'), null)
			mainRow.tokenTax7d = subRows.reduce(reduceSumByAttribute('tokenTax7d'), null)
			mainRow.tokenTax30d = subRows.reduce(reduceSumByAttribute('tokenTax30d'), null)
			mainRow.tokenTax1y = subRows.reduce(reduceSumByAttribute('tokenTax1y'), null)
			mainRow.revenue1y = subRows.reduce(reduceSumByAttribute('revenue1y'), null)
			mainRow.averageRevenue1y = subRows.reduce(reduceSumByAttribute('averageRevenue1y'), null)
			mainRow.dailyRevenue = subRows.reduce(reduceSumByAttribute('dailyRevenue'), null)
			mainRow.dailyUserFees = subRows.reduce(reduceSumByAttribute('dailyUserFees'), null)
			mainRow.dailyCreatorRevenue = subRows.reduce(reduceSumByAttribute('dailyCreatorRevenue'), null)
			mainRow.dailyHoldersRevenue = subRows.reduce(reduceSumByAttribute('dailyHoldersRevenue'), null)
			mainRow.holdersRevenue7d = subRows.reduce(reduceSumByAttribute('holdersRevenue7d'), null)
			mainRow.holdersRevenue30d = subRows.reduce(reduceSumByAttribute('holdersRevenue30d'), null)
			mainRow.dailyPremiumVolume = subRows.reduce(reduceSumByAttribute('dailyPremiumVolume'), null)
			mainRow.dailyProtocolRevenue = subRows.reduce(reduceSumByAttribute('dailyProtocolRevenue'), null)
			mainRow.dailySupplySideRevenue = subRows.reduce(reduceSumByAttribute('dailySupplySideRevenue'), null)
			mainRow.bribes24h = subRows.reduce(reduceSumByAttribute('bribes24h'), null)

			// mainRow.mcap = subRows.reduce(reduceSumByAttribute('mcap'), null)
			mainRow.chains = getUniqueArray(subRows.map((d) => d.chains).flat())
			mainRow.methodology = getParentProtocolMethodology(
				mainRow.displayName,
				subRows.map((r) => r.displayName)
			)
			const total14dto7d = subRows.reduce(reduceSumByAttribute('total14dto7d'), null)
			mainRow.change_7dover7d = ((mainRow.total7d - total14dto7d) / total14dto7d) * 100
			mainRow.pf = getAnnualizedRatio(mainRow.mcap, mainRow.total30d)
			mainRow.ps = getAnnualizedRatio(mainRow.mcap, mainRow.revenue30d)
			mainRow.subRows = subRows
			mainRow.displayName =
				parentProtocolsMap[protocol.parentProtocol].displayName ?? parentProtocolsMap[protocol.parentProtocol].name
		} else mainRow = { ...protocol }

		// Computed stats
		mainRow.volumetvl = mainRow.total24h !== null && mainRow.tvl !== null ? mainRow.total24h / mainRow.tvl : null

		if (total24h) {
			mainRow.dominance = (100 * mainRow.total24h) / total24h
		}

		if (type === 'fees') {
			let total24h = mainRow.total24h
			let total7d = mainRow.total7d
			let total30d = mainRow.total30d
			let total1y = mainRow.total1y
			let totalAllTime = mainRow.totalAllTime

			let revenue24h = mainRow.revenue24h
			let revenue7d = mainRow.revenue7d
			let revenue30d = mainRow.revenue30d
			let revenue1y = mainRow.revenue1y

			let dailyHoldersRevenue = mainRow.dailyHoldersRevenue
			let holdersRevenue7d = mainRow.holdersRevenue7d
			let holdersRevenue30d = mainRow.holdersRevenue30d

			if (enabledSettings.bribes && mainRow.bribes24h != null) {
				total24h = total24h + (enabledSettings.bribes ? mainRow.bribes24h ?? 0 : 0)
				total7d = total7d + (enabledSettings.bribes ? mainRow.bribes7d ?? 0 : 0)
				total30d = total30d + (enabledSettings.bribes ? mainRow.bribes30d ?? 0 : 0)
				total1y = total1y + (enabledSettings.bribes ? mainRow.bribes1y ?? 0 : 0)
				totalAllTime = totalAllTime + (enabledSettings.bribes ? mainRow.totalAllTimeBribes ?? 0 : 0)

				revenue24h = (revenue24h ?? 0) + (enabledSettings.bribes ? mainRow.bribes24h ?? 0 : 0)
				revenue7d = (revenue7d ?? 0) + (enabledSettings.bribes ? mainRow.bribes7d ?? 0 : 0)
				revenue30d = (revenue30d ?? 0) + (enabledSettings.bribes ? mainRow.bribes30d ?? 0 : 0)
				revenue1y = (revenue1y ?? 0) + (enabledSettings.bribes ? mainRow.bribes1y ?? 0 : 0)

				dailyHoldersRevenue = +dailyHoldersRevenue + (enabledSettings.bribes ? mainRow.bribes24h ?? 0 : 0)
				holdersRevenue7d = +holdersRevenue7d + (enabledSettings.bribes ? mainRow.bribes7d ?? 0 : 0)
				holdersRevenue30d = +holdersRevenue30d + (enabledSettings.bribes ? mainRow.bribes30d ?? 0 : 0)
			}

			if (enabledSettings.tokentax && mainRow.tokenTax24h != null) {
				total24h = total24h + (enabledSettings.tokentax ? mainRow.tokenTax24h ?? 0 : 0)
				total7d = total7d + (enabledSettings.tokentax ? mainRow.tokenTax7d ?? 0 : 0)
				total30d = total30d + (enabledSettings.tokentax ? mainRow.tokenTax30d ?? 0 : 0)
				total1y = total1y + (enabledSettings.tokentax ? mainRow.tokenTax1y ?? 0 : 0)
				totalAllTime = totalAllTime + (enabledSettings.tokentax ? mainRow.totalAllTimeTokenTax ?? 0 : 0)

				revenue24h = (revenue24h ?? 0) + (enabledSettings.tokentax ? mainRow.tokenTax24h ?? 0 : 0)
				revenue7d = (revenue7d ?? 0) + (enabledSettings.tokentax ? mainRow.tokenTax7d ?? 0 : 0)
				revenue30d = (revenue30d ?? 0) + (enabledSettings.tokentax ? mainRow.tokenTax30d ?? 0 : 0)
				revenue1y = (revenue1y ?? 0) + (enabledSettings.tokentax ? mainRow.tokenTax1y ?? 0 : 0)
			}

			mainRow.total24h = total24h
			mainRow.total7d = total7d
			mainRow.total30d = total30d
			mainRow.total1y = total1y
			mainRow.totalAllTime = totalAllTime

			mainRow.revenue24h = revenue24h
			mainRow.revenue30d = revenue30d
			mainRow.revenue7d = revenue7d
			mainRow.revenue1y = revenue1y

			mainRow.dailyHoldersRevenue = dailyHoldersRevenue
			mainRow.holdersRevenue7d = holdersRevenue7d
			mainRow.holdersRevenue30d = holdersRevenue30d

			mainRow.pf = getAnnualizedRatio(mainRow.mcap, total30d)
			mainRow.ps = getAnnualizedRatio(mainRow.mcap, revenue30d)
		}

		acc[protocol.parentProtocol ?? protocol.module] = mainRow
		return acc
	}, {} as IJSON<IOverviewProps['protocols'][number]>)

	return Object.values(finalProtocolsList) as IOverviewProps['protocols']
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
	if (curr[attribute]) {
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

export const getFeesAndRevenueByChain = async ({
	chain,
	excludeTotalDataChart,
	excludeTotalDataChartBreakdown
}: {
	chain?: string
	excludeTotalDataChart: boolean
	excludeTotalDataChartBreakdown: boolean
}) => {
	const apiUrl =
		chain && chain !== 'All'
			? `${DIMENISIONS_SUMMARY_BASE_API}/fees/${slug(
					chain
			  )}?excludeTotalDataChart=${excludeTotalDataChart}&excludeTotalDataChartBreakdown=${excludeTotalDataChartBreakdown}`
			: null

	const [fees, revenue] = await Promise.all([
		apiUrl
			? fetchJson(apiUrl).catch((err) => {
					console.log('Error at ', apiUrl, err)
					return null
			  })
			: null,
		apiUrl
			? fetchJson(`${apiUrl}&dataType=dailyRevenue`).catch((err) => {
					console.log('Error at ', apiUrl + '&dataType=dailyRevenue', err)
					return null
			  })
			: null
	])

	return { fees, revenue }
}

export const getAppRevenueByChain = async ({
	chain,
	excludeTotalDataChart = true,
	excludeTotalDataChartBreakdown = true
}: {
	chain?: string
	excludeTotalDataChart?: boolean
	excludeTotalDataChartBreakdown?: boolean
}) => {
	const apiUrl = `${DIMENISIONS_OVERVIEW_API}/fees${
		chain && chain !== 'All' ? '/' + slug(chain) : ''
	}?excludeTotalDataChart=${excludeTotalDataChart}&excludeTotalDataChartBreakdown=${excludeTotalDataChartBreakdown}&dataType=dailyAppRevenue`

	const revenue = await fetchJson(apiUrl).catch((err) => {
		console.log('Error at ', apiUrl, err)
		return null
	})

	return {
		totalAppRevenue24h: revenue?.total24h ?? null,
		totalDataChart: revenue?.totalDataChart ?? [],
		protocols: revenue?.protocols ?? [],
		chain
	}
}

export const getAppFeesByChain = async ({
	chain,
	excludeTotalDataChart = true,
	excludeTotalDataChartBreakdown = true
}: {
	chain?: string
	excludeTotalDataChart?: boolean
	excludeTotalDataChartBreakdown?: boolean
}) => {
	const apiUrl = `${DIMENISIONS_OVERVIEW_API}/fees${
		chain && chain !== 'All' ? '/' + slug(chain) : ''
	}?excludeTotalDataChart=${excludeTotalDataChart}&excludeTotalDataChartBreakdown=${excludeTotalDataChartBreakdown}&dataType=dailyAppFees`

	const fees = await fetchJson(apiUrl).catch((err) => {
		console.log('Error at ', apiUrl, err)
		return null
	})

	return {
		totalAppFees24h: fees?.total24h ?? null,
		totalDataChart: fees?.totalDataChart ?? [],
		protocols: fees?.protocols ?? [],
		chain
	}
}

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
						holdersRevenue24h: holdersRevenue?.[protocol.name]?.total24h ?? null,
						holdersRevenue30d: holdersRevenue?.[protocol.name]?.total30d ?? null
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
