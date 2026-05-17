import type { TokenDirectory } from '~/utils/tokenDirectory'
import bridgeChainSlugsRaw from '../../../.cache/bridgeChainSlugs.json'
import bridgeChainSlugToNameRaw from '../../../.cache/bridgeChainSlugToName.json'
import bridgeProtocolSlugsRaw from '../../../.cache/bridgeProtocolSlugs.json'
import categoriesAndTags from '../../../.cache/categoriesAndTags.json'
import cexs from '../../../.cache/cexs.json'
import cgExchangeIdentifiersRaw from '../../../.cache/cgExchangeIdentifiers.json'
import chainDisplayNamesRaw from '../../../.cache/chainDisplayNames.json'
import chainMetadata from '../../../.cache/chains.json'
import emissionsProtocolsListRaw from '../../../.cache/emissionsProtocolsList.json'
import liquidationsTokenSymbolsRaw from '../../../.cache/liquidationsTokenSymbols.json'
import protocolLlamaswapDatasetRaw from '../../../.cache/llamaswap-protocols.json'
import protocolDisplayNamesRaw from '../../../.cache/protocolDisplayNames.json'
import protocolMetadata from '../../../.cache/protocols.json'
import rwaList from '../../../.cache/rwa.json'
import rwaPerpsList from '../../../.cache/rwaPerps.json'
import tokenlistRaw from '../../../.cache/tokenlist.json'
import tokenDirectoryRaw from '../../../.cache/tokens.json'
import { createMetadataCacheFromArtifacts, type CoreMetadataPayload, type MetadataCache } from './artifactContract'
import type {
	ICategoriesAndTags,
	ICexItem,
	ProtocolLlamaswapMetadata,
	IRWAList,
	IRWAPerpsList,
	ITokenListEntry
} from './types'

const artifactPayload: CoreMetadataPayload = {
	chains: chainMetadata,
	protocols: protocolMetadata,
	categoriesAndTags: categoriesAndTags as ICategoriesAndTags,
	cexs: cexs as Array<ICexItem>,
	rwaList: rwaList as IRWAList,
	rwaPerpsList: rwaPerpsList as IRWAPerpsList,
	tokenlist: tokenlistRaw as Record<string, ITokenListEntry>,
	tokenDirectory: tokenDirectoryRaw as TokenDirectory,
	protocolDisplayNames: protocolDisplayNamesRaw as Record<string, string>,
	chainDisplayNames: chainDisplayNamesRaw as Record<string, string>,
	liquidationsTokenSymbols: liquidationsTokenSymbolsRaw as string[],
	emissionsProtocolsList: emissionsProtocolsListRaw as string[],
	cgExchangeIdentifiers: cgExchangeIdentifiersRaw as string[],
	bridgeProtocolSlugs: bridgeProtocolSlugsRaw as string[],
	bridgeChainSlugs: bridgeChainSlugsRaw as string[],
	bridgeChainSlugToName: bridgeChainSlugToNameRaw as Record<string, string>,
	protocolLlamaswapDataset: protocolLlamaswapDatasetRaw as ProtocolLlamaswapMetadata
}

export function createMetadataCacheFromGeneratedArtifacts(): MetadataCache {
	return createMetadataCacheFromArtifacts(artifactPayload)
}
