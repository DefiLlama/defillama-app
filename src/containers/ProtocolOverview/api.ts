import { V2_SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import {
	IProtocolChainBreakdownChart,
	IProtocolChainBreakdownValue,
	IProtocolTokenBreakdownChart,
	IProtocolTokenBreakdownValue,
	IProtocolValueChart,
	IProtocolChartV2Params,
	IProtocolTvlMetrics,
	IProtocolTreasuryMetrics
} from './api.types'

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
const isRecordOfNumbers = (value: unknown): value is Record<string, number> => {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false
	for (const token in value as Record<string, unknown>) {
		if (!Number.isFinite(Number((value as Record<string, unknown>)[token]))) return false
	}
	return true
}

const normalizeTimestampToMs = (timestamp: unknown): number | null => {
	const numericTimestamp = Number(timestamp)
	if (!Number.isFinite(numericTimestamp)) return null
	return numericTimestamp < 1e12 ? numericTimestamp * 1e3 : numericTimestamp
}

// TODO need to update on server
export const normalizeProtocolValueChart = (values: unknown): IProtocolValueChart | null => {
	if (!Array.isArray(values)) return null

	const points: IProtocolValueChart = []
	for (const item of values) {
		if (!Array.isArray(item) || item.length < 2) continue

		const [timestamp, value] = item
		const timestampMs = normalizeTimestampToMs(timestamp)
		const numericValue = Number(value)
		if (timestampMs == null || !Number.isFinite(numericValue)) continue

		points.push([timestampMs, numericValue])
	}

	return points.sort((a, b) => a[0] - b[0])
}

// TODO need to update on server
export const normalizeProtocolChainBreakdownChart = (values: unknown): IProtocolChainBreakdownChart | null => {
	if (!Array.isArray(values)) return null

	const points: IProtocolChainBreakdownChart = []
	for (const item of values) {
		if (!Array.isArray(item) || item.length < 2) continue

		const [timestamp, value] = item
		const timestampMs = normalizeTimestampToMs(timestamp)
		if (timestampMs == null || !isRecordOfNumbers(value)) continue

		const normalizedBreakdown: IProtocolChainBreakdownValue = {}
		for (const key in value) {
			normalizedBreakdown[key] = Number(value[key])
		}
		points.push([timestampMs, normalizedBreakdown])
	}

	return points.sort((a, b) => a[0] - b[0])
}

// TODO need to update on server
export const normalizeProtocolTokenBreakdownChart = (values: unknown): IProtocolTokenBreakdownChart | null => {
	if (!Array.isArray(values)) return null

	const points: IProtocolTokenBreakdownChart = []
	for (const item of values) {
		if (!Array.isArray(item) || item.length < 2) continue

		const [timestamp, value] = item
		const timestampMs = normalizeTimestampToMs(timestamp)
		if (timestampMs == null || !isRecordOfNumbers(value)) continue

		const normalizedBreakdown: IProtocolTokenBreakdownValue = {}
		for (const key in value) {
			normalizedBreakdown[key] = Number(value[key])
		}
		points.push([timestampMs, normalizedBreakdown])
	}

	return points.sort((a, b) => a[0] - b[0])
}

export const fetchProtocolOverviewMetrics = async (protocol: string): Promise<IProtocolTvlMetrics | null> => {
	return fetchJson(`${V2_SERVER_URL}/metrics/tvl/protocol/${protocol}`)
		.then((data) => data as IProtocolTvlMetrics)
		.catch(() => null)
}

export const fetchProtocolTreasuryOverviewMetrics = async (
	protocol: string
): Promise<IProtocolTreasuryMetrics | null> => {
	return fetchJson(`${V2_SERVER_URL}/metrics/treasury/protocol/${protocol}`)
		.then((data) => data as IProtocolTreasuryMetrics)
		.catch(() => null)
}

const fetchProtocolValueChart = async ({
	path,
	key,
	currency
}: {
	path: string
	key?: string
	currency?: string
}): Promise<IProtocolValueChart | null> => {
	const finalUrl = appendOptionalQueryParams(path, { key, currency })
	return fetchJson(finalUrl)
		.then((values) => normalizeProtocolValueChart(values))
		.catch(() => null)
}

const fetchProtocolChainBreakdownChart = async ({
	path,
	key,
	currency
}: {
	path: string
	key?: string
	currency?: string
}): Promise<IProtocolChainBreakdownChart | null> => {
	const finalUrl = appendOptionalQueryParams(path, { key, currency })
	return fetchJson(finalUrl)
		.then((values) => normalizeProtocolChainBreakdownChart(values))
		.catch(() => null)
}

const fetchProtocolTokenBreakdownChart = async ({
	path,
	key,
	currency
}: {
	path: string
	key?: string
	currency?: string
}): Promise<IProtocolTokenBreakdownChart | null> => {
	const finalUrl = appendOptionalQueryParams(path, { key, currency })
	return fetchJson(finalUrl)
		.then((values) => normalizeProtocolTokenBreakdownChart(values))
		.catch(() => null)
}

const isOwnTokensTokensQuery = ({ key, currency }: { key?: string; currency?: string }) =>
	key === 'OwnTokens' && currency === 'tokens'

export const fetchProtocolTvlValueChart = async ({
	protocol,
	key,
	currency
}: Pick<IProtocolChartV2Params, 'protocol' | 'key' | 'currency'>): Promise<IProtocolValueChart | null> => {
	if (isOwnTokensTokensQuery({ key, currency })) return null
	return fetchProtocolValueChart({
		path: `${V2_SERVER_URL}/chart/tvl/protocol/${protocol}`.replaceAll('#', '$'),
		key,
		currency
	})
}

export const fetchProtocolTvlChainBreakdownChart = async ({
	protocol,
	key,
	currency
}: Pick<IProtocolChartV2Params, 'protocol' | 'key' | 'currency'>): Promise<IProtocolChainBreakdownChart | null> => {
	if (isOwnTokensTokensQuery({ key, currency })) return null
	return fetchProtocolChainBreakdownChart({
		path: `${V2_SERVER_URL}/chart/tvl/protocol/${protocol}/chain-breakdown`.replaceAll('#', '$'),
		key,
		currency
	})
}

export const fetchProtocolTvlTokenBreakdownChart = async ({
	protocol,
	key,
	currency
}: Pick<IProtocolChartV2Params, 'protocol' | 'key' | 'currency'>): Promise<IProtocolTokenBreakdownChart | null> =>
	fetchProtocolTokenBreakdownChart({
		path: `${V2_SERVER_URL}/chart/tvl/protocol/${protocol}/token-breakdown`.replaceAll('#', '$'),
		key,
		currency
	})

export const fetchProtocolTreasuryValueChart = async ({
	protocol,
	key,
	currency
}: Pick<IProtocolChartV2Params, 'protocol' | 'key' | 'currency'>): Promise<IProtocolValueChart | null> => {
	if (isOwnTokensTokensQuery({ key, currency })) return null
	return fetchProtocolValueChart({
		path: `${V2_SERVER_URL}/chart/treasury/protocol/${protocol}`.replaceAll('#', '$'),
		key,
		currency
	})
}

export const fetchProtocolTreasuryChainBreakdownChart = async ({
	protocol,
	key,
	currency
}: Pick<IProtocolChartV2Params, 'protocol' | 'key' | 'currency'>): Promise<IProtocolChainBreakdownChart | null> => {
	if (isOwnTokensTokensQuery({ key, currency })) return null
	return fetchProtocolChainBreakdownChart({
		path: `${V2_SERVER_URL}/chart/treasury/protocol/${protocol}/chain-breakdown`.replaceAll('#', '$'),
		key,
		currency
	})
}

export const fetchProtocolTreasuryTokenBreakdownChart = async ({
	protocol,
	key,
	currency
}: Pick<IProtocolChartV2Params, 'protocol' | 'key' | 'currency'>): Promise<IProtocolTokenBreakdownChart | null> =>
	fetchProtocolTokenBreakdownChart({
		path: `${V2_SERVER_URL}/chart/treasury/protocol/${protocol}/token-breakdown`.replaceAll('#', '$'),
		key,
		currency
	})

export function fetchProtocolTvlChart(
	params: IProtocolChartV2Params & { breakdownType: 'chain-breakdown' }
): Promise<IProtocolChainBreakdownChart | null>
export function fetchProtocolTvlChart(
	params: IProtocolChartV2Params & { breakdownType: 'token-breakdown' }
): Promise<IProtocolTokenBreakdownChart | null>
export function fetchProtocolTvlChart(
	params: IProtocolChartV2Params & { breakdownType?: undefined }
): Promise<IProtocolValueChart | null>
export function fetchProtocolTvlChart(
	params: IProtocolChartV2Params
): Promise<IProtocolValueChart | IProtocolChainBreakdownChart | IProtocolTokenBreakdownChart | null>
export async function fetchProtocolTvlChart({
	protocol,
	key,
	currency,
	breakdownType
}: IProtocolChartV2Params): Promise<
	IProtocolValueChart | IProtocolChainBreakdownChart | IProtocolTokenBreakdownChart | null
> {
	if (breakdownType === 'chain-breakdown') {
		return fetchProtocolTvlChainBreakdownChart({ protocol, key, currency })
	}
	if (breakdownType === 'token-breakdown') {
		return fetchProtocolTvlTokenBreakdownChart({ protocol, key, currency })
	}
	return fetchProtocolTvlValueChart({ protocol, key, currency })
}

export function fetchProtocolTreasuryChart(
	params: IProtocolChartV2Params & { breakdownType: 'chain-breakdown' }
): Promise<IProtocolChainBreakdownChart | null>
export function fetchProtocolTreasuryChart(
	params: IProtocolChartV2Params & { breakdownType: 'token-breakdown' }
): Promise<IProtocolTokenBreakdownChart | null>
export function fetchProtocolTreasuryChart(
	params: IProtocolChartV2Params & { breakdownType?: undefined }
): Promise<IProtocolValueChart | null>
export function fetchProtocolTreasuryChart(
	params: IProtocolChartV2Params
): Promise<IProtocolValueChart | IProtocolChainBreakdownChart | IProtocolTokenBreakdownChart | null>
export async function fetchProtocolTreasuryChart({
	protocol,
	key,
	currency,
	breakdownType
}: IProtocolChartV2Params): Promise<
	IProtocolValueChart | IProtocolChainBreakdownChart | IProtocolTokenBreakdownChart | null
> {
	if (breakdownType === 'chain-breakdown') {
		return fetchProtocolTreasuryChainBreakdownChart({ protocol, key, currency })
	}
	if (breakdownType === 'token-breakdown') {
		return fetchProtocolTreasuryTokenBreakdownChart({ protocol, key, currency })
	}
	return fetchProtocolTreasuryValueChart({ protocol, key, currency })
}
