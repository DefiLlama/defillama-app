import { LIQUIDATIONS_SERVER_URL_V2, TOKEN_DIRECTORY_API } from '~/constants'
import type { RawBridgesResponse } from '~/containers/Bridges/api.types'
import type { RawCexsResponse } from '~/containers/Cexs/api.types'
import type { RawAllLiquidationsResponse } from '~/containers/LiquidationsV2/api.types'
import { fetchEmissionsProtocolsList } from '~/containers/Unlocks/api'
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

export type RawTokenListItem = ITokenListEntry & { id: string }

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
		fetchMetadataJson<Record<string, IProtocolMetadata>>(`${coreApiBase}/config/smol/appMetadata-protocols.json?zz=14`),
		fetchMetadataJson<Record<string, IChainMetadata>>(`${coreApiBase}/config/smol/appMetadata-chains.json?zz=14`),
		fetchMetadataJson<ICategoriesAndTags>(`${coreApiBase}/config/smol/appMetadata-categoriesAndTags.json?zz=14`),
		fetchMetadataJson<RawCexsResponse>(`${coreApiBase}/cexs?zz=14`),
		fetchMetadataJson<IRWAList>(`${getMetadataUpstreamBase('rwa')}/list?zz=14`),
		fetchMetadataJson<IRWAPerpsList>(`${getMetadataUpstreamBase('rwa-perps')}/list?zz=14`),
		fetchMetadataJson<RawTokenListItem[]>(`${datasetsBase}/tokenlist/sorted.json?zz=14`),
		fetchMetadataJson<TokenDirectory>(TOKEN_DIRECTORY_API),
		fetchMetadataJson<RawAllLiquidationsResponse>(`${LIQUIDATIONS_SERVER_URL_V2}/all?zz=14`),
		fetchMetadataJson<RawBridgesResponse>(`${bridgesBase}/bridges?includeChains=true`),
		fetchEmissionsProtocolsList({ timeout: getMetadataFetchTimeoutMs() })
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
