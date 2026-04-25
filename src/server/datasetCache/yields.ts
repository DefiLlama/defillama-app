import { buildTokenBorrowRoutesData } from '~/containers/Token/tokenBorrowRoutes.server'
import type { TokenBorrowRoutesResponse } from '~/containers/Token/tokenBorrowRoutes.types'
import { filterTokenYieldRows } from '~/containers/Token/tokenYields.server'
import type { LendBorrowData, YieldConfigResponse } from '~/containers/Yields/queries/index'
import type { IYieldTableRow } from '~/containers/Yields/Tables/types'
import { getDatasetDomainDir, readDatasetManifest, readJsonFile } from './core'

function getYieldsDomainDir(): string {
	return getDatasetDomainDir('yields')
}

async function getYieldRows(): Promise<IYieldTableRow[]> {
	return readJsonFile<IYieldTableRow[]>(`${getYieldsDomainDir()}/rows.json`)
}

let indexedYieldRowsCache: {
	rows: IYieldTableRow[]
	byPoolId: Map<string, IYieldTableRow>
} | null = null

async function getIndexedYieldRows(): Promise<Map<string, IYieldTableRow>> {
	const rows = await getYieldRows()
	if (indexedYieldRowsCache?.rows === rows) {
		return indexedYieldRowsCache.byPoolId
	}

	const byPoolId = new Map<string, IYieldTableRow>()
	for (const row of rows) {
		byPoolId.set(row.configID, row)
		if (row.id) {
			byPoolId.set(row.id, row)
		}
	}

	indexedYieldRowsCache = { rows, byPoolId }
	return byPoolId
}

async function getLendBorrowData(): Promise<LendBorrowData> {
	return readJsonFile<LendBorrowData>(`${getYieldsDomainDir()}/lend-borrow.json`)
}

export async function getYieldConfigFromCache(): Promise<YieldConfigResponse> {
	await readDatasetManifest()
	return readJsonFile<YieldConfigResponse>(`${getYieldsDomainDir()}/config.json`)
}

export async function getYieldPoolRowFromCache(poolId: string): Promise<IYieldTableRow | null> {
	await readDatasetManifest()
	return (await getIndexedYieldRows()).get(poolId) ?? null
}

export async function getYieldProtocolConfigFromCache(projectSlug: string): Promise<Record<string, unknown> | null> {
	const config = await getYieldConfigFromCache()
	return (projectSlug ? (config?.protocols?.[projectSlug] ?? null) : null) as Record<string, unknown> | null
}

export async function getTokenYieldsRowsFromCache(
	token: string,
	chains?: string | string[]
): Promise<IYieldTableRow[]> {
	await readDatasetManifest()
	return filterTokenYieldRows(await getYieldRows(), token, chains)
}

export async function getTokenBorrowRoutesFromCache(token: string): Promise<TokenBorrowRoutesResponse> {
	await readDatasetManifest()
	const lendBorrowData = await getLendBorrowData()
	return buildTokenBorrowRoutesData(token, lendBorrowData.props.pools)
}

export async function getProtocolYieldRowsFromCache(protocolSlugs: string[]): Promise<IYieldTableRow[]> {
	await readDatasetManifest()
	const protocolSlugSet = new Set<string>()
	for (const protocolSlug of protocolSlugs) {
		if (protocolSlug) {
			protocolSlugSet.add(protocolSlug)
		}
	}
	const rows = []
	for (const row of await getYieldRows()) {
		if (protocolSlugSet.has(row.projectslug)) {
			rows.push(row)
		}
	}
	return rows
}
