import { V2_SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import { IProtocolChartV2, IProtocolChartV2Params, IProtocolMetricsV2 } from './api.types'

export const appendOptionalQueryParams = (url: string, params: Pick<IProtocolChartV2Params, 'key' | 'currency'>) => {
	const searchParams = new URLSearchParams()

	if (params.key) searchParams.set('key', params.key)
	if (params.currency) searchParams.set('currency', params.currency)

	const query = searchParams.toString()
	return query ? `${url}?${query}` : url
}

export const normalizeProtocolChart = (values: unknown): IProtocolChartV2 | null => {
	if (!Array.isArray(values)) return null

	const points: IProtocolChartV2 = []
	for (const item of values) {
		if (!Array.isArray(item) || item.length < 2) continue

		const [timestamp, value] = item
		const numericTimestamp = Number(timestamp)
		const numericValue = Number(value)

		if (!Number.isFinite(numericTimestamp) || !Number.isFinite(numericValue)) continue

		points.push([numericTimestamp < 1e12 ? numericTimestamp * 1e3 : numericTimestamp, numericValue])
	}

	return points.sort((a, b) => a[0] - b[0])
}

export const fetchProtocolOverviewMetrics = async (protocol: string): Promise<IProtocolMetricsV2 | null> => {
	return fetchJson(`${V2_SERVER_URL}/metrics/tvl/protocol/${protocol}`)
		.then((data) => data as IProtocolMetricsV2)
		.catch(() => null)
}

export const fetchProtocolTvlChart = async ({
	protocol,
	key,
	currency,
	breakdownType
}: IProtocolChartV2Params): Promise<IProtocolChartV2 | null> => {
	const baseUrl =
		`${V2_SERVER_URL}/chart/tvl/protocol/${protocol}${breakdownType ? `/${breakdownType}` : ''}`.replaceAll('#', '$')
	const finalUrl = appendOptionalQueryParams(baseUrl, { key, currency })

	return fetchJson(finalUrl)
		.then((values) => normalizeProtocolChart(values))
		.catch(() => null)
}
