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

async function getLendBorrowData(): Promise<LendBorrowData> {
	return readJsonFile<LendBorrowData>(`${getYieldsDomainDir()}/lend-borrow.json`)
}

export async function getYieldConfigFromCache(): Promise<YieldConfigResponse> {
	await readDatasetManifest()
	return readJsonFile<YieldConfigResponse>(`${getYieldsDomainDir()}/config.json`)
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
