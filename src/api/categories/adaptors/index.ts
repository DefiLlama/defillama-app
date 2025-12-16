import type { IParentProtocol } from '~/api/types'
import { DIMENSIONS_OVERVIEW_API } from '~/constants'
import { slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { IGetOverviewResponseBody, IJSON, ProtocolAdaptorSummaryResponse } from './types'

export const getAnnualizedRatio = (numerator?: number | null, denominator?: number | null) => {
	if (numerator && denominator && numerator !== null && denominator !== null)
		return Number((numerator / (denominator * 12)).toFixed(2))
	return null
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

export type IJoin2ReturnType = Array<IJSON<number | string> & { date: string }>

// - used in /fees and /fees/chain/[chain]
export const getFeesAndRevenueProtocolsByChain = async ({ chain }: { chain?: string }) => {
	const apiUrl = `${DIMENSIONS_OVERVIEW_API}/fees${
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
						feesChange_1d: protocol?.change_1d ?? null,
						feesChange_7d: protocol?.change_7d ?? null,
						feesChange_1m: protocol?.change_1m ?? null,
						feesChange_7dover7d: protocol?.change_7dover7d ?? null,
						feesChange_30dover30d: protocol?.change_30dover30d ?? null,
						revenueChange_1d: revenue?.[protocol.name]?.change_1d ?? null,
						revenueChange_7d: revenue?.[protocol.name]?.change_7d ?? null,
						revenueChange_1m: revenue?.[protocol.name]?.change_1m ?? null,
						revenueChange_7dover7d: revenue?.[protocol.name]?.change_7dover7d ?? null,
						revenueChange_30dover30d: revenue?.[protocol.name]?.change_30dover30d ?? null,
						holdersRevenue24h: holdersRevenue?.[protocol.name]?.total24h ?? null,
						holdersRevenue30d: holdersRevenue?.[protocol.name]?.total30d ?? null,
						holdersRevenueChange_7dover7d: holdersRevenue?.[protocol.name]?.change_7dover7d ?? null,
						holdersRevenueChange_30dover30d: holdersRevenue?.[protocol.name]?.change_30dover30d ?? null,
						pf: protocol?.pf ?? null,
						ps: protocol?.ps ?? null
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
		`${DIMENSIONS_OVERVIEW_API}/dexs${
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
		`${DIMENSIONS_OVERVIEW_API}/derivatives${
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
		`${DIMENSIONS_OVERVIEW_API}/open-interest${
			chain && chain !== 'All' ? '/' + slug(chain) : ''
		}?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=openInterestAtEnd`
	).catch((err) => {
		console.log(err)
		return null
	})

	return data
}
