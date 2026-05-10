import path from 'node:path'
import { fetchBlockExplorers, fetchLiquidityTokensDatasetFromNetwork } from '~/api'
import type { BlockExplorersResponse } from '~/api/types'
import { SERVER_URL } from '~/constants'
import { fetchExchangeMarketsListFromNetwork } from '~/containers/Cexs/api'
import { fetchAllLiquidations, fetchProtocolsList } from '~/containers/LiquidationsV2/api'
import { fetchRaisesFromNetwork } from '~/containers/Raises/api'
import { fetchTokenMarketsListFromNetwork, getTokenRiskBorrowCapacityFromNetwork } from '~/containers/Token/api'
import { indexBorrowCapacityByAssetKey } from '~/containers/Token/tokenRisk.utils'
import type { IRawTokenRightsEntry } from '~/containers/TokenRights/api.types'
import { fetchTreasuriesFromNetwork } from '~/containers/Treasuries/api'
import { fetchJson } from '~/utils/async'
import { ensureDirectory, writeJsonFile } from './core'
import { DATASET_DOMAIN_ARTIFACTS, type DatasetDomain, type DatasetDomainBuildResult } from './registry'
import { buildTokenRightsIndexes } from './tokenRightsIndex'
export { buildYieldsDomain } from './yields.builder'

function getDomainDir(rootDir: string, domain: DatasetDomain): string {
	return path.join(rootDir, domain)
}

export async function buildTokenRightsDomain(rootDir: string): Promise<DatasetDomainBuildResult> {
	const builtAt = Date.now()
	const domainDir = getDomainDir(rootDir, 'token-rights')
	const files = DATASET_DOMAIN_ARTIFACTS['token-rights'].files
	await ensureDirectory(domainDir)

	const entries = await fetchJson<IRawTokenRightsEntry[]>(`${SERVER_URL}/token-rights`)
	const indexes = buildTokenRightsIndexes(entries)

	await writeJsonFile(path.join(domainDir, files.full), entries)
	await writeJsonFile(path.join(domainDir, files.byDefillamaId), indexes.byDefillamaId)
	await writeJsonFile(path.join(domainDir, files.byProtocolName), indexes.byProtocolName)

	return { builtAt }
}

export async function buildRiskDomain(rootDir: string): Promise<DatasetDomainBuildResult> {
	const builtAt = Date.now()
	const domainDir = getDomainDir(rootDir, 'risk')
	const files = DATASET_DOMAIN_ARTIFACTS.risk.files
	await ensureDirectory(domainDir)

	const data = await getTokenRiskBorrowCapacityFromNetwork()
	const indexedTokens = indexBorrowCapacityByAssetKey(data.tokens)
	const indexedRecord: Record<string, typeof data.tokens> = {}

	for (const [assetKey, tokens] of indexedTokens) {
		indexedRecord[assetKey] = tokens
	}

	await writeJsonFile(path.join(domainDir, files.indexed), {
		data,
		indexedTokens: indexedRecord
	})

	return { builtAt }
}

export async function buildRaisesDomain(rootDir: string): Promise<DatasetDomainBuildResult> {
	const builtAt = Date.now()
	const domainDir = getDomainDir(rootDir, 'raises')
	const files = DATASET_DOMAIN_ARTIFACTS.raises.files
	await ensureDirectory(domainDir)

	const raises = await fetchRaisesFromNetwork()
	await writeJsonFile(path.join(domainDir, files.full), raises)

	return { builtAt }
}

export async function buildTreasuriesDomain(rootDir: string): Promise<DatasetDomainBuildResult> {
	const builtAt = Date.now()
	const domainDir = getDomainDir(rootDir, 'treasuries')
	const files = DATASET_DOMAIN_ARTIFACTS.treasuries.files
	await ensureDirectory(domainDir)

	const treasuries = await fetchTreasuriesFromNetwork()
	await writeJsonFile(path.join(domainDir, files.full), treasuries)

	return { builtAt }
}

export async function buildLiquidityDomain(rootDir: string): Promise<DatasetDomainBuildResult> {
	const builtAt = Date.now()
	const domainDir = getDomainDir(rootDir, 'liquidity')
	const files = DATASET_DOMAIN_ARTIFACTS.liquidity.files
	await ensureDirectory(domainDir)

	const liquidity = await fetchLiquidityTokensDatasetFromNetwork()
	await writeJsonFile(path.join(domainDir, files.full), liquidity)

	return { builtAt }
}

export async function buildLiquidationsDomain(rootDir: string): Promise<DatasetDomainBuildResult> {
	const builtAt = Date.now()
	const domainDir = getDomainDir(rootDir, 'liquidations')
	const files = DATASET_DOMAIN_ARTIFACTS.liquidations.files
	await ensureDirectory(domainDir)

	const [protocolsResponse, allResponse, blockExplorers] = await Promise.all([
		fetchProtocolsList(),
		fetchAllLiquidations(),
		fetchBlockExplorers().catch((): BlockExplorersResponse => [])
	])

	await writeJsonFile(path.join(domainDir, files.rawProtocols), protocolsResponse)
	await writeJsonFile(path.join(domainDir, files.rawAll), allResponse)
	await writeJsonFile(path.join(domainDir, files.rawBlockExplorers), blockExplorers)

	return { builtAt }
}

export async function buildMarketsDomain(rootDir: string): Promise<DatasetDomainBuildResult> {
	const builtAt = Date.now()
	const domainDir = getDomainDir(rootDir, 'markets')
	const files = DATASET_DOMAIN_ARTIFACTS.markets.files
	await ensureDirectory(domainDir)

	const [tokensList, exchangesList] = await Promise.all([
		fetchTokenMarketsListFromNetwork(),
		fetchExchangeMarketsListFromNetwork()
	]).catch((error) => {
		console.warn('[datasetCache] skipping markets cache:', error instanceof Error ? error.message : String(error))

		const emptyTotals = {
			spot: { exchange_count: 0, total_oi_usd: null, total_volume_24h: null },
			linear_perp: { exchange_count: 0, total_oi_usd: null, total_volume_24h: null },
			inverse_perp: { exchange_count: 0, total_oi_usd: null, total_volume_24h: null }
		}
		const emptyExchanges = { spot: [], linear_perp: [], inverse_perp: [] }

		return [
			{ tokens: [] },
			{
				cex: emptyExchanges,
				dex: emptyExchanges,
				totals: {
					cex: emptyTotals,
					dex: emptyTotals
				}
			}
		]
	})

	await writeJsonFile(path.join(domainDir, files.tokensList), tokensList)
	await writeJsonFile(path.join(domainDir, files.exchangesList), exchangesList)

	return { builtAt }
}
