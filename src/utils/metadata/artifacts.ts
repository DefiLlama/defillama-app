import type { TokenDirectory } from '~/utils/tokenDirectory'
import bridgeChainSlugsRaw from '../../../.cache/app-metadata/bridgeChainSlugs.json'
import bridgeChainSlugToNameRaw from '../../../.cache/app-metadata/bridgeChainSlugToName.json'
import bridgeProtocolSlugsRaw from '../../../.cache/app-metadata/bridgeProtocolSlugs.json'
import categoriesAndTags from '../../../.cache/app-metadata/categoriesAndTags.json'
import cexs from '../../../.cache/app-metadata/cexs.json'
import cgExchangeIdentifiersRaw from '../../../.cache/app-metadata/cgExchangeIdentifiers.json'
import chainDisplayNamesRaw from '../../../.cache/app-metadata/chainDisplayNames.json'
import chainMetadata from '../../../.cache/app-metadata/chains.json'
import emissionsHistoricalPricesRaw from '../../../.cache/app-metadata/emissionsHistoricalPrices.json'
import emissionsProtocolsListRaw from '../../../.cache/app-metadata/emissionsProtocolsList.json'
import liquidationsTokenSymbolsRaw from '../../../.cache/app-metadata/liquidationsTokenSymbols.json'
import protocolLlamaswapDatasetRaw from '../../../.cache/app-metadata/llamaswap-protocols.json'
import protocolDisplayNamesRaw from '../../../.cache/app-metadata/protocolDisplayNames.json'
import protocolMetadata from '../../../.cache/app-metadata/protocols.json'
import rwaList from '../../../.cache/app-metadata/rwa.json'
import rwaPerpsList from '../../../.cache/app-metadata/rwaPerps.json'
import tokenlistRaw from '../../../.cache/app-metadata/tokenlist.json'
import tokenDirectoryRaw from '../../../.cache/app-metadata/tokens.json'
import { createMetadataCacheFromArtifacts, type CoreMetadataPayload, type MetadataCache } from './artifactContract'
import type {
	ICategoriesAndTags,
	ICexItem,
	IEmissionsHistoricalPrices,
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
	emissionsHistoricalPrices: emissionsHistoricalPricesRaw as IEmissionsHistoricalPrices,
	cgExchangeIdentifiers: cgExchangeIdentifiersRaw as string[],
	bridgeProtocolSlugs: bridgeProtocolSlugsRaw as string[],
	bridgeChainSlugs: bridgeChainSlugsRaw as string[],
	bridgeChainSlugToName: bridgeChainSlugToNameRaw as Record<string, string>,
	protocolLlamaswapDataset: protocolLlamaswapDatasetRaw as ProtocolLlamaswapMetadata
}

export function createMetadataCacheFromGeneratedArtifacts(): MetadataCache {
	return createMetadataCacheFromArtifacts(artifactPayload)
}
