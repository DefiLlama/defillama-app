import { LIQUIDATIONS_SERVER_URL_V2 } from '~/constants'
import { fetchJson } from '~/utils/async'
import type {
	RawAllLiquidationsResponse,
	RawLiquidationPosition,
	RawProtocolChainLiquidationsResponse,
	RawProtocolLiquidationsResponse,
	RawProtocolsResponse,
	RawValidThreshold
} from './api.types'

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) {
		throw new Error(message)
	}
}

function assertPosition(position: unknown): asserts position is RawLiquidationPosition {
	assert(typeof position === 'object' && position !== null, 'Expected liquidation position')
	const record = position as Record<string, unknown>
	assert(typeof record.owner === 'string', 'Expected position owner')
	assert(typeof record.liqPrice === 'number', 'Expected position liqPrice')
	assert(typeof record.collateral === 'string', 'Expected position collateral')
	assert(typeof record.collateralAmount === 'number', 'Expected position collateralAmount')
	assert(typeof record.collateralAmountUsd === 'number', 'Expected position collateralAmountUsd')
}

function assertPositions(positions: unknown): asserts positions is RawLiquidationPosition[] {
	assert(Array.isArray(positions), 'Expected positions array')
	for (const position of positions) {
		assertPosition(position)
	}
}

function assertProtocolsResponse(data: unknown): asserts data is RawProtocolsResponse {
	assert(typeof data === 'object' && data !== null, 'Expected protocols response')
	const record = data as Record<string, unknown>
	assert(Array.isArray(record.protocols), 'Expected protocols list')
	for (const protocol of record.protocols) {
		assert(typeof protocol === 'string', 'Expected protocol name')
	}
}

function assertValidThresholds(validThresholds: unknown): asserts validThresholds is RawValidThreshold[] {
	assert(Array.isArray(validThresholds), 'Expected valid thresholds')
	for (const threshold of validThresholds) {
		assert(threshold === '100k' || threshold === '10k' || threshold === 'all', 'Expected known valid threshold')
	}
}

function assertAllLiquidationsResponse(data: unknown): asserts data is RawAllLiquidationsResponse {
	assert(typeof data === 'object' && data !== null, 'Expected all liquidations response')
	const record = data as Record<string, unknown>
	assert(typeof record.timestamp === 'number', 'Expected all liquidations timestamp')
	assert(typeof record.data === 'object' && record.data !== null, 'Expected all liquidations data')
	assertValidThresholds(record.validThresholds)

	for (const protocolData of Object.values(record.data)) {
		assert(typeof protocolData === 'object' && protocolData !== null, 'Expected protocol liquidations data')
		for (const positions of Object.values(protocolData)) {
			assertPositions(positions)
		}
	}
}

function assertProtocolLiquidationsResponse(data: unknown): asserts data is RawProtocolLiquidationsResponse {
	assert(typeof data === 'object' && data !== null, 'Expected protocol liquidations response')
	const record = data as Record<string, unknown>
	assert(typeof record.timestamp === 'number', 'Expected protocol liquidations timestamp')
	assert(typeof record.data === 'object' && record.data !== null, 'Expected protocol liquidations data')
	assertValidThresholds(record.validThresholds)

	for (const positions of Object.values(record.data)) {
		assertPositions(positions)
	}
}

function assertProtocolChainLiquidationsResponse(data: unknown): asserts data is RawProtocolChainLiquidationsResponse {
	assert(typeof data === 'object' && data !== null, 'Expected protocol chain liquidations response')
	const record = data as Record<string, unknown>
	assert(typeof record.timestamp === 'number', 'Expected protocol chain liquidations timestamp')
	assertValidThresholds(record.validThresholds)
	assertPositions(record.data)
}

export async function fetchProtocolsList(): Promise<RawProtocolsResponse> {
	const data = await fetchJson<unknown>(`${LIQUIDATIONS_SERVER_URL_V2}/protocols`)
	assertProtocolsResponse(data)
	return data
}

export async function fetchAllLiquidations(): Promise<RawAllLiquidationsResponse> {
	const data = await fetchJson<unknown>(`${LIQUIDATIONS_SERVER_URL_V2}/all`)
	assertAllLiquidationsResponse(data)
	return data
}

export async function fetchProtocolLiquidations(protocol: string): Promise<RawProtocolLiquidationsResponse> {
	const data = await fetchJson<unknown>(`${LIQUIDATIONS_SERVER_URL_V2}/protocol/${protocol}`)
	assertProtocolLiquidationsResponse(data)
	return data
}

export async function fetchProtocolChainLiquidations(
	protocol: string,
	chain: string
): Promise<RawProtocolChainLiquidationsResponse> {
	const data = await fetchJson<unknown>(`${LIQUIDATIONS_SERVER_URL_V2}/protocol/${protocol}/${chain}`)
	assertProtocolChainLiquidationsResponse(data)
	return data
}
