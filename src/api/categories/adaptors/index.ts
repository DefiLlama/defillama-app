import type { IParentProtocol } from '~/api/types'
import {
	PROTOCOLS_API,
	DIMENISIONS_SUMMARY_BASE_API,
	MCAPS_API,
	EMISSION_BREAKDOWN_API,
	DIMENISIONS_OVERVIEW_API
} from '~/constants'
import { getUniqueArray } from '~/containers/DimensionAdapters/utils'
import {
	capitalizeFirstLetter,
	chainIconUrl,
	getBlockExplorer,
	getPercentChange,
	iterateAndRemoveUndefined,
	slug
} from '~/utils'
import { getAPIUrl } from './client'
import { IGetOverviewResponseBody, IJSON, ProtocolAdaptorSummary, ProtocolAdaptorSummaryResponse } from './types'

import { fetchJson } from '~/utils/async'
import { sluggify } from '~/utils/cache-client'
import { getCexVolume } from '~/containers/DimensionAdapters/queries'
import { ILiteProtocol } from '~/containers/ChainOverview/types'

export enum ADAPTOR_TYPES {
	DEXS = 'dexs',
	FEES = 'fees',
	AGGREGATORS = 'aggregators',
	PERPS = 'derivatives',
	PERPS_AGGREGATOR = 'derivatives-aggregator',
	OPTIONS = 'options',
	BRIDGE_AGGREGATORS = 'bridge-aggregators'
}

export const VOLUME_TYPE_ADAPTORS = [
	'dexs',
	'derivatives',
	'options',
	'aggregators',
	'derivatives-aggregator',
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
		`${DIMENISIONS_SUMMARY_BASE_API}/${type === 'derivatives-aggregator' ? 'aggregator-derivatives' : type}/${slug(
			protocolName
		)}${dataType ? `?dataType=${dataType}` : ''}`
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
		promises.push(getOverviewItem(adapterType, protocolName, 'dailyRevenue'))
		if (metadata?.bribeRevenue) promises.push(getOverviewItem(adapterType, protocolName, 'dailyBribesRevenue'))
		if (metadata?.tokenTax) promises.push(getOverviewItem(adapterType, protocolName, 'dailyTokenTaxes'))
		secondLabel = 'Revenue'
	} else if (adapterType === 'options') {
		promises.push(getOverviewItem(adapterType, protocolName, 'dailyNotionalVolume'))
		secondLabel = 'Notional volume'
	}
	const [firstType, secondType, thirdType, fourthType] = await Promise.all(promises)

	if (firstType?.totalDataChart) allCharts.push([label, firstType.totalDataChart])

	if (secondLabel && secondType?.totalDataChart) {
		allCharts.push([secondLabel, secondType.totalDataChart])
	}

	if (thirdType?.totalDataChart && !(thirdType.totalDataChart.length === 1 && thirdType.totalDataChart[0][1] === 0)) {
		allCharts.push(['Bribes', thirdType.totalDataChart])
	}

	if (
		fourthType?.totalDataChart &&
		!(fourthType.totalDataChart.length === 1 && fourthType.totalDataChart[0][1] === 0)
	) {
		allCharts.push(['TokenTax', fourthType.totalDataChart])
	}

	const blockExplorers = (firstType.allAddresses ?? (firstType.address ? [firstType.address] : [])).map((address) => {
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
		...firstType,
		logo: getLlamaoLogo(firstType.logo),
		dailyRevenue: secondType?.total24h ?? null,
		dailyBribesRevenue: thirdType?.total24h ?? null,
		dailyTokenTaxes: fourthType?.total24h ?? null,
		totalAllTimeTokenTaxes: fourthType?.totalAllTime ?? null,
		totalAllTimeBribes: thirdType?.totalAllTime ?? null,
		type: adapterType,
		totalDataChart: [joinCharts2(...allCharts), allCharts.map(([label]) => label)],
		blockExplorers
	}
}

function getMCap(protocolsData: {
	protocols: Array<ILiteProtocol>
	parentProtocols: Array<{ name: string; mcap?: number }>
}) {
	return {
		...(protocolsData?.protocols?.reduce((acc, pd) => {
			acc[pd.name] = pd.mcap
			return acc
		}, {}) ?? {}),
		...(protocolsData?.parentProtocols?.reduce((acc, pd) => {
			acc[pd.name] = pd.mcap
			return acc
		}, {}) ?? {})
	}
}

function getTVLData(protocolsData: { protocols: Array<ILiteProtocol> }, chain?: string) {
	const protocolsRaw = chain
		? protocolsData?.protocols.map((p) => ({
				...p,
				tvl: p?.chainTvls?.[chain]?.tvl ?? null
		  }))
		: protocolsData?.protocols
	return (
		protocolsRaw?.reduce((acc, pd) => {
			acc[pd.name] = pd.tvl
			return acc
		}, {}) ?? {}
	)
}

// - used in /[type] and /[type]/chain/[chain]
export const getDimensionAdapterChainPageData = async (type: string, chain?: string): Promise<IOverviewProps> => {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const { chainMetadata } = metadataCache

	if (chain && !chainMetadata[slug(chain)][type === 'derivatives-aggregator' ? 'aggregator-derivatives' : type]) {
		return null
	}

	const [
		request,
		protocolsData,
		feesOrRevenue,
		cexVolume,
		emissionBreakdown,
		bribesData,
		holdersRevenueData,
		tokenTaxData
	]: [
		IGetOverviewResponseBody,
		{ protocols: Array<ILiteProtocol>; parentProtocols: IParentProtocol[] },
		IGetOverviewResponseBody,
		number,
		Record<string, Record<string, number>>,
		IGetOverviewResponseBody,
		IGetOverviewResponseBody,
		IGetOverviewResponseBody
	] = await Promise.all([
		fetchJson(getAPIUrl(type, chain, type === 'fees', true)),
		fetchJson(PROTOCOLS_API),
		type === 'options'
			? fetchJson(getAPIUrl(type, chain, false, true, 'dailyPremiumVolume'))
			: type === 'fees'
			? fetchJson(getAPIUrl(type, chain, true, true, 'dailyRevenue') + '&a=19')
			: Promise.resolve({}),
		type === 'dexs' ? getCexVolume() : Promise.resolve(0),
		fetchJson(EMISSION_BREAKDOWN_API),
		type === 'fees'
			? fetchJson(getAPIUrl(type, chain, true, true, 'dailyBribesRevenue'))
			: Promise.resolve({ protocols: [] }),
		type === 'fees'
			? fetchJson(getAPIUrl(type, chain, true, true, 'dailyHoldersRevenue'))
			: Promise.resolve({ protocols: [] }),
		type === 'fees'
			? fetchJson(getAPIUrl(type, chain, true, true, 'dailyTokenTaxes'))
			: Promise.resolve({ protocols: [] })
	])

	const {
		protocols = [],
		total24h = null,
		total7d = null,
		total1y = null,
		average1y = null,
		change_1d = null,
		change_7d = null,
		change_1m = null,
		chain: filtredChain,
		change_7dover7d = null,
		totalDataChart,
		totalDataChartBreakdown,
		allChains
	} = type === 'options' ? feesOrRevenue : request

	const chains = protocols
		.filter((e) => e.protocolType === 'chain')
		.map((e) => [e.name, chainMetadata[slug(e.name)]?.gecko_id ?? null])
		.filter((e) => (e[1] ? true : false))

	const chainMcaps = await fetchJson(MCAPS_API, {
		method: 'POST',
		body: JSON.stringify({
			coins: chains.map(([_, geckoId]) => `coingecko:${geckoId}`)
		})
	}).catch((err) => {
		console.log('Failed to fetch mcaps by chain')
		console.log(err)
		return {}
	})

	const chainMcap =
		chains?.reduce((acc, [chain, geckoId]) => {
			if (geckoId) {
				acc[chain] = chainMcaps[`coingecko:${geckoId}`]?.mcap ?? null
			}
			return acc
		}, {}) ?? {}

	const tvlData: IJSON<number> = getTVLData(protocolsData, filtredChain)
	const mcapData = { ...getMCap(protocolsData), ...chainMcap }
	const label: string = type === 'options' ? 'Premium Volume' : capitalizeFirstLetter(type)

	const allCharts: IChartsList = []

	if (totalDataChart) {
		allCharts.push([label, totalDataChart])
	}

	if (type === 'options' && feesOrRevenue?.totalDataChart) {
		allCharts.push(['Notional Volume', request.totalDataChart])
	}

	const revenueProtocols =
		type === 'fees'
			? feesOrRevenue?.protocols?.reduce(
					(acc, protocol) => ({ ...acc, [protocol.name]: protocol }),
					{} as IJSON<ProtocolAdaptorSummary>
			  ) ?? {}
			: {}

	const holderRevenueProtocols =
		type === 'fees'
			? holdersRevenueData?.protocols?.reduce(
					(acc, protocol) => ({ ...acc, [protocol.name]: protocol }),
					{} as IJSON<ProtocolAdaptorSummary>
			  ) ?? {}
			: {}

	const { parentProtocols } = protocolsData

	const finalProtocolsList: IJSON<IOverviewProps['protocols'][number]> = protocols.reduce((acc, protocol) => {
		// Assign mainrow and sub-row if has any
		const slugName = sluggify(protocol.name)

		// Main row, either parent or single protocol
		const protocolTVL = tvlData[protocol.name]
		const emission24h = emissionBreakdown?.[slugName]?.emission24h ?? null
		const emission7d = emissionBreakdown?.[slugName]?.emission7d ?? null
		const emission30d = emissionBreakdown?.[slugName]?.emission30d ?? null

		const protocolBribes = bribesData?.protocols?.find(({ name }) => name === protocol.name)

		const holdersRev = holderRevenueProtocols?.[protocol.name]

		const protocolTokenTax = tokenTaxData?.protocols?.find(({ name }) => name === protocol.name)

		const mainRow: IOverviewProps['protocols'][number] = {
			...protocol,
			...(protocol.parentProtocol ? acc[protocol.parentProtocol] : {}),
			logo: getLlamaoLogo(protocol.logo),
			category: protocol.category ?? null,
			displayName: protocol.displayName ?? protocol.name,
			revenue24h: revenueProtocols?.[protocol.name]?.total24h ?? null,
			revenue7d: revenueProtocols?.[protocol.name]?.total7d ?? null,
			revenue30d: revenueProtocols?.[protocol.name]?.total30d ?? null,
			revenue1y: revenueProtocols?.[protocol.name]?.total1y ?? null,
			averageRevenue1y: revenueProtocols?.[protocol.name]?.average1y ?? null,
			emission24h: emission24h ?? null,
			emission7d: emission7d ?? null,
			emission30d: emission30d ?? null,
			bribes24h: protocolBribes?.total24h ?? null,
			bribes7d: protocolBribes?.total7d ?? null,
			bribes30d: protocolBribes?.total30d ?? null,
			bribes1y: protocolBribes?.total1y ?? null,
			tokenTax24h: protocolTokenTax?.total24h ?? null,
			tokenTax7d: protocolTokenTax?.total7d ?? null,
			tokenTax30d: protocolTokenTax?.total30d ?? null,
			tokenTax1y: protocolTokenTax?.total1y ?? null,
			totalAllTimeBribes: protocolBribes?.totalAllTime ?? null,
			totalAllTimeTokenTax: protocolTokenTax?.totalAllTime ?? null,
			dailyHoldersRevenue: holdersRev?.total24h ?? null,
			holdersRevenue7d: holdersRev?.total7d ?? null,
			holdersRevenue30d: holdersRev?.total30d ?? null,
			netEarnings24h:
				emission24h !== 0 && emission24h ? revenueProtocols?.[protocol.name]?.total24h - emission24h : null,
			netEarnings7d: emission7d !== 0 && emission7d ? revenueProtocols?.[protocol.name]?.total7d - emission7d : null,
			netEarnings30d:
				emission30d !== 0 && emission30d ? revenueProtocols?.[protocol.name]?.total30d - emission30d : null,
			tvl: protocolTVL ?? null,
			dominance: (100 * protocol.total24h) / total24h,
			module: protocol.module,
			dailyUserFees: protocol.dailyUserFees ?? null,
			mcap: mcapData[protocol.name] || null,
			pf: getAnnualizedRatio(mcapData[protocol.name], protocol.total30d),
			ps: getAnnualizedRatio(mcapData[protocol.name], revenueProtocols?.[protocol.name]?.total30d)
		}

		// Computed stats
		mainRow.volumetvl = mainRow.total24h !== null && mainRow.tvl !== null ? mainRow.total24h / mainRow.tvl : null

		mainRow.dominance = (100 * mainRow.total24h) / total24h

		// Return acc
		acc[protocol.name] = mainRow
		return acc
	}, {} as IJSON<IOverviewProps['protocols'][number]>)

	// if (type === 'fees') {
	// 	nftsEarnings?.earnings?.forEach((nft) => {
	// 		if (chain && !nft.chains?.some((c) => c?.toLowerCase() === chain)) return
	// 		const { total24h, total7d, total30d } = nft

	// 		if (nft.subRows?.length > 0) {
	// 			nft.logo = nft.subRows[0].logo || nft.logo || null
	// 			nft.subRows.forEach((subRow) => {
	// 				subRow.category = 'NFT'
	// 				subRow.revenue24h = subRow.total24h
	// 				subRow.revenue7d = subRow.total7d
	// 				subRow.revenue30d = subRow.total30d
	// 			})
	// 		}
	// 		nft.category = 'NFT'
	// 		nft.revenue24h = total24h
	// 		nft.revenue7d = total7d
	// 		nft.revenue30d = total30d
	// 		finalProtocolsList[nft.defillamaId] = nft
	// 	})
	// }

	/* 	if (revenue?.totalDataChart) 
			allCharts.push(["Revenue", revenue.totalDataChart]) */

	return iterateAndRemoveUndefined({
		protocols: Object.values(finalProtocolsList) as IOverviewProps['protocols'],
		parentProtocols,
		total24h,
		total7d,
		change_1d,
		change_7d,
		change_1m,
		change_7dover7d,
		total1y: total1y ?? null,
		average1y: average1y ?? null,
		totalDataChart: [joinCharts2(...allCharts), allCharts.map(([label]) => label)],
		chain: filtredChain ?? null,
		tvlData,
		totalDataChartBreakdown: totalDataChartBreakdown ?? [],
		allChains,
		dexsDominance: cexVolume ? +((total24h / (cexVolume + total24h)) * 100).toFixed(2) : null,
		type
	})
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

// - used in /[type]/chains
export const getDimensionsAdaptersChainsPageData = async (type: string, dataType?: string): Promise<IOverviewProps> => {
	const { allChains, total24h: allChainsTotal24h } = await getOverview(type)

	const [protocolsData, ...dataByChain] = await Promise.all([
		fetchJson(PROTOCOLS_API).catch((err) => {
			console.log(PROTOCOLS_API, err)
			return {}
		}),
		...allChains.map(
			(
				chain // TODO: replace this with single endpoint
			) =>
				getOverview(type, chain, dataType, true, true).then((res) => ({
					...res,
					chain
				}))
		)
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
				dailyPremiumVolume,
				total1y,
				average1y
			}) => {
				if (!protocols) return undefined
				const tvlData = getTVLData(protocolsData, chain)
				return {
					name: chain,
					displayName: chain,
					disabled: null,
					logo: chainIconUrl(chain),
					total24h: total24h ?? null,
					tvl: protocols.reduce((acc, curr) => {
						// TODO: This should be mapped using defillamaId to get accurate tvl!
						const tvl = tvlData[curr.name]
						acc += !Number.isNaN(tvl) && tvl ? tvl : 0
						return acc
					}, 0),
					change_7dover7d: change_7dover7d ?? null,
					total7d: total7d ?? null,
					total30d: total30d ?? null,
					change_1d: change_1d ?? null,
					change_7d: change_7d ?? null,
					change_1m: change_1m ?? null,
					total1y: total1y ?? null,
					average1y: average1y ?? null,
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
