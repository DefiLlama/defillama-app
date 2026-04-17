import { LIQUIDATIONS_SERVER_URL_V2 } from '~/constants'
import { fetchJson } from '~/utils/async'
import type {
	RawAllLiquidationsResponse,
	RawProtocolChainLiquidationsResponse,
	RawProtocolLiquidationsResponse,
	RawProtocolsResponse
} from './api.types'

export async function fetchProtocolsList(): Promise<RawProtocolsResponse> {
	return fetchJson<RawProtocolsResponse>(`${LIQUIDATIONS_SERVER_URL_V2}/protocols?zz=14`)
}

export async function fetchAllLiquidations(): Promise<RawAllLiquidationsResponse> {
	return fetchJson<RawAllLiquidationsResponse>(`${LIQUIDATIONS_SERVER_URL_V2}/all?zz=14`)
}

export async function fetchProtocolLiquidations(protocol: string): Promise<RawProtocolLiquidationsResponse> {
	return fetchJson<RawProtocolLiquidationsResponse>(`${LIQUIDATIONS_SERVER_URL_V2}/protocol/${protocol}?zz=14`)
}

export async function fetchProtocolChainLiquidations(
	protocol: string,
	chain: string
): Promise<RawProtocolChainLiquidationsResponse> {
	return fetchJson<RawProtocolChainLiquidationsResponse>(
		`${LIQUIDATIONS_SERVER_URL_V2}/protocol/${protocol}/${chain}?zz=14`
	)
}
