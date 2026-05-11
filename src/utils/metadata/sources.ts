import { LIQUIDATIONS_SERVER_URL_V2, TOKEN_DIRECTORY_API } from '~/constants'
import type { RawBridgesResponse } from '~/containers/Bridges/api.types'
import type { RawCexsResponse } from '~/containers/Cexs/api.types'
import type { RawAllLiquidationsResponse } from '~/containers/LiquidationsV2/api.types'
import { fetchEmissionsProtocolsList } from '~/containers/Unlocks/api'
import { getErrorMessage } from '~/utils/error'
import type { TokenDirectory } from '~/utils/tokenDirectory'
import { fetchMetadataJson, getMetadataFetchTimeoutMs } from './http'
import type {
	ICategoriesAndTags,
	IChainMetadata,
	IProtocolMetadata,
	IRWAList,
	IRWAPerpsList,
	ITokenListEntry
} from './types'
import { getMetadataUpstreamBase } from './upstream'

export type RawTokenListItem = ITokenListEntry & { id?: string }

export type CoreMetadataSources = {
	protocols: Record<string, IProtocolMetadata>
	chains: Record<string, IChainMetadata>
	categoriesAndTags: ICategoriesAndTags
	cexsResponse: RawCexsResponse
	rwaList: IRWAList
	rwaPerpsList: IRWAPerpsList
	tokenlistArray: RawTokenListItem[]
	tokenDirectory: TokenDirectory
	liquidationsResponse: RawAllLiquidationsResponse
	bridgesResponse: RawBridgesResponse
	emissionsProtocolsList: string[]
}

async function fetchNamedMetadataSource<T>(name: string, promise: Promise<T>): Promise<T> {
	try {
		return await promise
	} catch (error) {
		console.warn(`[dev:prepare] Metadata cache: ${name} failed: ${getErrorMessage(error)}`)
		throw error
	}
}

export async function fetchCoreMetadataSources(): Promise<CoreMetadataSources> {
	const coreApiBase = getMetadataUpstreamBase('core')
	const datasetsBase = getMetadataUpstreamBase('datasets')
	const bridgesBase = getMetadataUpstreamBase('bridges')

	const [
		protocols,
		chains,
		categoriesAndTags,
		cexsResponse,
		rwaList,
		rwaPerpsList,
		tokenlistArray,
		tokenDirectory,
		liquidationsResponse,
		bridgesResponse,
		emissionsProtocolsList
	] = await Promise.all([
		fetchNamedMetadataSource(
			'protocols API',
			fetchMetadataJson<Record<string, IProtocolMetadata>>(
				`${coreApiBase}/config/smol/appMetadata-protocols.json?zz=14`
			)
		),
		fetchNamedMetadataSource(
			'chains API',
			fetchMetadataJson<Record<string, IChainMetadata>>(`${coreApiBase}/config/smol/appMetadata-chains.json?zz=14`)
		),
		fetchNamedMetadataSource(
			'categories and tags API',
			fetchMetadataJson<ICategoriesAndTags>(`${coreApiBase}/config/smol/appMetadata-categoriesAndTags.json?zz=14`)
		),
		fetchNamedMetadataSource('CEX metadata API', fetchMetadataJson<RawCexsResponse>(`${coreApiBase}/cexs?zz=14`)),
		fetchNamedMetadataSource(
			'RWA metadata API',
			fetchMetadataJson<IRWAList>(`${getMetadataUpstreamBase('rwa')}/list?zz=14`)
		),
		fetchNamedMetadataSource(
			'RWA perps metadata API',
			fetchMetadataJson<IRWAPerpsList>(`${getMetadataUpstreamBase('rwa-perps')}/list?zz=14`)
		),
		fetchNamedMetadataSource(
			'token list API',
			fetchMetadataJson<RawTokenListItem[]>(`${datasetsBase}/tokenlist/sorted.json?zz=14`)
		),
		fetchNamedMetadataSource('token directory API', fetchMetadataJson<TokenDirectory>(TOKEN_DIRECTORY_API)),
		fetchNamedMetadataSource(
			'liquidations metadata API',
			fetchMetadataJson<RawAllLiquidationsResponse>(`${LIQUIDATIONS_SERVER_URL_V2}/all?zz=14`)
		),
		fetchNamedMetadataSource(
			'bridges metadata API',
			fetchMetadataJson<RawBridgesResponse>(`${bridgesBase}/bridges?includeChains=true`)
		),
		fetchNamedMetadataSource(
			'emissions protocols API',
			fetchEmissionsProtocolsList({ timeout: getMetadataFetchTimeoutMs() })
		)
	])

	return {
		protocols,
		chains,
		categoriesAndTags,
		cexsResponse,
		rwaList,
		rwaPerpsList,
		tokenlistArray,
		tokenDirectory,
		liquidationsResponse,
		bridgesResponse,
		emissionsProtocolsList
	}
}
