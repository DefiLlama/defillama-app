import { V2_SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type {
	IProtocolChainBreakdownChart,
	IProtocolChainBreakdownValue,
	IProtocolTokenBreakdownChart,
	IProtocolTokenBreakdownValue,
	IProtocolValueChart,
	IProtocolChartV2Params,
	IProtocolTvlMetrics
} from './api.types'
import type { IProtocolExpenses } from './api.types'

const appendOptionalQueryParams = (url: string, params: Pick<IProtocolChartV2Params, 'key' | 'currency'>) => {
	const parsedUrl = new URL(url, 'http://placeholder')
	if (params.key) parsedUrl.searchParams.set('key', params.key)
	if (params.currency) parsedUrl.searchParams.set('currency', params.currency)
	const isAbsoluteUrl = /^https?:\/\//.test(url)
	return isAbsoluteUrl
		? `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}${parsedUrl.search}`
		: `${parsedUrl.pathname}${parsedUrl.search}`
}

const normalizeProtocolValueChart = (values: unknown): IProtocolValueChart | null => {
	if (!Array.isArray(values)) return null

	const points: IProtocolValueChart = []
	for (const item of values) {
		if (!Array.isArray(item) || item.length < 2) continue

		const [timestamp, value] = item
		const numericTimestamp = Number(timestamp)
		const numericValue = Number(value)
		if (!Number.isFinite(numericTimestamp) || !Number.isFinite(numericValue)) continue

		points.push([numericTimestamp * 1e3, numericValue])
	}

	return points.sort((a, b) => a[0] - b[0])
}

const normalizeProtocolChainBreakdownChart = (values: unknown): IProtocolChainBreakdownChart | null => {
	if (!Array.isArray(values)) return null

	const points: IProtocolChainBreakdownChart = []
	for (const item of values) {
		if (!Array.isArray(item) || item.length < 2) continue

		const [timestamp, value] = item
		const numericTimestamp = Number(timestamp)
		if (!Number.isFinite(numericTimestamp) || !value || typeof value !== 'object' || Array.isArray(value)) continue
		points.push([numericTimestamp * 1e3, value as IProtocolChainBreakdownValue])
	}

	return points.sort((a, b) => a[0] - b[0])
}

const normalizeProtocolTokenBreakdownChart = (values: unknown): IProtocolTokenBreakdownChart | null => {
	if (!Array.isArray(values)) return null

	const points: IProtocolTokenBreakdownChart = []
	for (const item of values) {
		if (!Array.isArray(item) || item.length < 2) continue

		const [timestamp, value] = item
		const numericTimestamp = Number(timestamp)
		if (!Number.isFinite(numericTimestamp) || !value || typeof value !== 'object' || Array.isArray(value)) continue
		points.push([numericTimestamp * 1e3, value as IProtocolTokenBreakdownValue])
	}

	return points.sort((a, b) => a[0] - b[0])
}

export const fetchProtocolOverviewMetrics = async (protocol: string): Promise<IProtocolTvlMetrics | null> => {
	return fetchJson(`${V2_SERVER_URL}/metrics/tvl/protocol/${protocol}`)
		.then((data) => data as IProtocolTvlMetrics)
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

type ProtocolChartNamespace = 'tvl' | 'treasury'

const buildProtocolChartPath = ({
	namespace,
	protocol,
	breakdownType
}: {
	namespace: ProtocolChartNamespace
	protocol: string
	breakdownType?: NonNullable<IProtocolChartV2Params['breakdownType']>
}) => {
	const basePath = `${V2_SERVER_URL}/chart/${namespace}/protocol/${protocol}`
	return (breakdownType ? `${basePath}/${breakdownType}` : basePath).replaceAll('#', '$')
}

const fetchProtocolMetricValueChart = async ({
	namespace,
	protocol,
	key,
	currency
}: Pick<IProtocolChartV2Params, 'protocol' | 'key' | 'currency'> & {
	namespace: ProtocolChartNamespace
}): Promise<IProtocolValueChart | null> => {
	return fetchProtocolValueChart({
		path: buildProtocolChartPath({ namespace, protocol }),
		key,
		currency
	})
}

const fetchProtocolMetricChainBreakdownChart = async ({
	namespace,
	protocol,
	key,
	currency
}: Pick<IProtocolChartV2Params, 'protocol' | 'key' | 'currency'> & {
	namespace: ProtocolChartNamespace
}): Promise<IProtocolChainBreakdownChart | null> => {
	return fetchProtocolChainBreakdownChart({
		path: buildProtocolChartPath({ namespace, protocol, breakdownType: 'chain-breakdown' }),
		key,
		currency
	})
}

const fetchProtocolMetricTokenBreakdownChart = async ({
	namespace,
	protocol,
	key,
	currency
}: Pick<IProtocolChartV2Params, 'protocol' | 'key' | 'currency'> & {
	namespace: ProtocolChartNamespace
}): Promise<IProtocolTokenBreakdownChart | null> => {
	return fetchProtocolTokenBreakdownChart({
		path: buildProtocolChartPath({ namespace, protocol, breakdownType: 'token-breakdown' }),
		key,
		currency
	})
}

const fetchProtocolTvlValueChart = async ({
	protocol,
	key,
	currency
}: Pick<IProtocolChartV2Params, 'protocol' | 'key' | 'currency'>): Promise<IProtocolValueChart | null> => {
	return fetchProtocolMetricValueChart({
		namespace: 'tvl',
		protocol,
		key,
		currency
	})
}

const fetchProtocolTvlChainBreakdownChart = async ({
	protocol,
	key,
	currency
}: Pick<IProtocolChartV2Params, 'protocol' | 'key' | 'currency'>): Promise<IProtocolChainBreakdownChart | null> => {
	return fetchProtocolMetricChainBreakdownChart({
		namespace: 'tvl',
		protocol,
		key,
		currency
	})
}

export const fetchProtocolTvlTokenBreakdownChart = async ({
	protocol,
	key,
	currency
}: Pick<IProtocolChartV2Params, 'protocol' | 'key' | 'currency'>): Promise<IProtocolTokenBreakdownChart | null> => {
	return fetchProtocolMetricTokenBreakdownChart({
		namespace: 'tvl',
		protocol,
		key,
		currency
	})
}

const fetchProtocolTreasuryValueChart = async ({
	protocol,
	key,
	currency
}: Pick<IProtocolChartV2Params, 'protocol' | 'key' | 'currency'>): Promise<IProtocolValueChart | null> => {
	return fetchProtocolMetricValueChart({
		namespace: 'treasury',
		protocol,
		key,
		currency
	})
}

const fetchProtocolTreasuryChainBreakdownChart = async ({
	protocol,
	key,
	currency
}: Pick<IProtocolChartV2Params, 'protocol' | 'key' | 'currency'>): Promise<IProtocolChainBreakdownChart | null> => {
	return fetchProtocolMetricChainBreakdownChart({
		namespace: 'treasury',
		protocol,
		key,
		currency
	})
}

export const fetchProtocolTreasuryTokenBreakdownChart = async ({
	protocol,
	key,
	currency
}: Pick<IProtocolChartV2Params, 'protocol' | 'key' | 'currency'>): Promise<IProtocolTokenBreakdownChart | null> => {
	return fetchProtocolMetricTokenBreakdownChart({
		namespace: 'treasury',
		protocol,
		key,
		currency
	})
}

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

export async function fetchProtocolExpenses(): Promise<IProtocolExpenses[]> {
	return fetchJson<IProtocolExpenses[]>(
		'https://raw.githubusercontent.com/DefiLlama/defillama-server/master/defi/src/operationalCosts/output/expenses.json'
	)
}
