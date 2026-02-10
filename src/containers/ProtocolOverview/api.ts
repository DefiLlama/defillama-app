import { V2_SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import { IProtocolChartV2, IProtocolChartV2Params, IProtocolMetricsV2 } from './api.types'

export const appendOptionalQueryParams = (url: string, params: Pick<IProtocolChartV2Params, 'key' | 'currency'>) => {
	const parsedUrl = new URL(url, 'http://placeholder')
	if (params.key) parsedUrl.searchParams.set('key', params.key)
	if (params.currency) parsedUrl.searchParams.set('currency', params.currency)
	const isAbsoluteUrl = /^https?:\/\//.test(url)
	return isAbsoluteUrl
		? `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}${parsedUrl.search}`
		: `${parsedUrl.pathname}${parsedUrl.search}`
}

// TODO need to update on server
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

export const fetchProtocolTreasuryChart = async ({
	protocol,
	key,
	currency,
	breakdownType
}: IProtocolChartV2Params): Promise<IProtocolChartV2 | null> => {
	const baseUrl =
		`${V2_SERVER_URL}/chart/treasury/protocol/${protocol}${breakdownType ? `/${breakdownType}` : ''}`.replaceAll(
			'#',
			'$'
		)
	const finalUrl = appendOptionalQueryParams(baseUrl, { key, currency })

	return fetchJson(finalUrl)
		.then((values) => normalizeProtocolChart(values))
		.catch(() => null)
}
