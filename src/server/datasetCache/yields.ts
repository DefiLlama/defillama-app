import path from 'node:path'
import { buildTokenBorrowRoutesData } from '~/containers/Token/tokenBorrowRoutes.server'
import type { TokenBorrowRoutesResponse } from '~/containers/Token/tokenBorrowRoutes.types'
import { filterTokenYieldRows } from '~/containers/Token/tokenYields.server'
import type { LendBorrowData, YieldConfigResponse } from '~/containers/Yields/queries/index'
import type { IYieldTableRow } from '~/containers/Yields/Tables/types'
import { getYieldTokenVariantSet } from '~/containers/Yields/tokenFilter'
import { getDatasetDomainDir, readDatasetDomainJson } from './core'
import { getDatasetIndexFileName, isFileNotFoundError } from './indexKeys'

type YieldProtocolConfig = NonNullable<NonNullable<YieldConfigResponse>['protocols']>[string]

export const YIELDS_DATASET_FILES = {
	rows: 'rows.json',
	config: 'config.json',
	lendBorrow: 'lend-borrow.json',
	byTokenDir: 'by-token'
} as const

export function getYieldsDomainDir(rootDir?: string): string {
	return rootDir ? path.join(rootDir, 'yields') : getDatasetDomainDir('yields')
}

export function getYieldsRowsPath(rootDir?: string): string {
	return path.join(getYieldsDomainDir(rootDir), YIELDS_DATASET_FILES.rows)
}

export function getYieldsConfigPath(rootDir?: string): string {
	return path.join(getYieldsDomainDir(rootDir), YIELDS_DATASET_FILES.config)
}

export function getYieldsLendBorrowPath(rootDir?: string): string {
	return path.join(getYieldsDomainDir(rootDir), YIELDS_DATASET_FILES.lendBorrow)
}

export function getYieldsByTokenDir(rootDir?: string): string {
	return path.join(getYieldsDomainDir(rootDir), YIELDS_DATASET_FILES.byTokenDir)
}

export function getYieldsTokenIndexPath(token: string, rootDir?: string): string {
	return path.join(getYieldsByTokenDir(rootDir), getDatasetIndexFileName(token))
}

export function getYieldRowCacheId(row: Pick<IYieldTableRow, 'configID' | 'id' | 'pool'>): string {
	return row.configID || row.id || row.pool
}

async function getYieldRows(): Promise<IYieldTableRow[]> {
	return readDatasetDomainJson<IYieldTableRow[]>('yields', YIELDS_DATASET_FILES.rows)
}

async function resolveTokenYieldIndexEntries(rowIds: string[]): Promise<IYieldTableRow[]> {
	const rows: IYieldTableRow[] = []
	const rowById = await getIndexedYieldRows()

	for (const rowId of rowIds) {
		if (!rowId) continue
		const row = rowById.get(rowId)
		if (row) {
			rows.push(row)
		}
	}

	return rows
}

async function getIndexedTokenYieldRows(token: string): Promise<IYieldTableRow[] | null> {
	const variants = getYieldTokenVariantSet(token)
	if (variants.size === 0) {
		return null
	}

	const rowsById = new Map<string, IYieldTableRow>()
	let foundIndex = false

	for (const variant of variants) {
		try {
			const indexEntries = await readDatasetDomainJson<string[]>(
				'yields',
				`${YIELDS_DATASET_FILES.byTokenDir}/${getDatasetIndexFileName(variant)}`
			)
			const rows = await resolveTokenYieldIndexEntries(indexEntries)
			foundIndex = true
			for (const row of rows) {
				rowsById.set(getYieldRowCacheId(row), row)
			}
		} catch (error) {
			if (isFileNotFoundError(error)) {
				continue
			}
			throw error
		}
	}

	return foundIndex ? Array.from(rowsById.values()) : null
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
		for (const cacheId of [row.configID, row.id, row.pool]) {
			if (cacheId) {
				byPoolId.set(cacheId, row)
			}
		}
	}

	indexedYieldRowsCache = { rows, byPoolId }
	return byPoolId
}

async function getLendBorrowData(): Promise<LendBorrowData> {
	return readDatasetDomainJson<LendBorrowData>('yields', YIELDS_DATASET_FILES.lendBorrow)
}

export async function getYieldConfigFromCache(): Promise<YieldConfigResponse> {
	return readDatasetDomainJson<YieldConfigResponse>('yields', YIELDS_DATASET_FILES.config)
}

export async function getYieldPoolRowFromCache(poolId: string): Promise<IYieldTableRow | null> {
	return (await getIndexedYieldRows()).get(poolId) ?? null
}

export async function getYieldProtocolConfigFromCache(projectSlug: string): Promise<YieldProtocolConfig | null> {
	const config = await getYieldConfigFromCache()
	return projectSlug ? (config?.protocols?.[projectSlug] ?? null) : null
}

export async function getTokenYieldsRowsFromCache(
	token: string,
	chains?: string | string[]
): Promise<IYieldTableRow[]> {
	const indexedRows = token.trim() ? await getIndexedTokenYieldRows(token) : null
	if (indexedRows) {
		return filterTokenYieldRows(indexedRows, '', chains)
	}

	return filterTokenYieldRows(await getYieldRows(), token, chains)
}

export async function getTokenBorrowRoutesFromCache(token: string): Promise<TokenBorrowRoutesResponse> {
	const lendBorrowData = await getLendBorrowData()
	return buildTokenBorrowRoutesData(token, lendBorrowData.props.pools)
}

export async function getProtocolYieldRowsFromCache(protocolSlugs: string[]): Promise<IYieldTableRow[]> {
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
