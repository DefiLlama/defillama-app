import path from 'node:path'
import { fetchLiquidityTokensDatasetFromNetwork } from '~/api'
import { fetchBlockExplorers } from '~/api'
import type { BlockExplorersResponse } from '~/api/types'
import { SERVER_URL } from '~/constants'
import { fetchProtocolsList, fetchAllLiquidations } from '~/containers/LiquidationsV2/api'
import { fetchRaisesFromNetwork } from '~/containers/Raises/api'
import { getTokenRiskBorrowCapacityFromNetwork } from '~/containers/Token/api'
import { indexBorrowCapacityByAssetKey } from '~/containers/Token/tokenRisk.utils'
import type { IRawTokenRightsEntry } from '~/containers/TokenRights/api.types'
import { fetchTreasuriesFromNetwork } from '~/containers/Treasuries/api'
import { buildYieldTableRowsWithBorrowData } from '~/containers/Yields/poolsPipeline'
import {
	fetchYieldConfigFromNetwork,
	getYieldPageDataFromNetwork,
	getLendBorrowDataFromYieldPageData
} from '~/containers/Yields/queries/index'
import { fetchJson } from '~/utils/async'
import type { DatasetDomain, DatasetManifest } from './core'
import { DATASET_DOMAINS, buildEmptyDatasetManifest, ensureDirectory, writeJsonFile } from './core'

type DomainBuildResult = {
	builtAt: number
}

function getDomainDir(rootDir: string, domain: DatasetDomain): string {
	return path.join(rootDir, domain)
}

async function buildYieldsDomain(rootDir: string): Promise<DomainBuildResult> {
	const builtAt = Date.now()
	const domainDir = getDomainDir(rootDir, 'yields')
	await ensureDirectory(domainDir)

	const yieldPageData = await getYieldPageDataFromNetwork()
	const [lendBorrowData, yieldConfig] = await Promise.all([
		getLendBorrowDataFromYieldPageData(yieldPageData),
		fetchYieldConfigFromNetwork()
	])
	const transformedPools = buildYieldTableRowsWithBorrowData(
		yieldPageData.props.pools ?? [],
		lendBorrowData.props.pools ?? []
	)

	await writeJsonFile(`${domainDir}/rows.json`, transformedPools)
	await writeJsonFile(`${domainDir}/config.json`, yieldConfig)
	await writeJsonFile(`${domainDir}/lend-borrow.json`, lendBorrowData)

	return { builtAt }
}

async function buildTokenRightsDomain(rootDir: string): Promise<DomainBuildResult> {
	const builtAt = Date.now()
	const domainDir = getDomainDir(rootDir, 'token-rights')
	await ensureDirectory(domainDir)

	const entries = await fetchJson<IRawTokenRightsEntry[]>(`${SERVER_URL}/token-rights`)
	await writeJsonFile(`${domainDir}/full.json`, entries)

	return { builtAt }
}

async function buildRiskDomain(rootDir: string): Promise<DomainBuildResult> {
	const builtAt = Date.now()
	const domainDir = getDomainDir(rootDir, 'risk')
	await ensureDirectory(domainDir)

	const data = await getTokenRiskBorrowCapacityFromNetwork()
	const indexedTokens = indexBorrowCapacityByAssetKey(data.tokens)
	const indexedRecord: Record<string, typeof data.tokens> = {}

	for (const [assetKey, tokens] of indexedTokens) {
		indexedRecord[assetKey] = tokens
	}

	await writeJsonFile(`${domainDir}/indexed.json`, {
		data,
		indexedTokens: indexedRecord
	})

	return { builtAt }
}

async function buildRaisesDomain(rootDir: string): Promise<DomainBuildResult> {
	const builtAt = Date.now()
	const domainDir = getDomainDir(rootDir, 'raises')
	await ensureDirectory(domainDir)

	const raises = await fetchRaisesFromNetwork()
	await writeJsonFile(`${domainDir}/full.json`, raises)

	return { builtAt }
}

async function buildTreasuriesDomain(rootDir: string): Promise<DomainBuildResult> {
	const builtAt = Date.now()
	const domainDir = getDomainDir(rootDir, 'treasuries')
	await ensureDirectory(domainDir)

	const treasuries = await fetchTreasuriesFromNetwork()
	await writeJsonFile(`${domainDir}/full.json`, treasuries)

	return { builtAt }
}

async function buildLiquidityDomain(rootDir: string): Promise<DomainBuildResult> {
	const builtAt = Date.now()
	const domainDir = getDomainDir(rootDir, 'liquidity')
	await ensureDirectory(domainDir)

	const liquidity = await fetchLiquidityTokensDatasetFromNetwork()
	await writeJsonFile(`${domainDir}/full.json`, liquidity)

	return { builtAt }
}

async function buildLiquidationsDomain(rootDir: string): Promise<DomainBuildResult> {
	const builtAt = Date.now()
	const domainDir = getDomainDir(rootDir, 'liquidations')
	await ensureDirectory(domainDir)

	const [protocolsResponse, allResponse, blockExplorers] = await Promise.all([
		fetchProtocolsList(),
		fetchAllLiquidations(),
		fetchBlockExplorers().catch((): BlockExplorersResponse => [])
	])

	await writeJsonFile(`${domainDir}/raw/protocols.json`, protocolsResponse)
	await writeJsonFile(`${domainDir}/raw/all.json`, allResponse)
	await writeJsonFile(`${domainDir}/raw/block-explorers.json`, blockExplorers)

	return { builtAt }
}

export async function buildDatasetDomain(domain: DatasetDomain, rootDir: string): Promise<DomainBuildResult> {
	switch (domain) {
		case 'yields':
			return buildYieldsDomain(rootDir)
		case 'token-rights':
			return buildTokenRightsDomain(rootDir)
		case 'risk':
			return buildRiskDomain(rootDir)
		case 'raises':
			return buildRaisesDomain(rootDir)
		case 'treasuries':
			return buildTreasuriesDomain(rootDir)
		case 'liquidity':
			return buildLiquidityDomain(rootDir)
		case 'liquidations':
			return buildLiquidationsDomain(rootDir)
	}
}

export async function buildAllDatasetDomains(rootDir: string): Promise<DatasetManifest> {
	const manifest = buildEmptyDatasetManifest()
	const buildResults = await Promise.allSettled(
		DATASET_DOMAINS.map(async (domain) => ({
			domain,
			result: await buildDatasetDomain(domain, rootDir)
		}))
	)
	const failures: string[] = []
	let latestBuiltAt = 0

	for (let index = 0; index < buildResults.length; index += 1) {
		const settledResult = buildResults[index]
		const domain = DATASET_DOMAINS[index]

		if (settledResult.status === 'rejected') {
			failures.push(
				`${domain}: ${settledResult.reason instanceof Error ? settledResult.reason.message : String(settledResult.reason)}`
			)
			continue
		}

		const { result } = settledResult.value
		manifest.domains[domain].builtAt = result.builtAt
		if (result.builtAt > latestBuiltAt) {
			latestBuiltAt = result.builtAt
		}
	}

	if (failures.length > 0) {
		throw new Error(`Failed to build dataset domains:\n${failures.join('\n')}`)
	}

	manifest.builtAt = latestBuiltAt || Date.now()
	return manifest
}
