import { SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type {
	IActiveAddressesResponse,
	IUserDataResponse,
	ITxDataResponse,
	IGasDataResponse,
	INewAddressesResponse
} from './api.types'

export const ONCHAIN_ACTIVE_ADDRESSES_API = `${SERVER_URL}/activeUsers`
export const ONCHAIN_ADDRESSES_API = `${SERVER_URL}/userData/users`
export const ONCHAIN_TXS_API = `${SERVER_URL}/userData/txs`
export const ONCHAIN_GAS_API = `${SERVER_URL}/userData/gas`
export const ONCHAIN_NEW_ADDRESSES_API = `${SERVER_URL}/userData/newusers`

/**
 * Fetch active addresses data for all protocols and chains.
 */
export async function fetchActiveAddresses(): Promise<IActiveAddressesResponse> {
	return fetchJson<IActiveAddressesResponse>(ONCHAIN_ACTIVE_ADDRESSES_API, { timeout: 30_000 })
}

/**
 * Fetch user data (active users) for a specific protocol.
 */
export async function fetchProtocolUsers({
	protocolId
}: {
	protocolId: number | string
}): Promise<IUserDataResponse | null> {
	const url = `${ONCHAIN_ADDRESSES_API}/${protocolId.toString().replaceAll('#', '$')}`
	return fetchJson<IUserDataResponse | null>(url, { timeout: 30_000 })
}

/**
 * Fetch user data (active users) for a specific chain.
 */
export async function fetchChainUsers({
	chainName
}: {
	chainName: string
}): Promise<IUserDataResponse | null> {
	const url = `${ONCHAIN_ADDRESSES_API}/chain$${chainName}`
	return fetchJson<IUserDataResponse | null>(url, { timeout: 30_000 })
}

/**
 * Fetch transaction data for a specific protocol.
 */
export async function fetchProtocolTransactions({
	protocolId
}: {
	protocolId: number | string
}): Promise<ITxDataResponse | null> {
	const url = `${ONCHAIN_TXS_API}/${protocolId.toString().replaceAll('#', '$')}`
	return fetchJson<ITxDataResponse | null>(url, { timeout: 30_000 })
}

/**
 * Fetch transaction data for a specific chain.
 */
export async function fetchChainTransactions({
	chainName
}: {
	chainName: string
}): Promise<ITxDataResponse | null> {
	const url = `${ONCHAIN_TXS_API}/chain$${chainName}`
	return fetchJson<ITxDataResponse | null>(url, { timeout: 30_000 })
}

/**
 * Fetch gas data for a specific protocol.
 */
export async function fetchProtocolGas({
	protocolId
}: {
	protocolId: number | string
}): Promise<IGasDataResponse | null> {
	const url = `${ONCHAIN_GAS_API}/${protocolId.toString().replaceAll('#', '$')}`
	return fetchJson<IGasDataResponse | null>(url, { timeout: 30_000 })
}

/**
 * Fetch new users data for a specific protocol.
 */
export async function fetchProtocolNewUsers({
	protocolId
}: {
	protocolId: number | string
}): Promise<INewAddressesResponse | null> {
	const url = `${ONCHAIN_NEW_ADDRESSES_API}/${protocolId.toString().replaceAll('#', '$')}`
	return fetchJson<INewAddressesResponse | null>(url, { timeout: 30_000 })
}

/**
 * Fetch new users data for a specific chain.
 */
export async function fetchChainNewUsers({
	chainName
}: {
	chainName: string
}): Promise<INewAddressesResponse | null> {
	const url = `${ONCHAIN_NEW_ADDRESSES_API}/chain$${chainName}`
	return fetchJson<INewAddressesResponse | null>(url, { timeout: 30_000 })
}
