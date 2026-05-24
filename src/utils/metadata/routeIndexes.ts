import { CATEGORY_INFO_API } from '~/constants'
import { fetchDATInstitutions } from '~/containers/DAT/api'
import type { ICategoryInfoApiItem } from '~/containers/NarrativeTracker/api.types'
import { fetchOracleMetrics } from '~/containers/Oracles/api'
import { fetchStablecoinPeggedConfigApi } from '~/containers/Stablecoins/api'
import { slug } from '~/utils'
import { fetchMetadataJson } from './http'
import { dedupeNonEmpty } from './strings'

export type NarrativeCategoriesMetadata = {
	ids: string[]
	nameById: Record<string, string>
}

export type OracleRoutesMetadata = {
	oracleNameBySlug: Record<string, string>
	chainNameBySlug: Record<string, string>
	chainSlugsByOracleSlug: Record<string, string[]>
}

export type DigitalAssetTreasuryRoutesMetadata = {
	assetSlugs: string[]
	companySlugs: string[]
}

export const EMPTY_NARRATIVE_CATEGORIES: NarrativeCategoriesMetadata = {
	ids: [],
	nameById: {}
}

export const EMPTY_ORACLE_ROUTES: OracleRoutesMetadata = {
	oracleNameBySlug: {},
	chainNameBySlug: {},
	chainSlugsByOracleSlug: {}
}

export const EMPTY_DIGITAL_ASSET_TREASURY_ROUTES: DigitalAssetTreasuryRoutesMetadata = {
	assetSlugs: [],
	companySlugs: []
}

export type RouteIndexesMetadata = {
	narrativeCategories: NarrativeCategoriesMetadata
	oracleRoutes: OracleRoutesMetadata
	digitalAssetTreasuryRoutes: DigitalAssetTreasuryRoutesMetadata
	stablecoinPeggedAssetSlugs: string[]
}

export const EMPTY_ROUTE_INDEXES: RouteIndexesMetadata = {
	narrativeCategories: EMPTY_NARRATIVE_CATEGORIES,
	oracleRoutes: EMPTY_ORACLE_ROUTES,
	digitalAssetTreasuryRoutes: EMPTY_DIGITAL_ASSET_TREASURY_ROUTES,
	stablecoinPeggedAssetSlugs: []
}

export function buildNarrativeCategoriesMetadata(info: ICategoryInfoApiItem[]): NarrativeCategoriesMetadata {
	const ids: string[] = []
	const nameById: Record<string, string> = {}

	for (const item of info) {
		const id = item.id
		if (!id) continue
		ids.push(id)
		nameById[id] = item.name
	}

	return {
		ids: dedupeNonEmpty(ids),
		nameById
	}
}

export function buildOracleRoutesMetadata({
	chainsByOracle,
	oraclesTVS = {}
}: {
	chainsByOracle: Record<string, string[]>
	oraclesTVS?: Record<string, unknown>
}): OracleRoutesMetadata {
	const oracleNameBySlug: Record<string, string> = {}
	const chainNameBySlug: Record<string, string> = {}
	const chainSlugsByOracleSlug: Record<string, string[]> = {}
	const oracleNames = new Set<string>()
	for (const oracleName in oraclesTVS) {
		oracleNames.add(oracleName)
	}
	for (const oracleName in chainsByOracle) {
		oracleNames.add(oracleName)
	}

	for (const oracleName of oracleNames) {
		const oracleSlug = slug(oracleName)
		if (!oracleSlug) continue
		oracleNameBySlug[oracleSlug] = oracleName

		const chainSlugs: string[] = []
		for (const chainName of chainsByOracle[oracleName] ?? []) {
			const chainSlug = slug(chainName)
			if (!chainSlug) continue
			chainNameBySlug[chainSlug] = chainName
			chainSlugs.push(chainSlug)
		}
		chainSlugsByOracleSlug[oracleSlug] = dedupeNonEmpty(chainSlugs)
	}

	return {
		oracleNameBySlug,
		chainNameBySlug,
		chainSlugsByOracleSlug
	}
}

export function buildDigitalAssetTreasuryRoutesMetadata(
	data: Awaited<ReturnType<typeof fetchDATInstitutions>>
): DigitalAssetTreasuryRoutesMetadata {
	const assetSlugs: string[] = []
	for (const asset in data.assetMetadata) {
		assetSlugs.push(slug(asset))
	}

	const companySlugs: string[] = []
	for (const institutionId in data.institutionMetadata) {
		companySlugs.push(slug(data.institutionMetadata[institutionId].ticker))
	}

	return {
		assetSlugs: dedupeNonEmpty(assetSlugs),
		companySlugs: dedupeNonEmpty(companySlugs)
	}
}

export function buildStablecoinPeggedAssetSlugs(config: Record<string, string>): string[] {
	const assetSlugs: string[] = []
	for (const asset in config) {
		assetSlugs.push(slug(asset))
	}
	return dedupeNonEmpty(assetSlugs)
}

export async function fetchMetadataRouteIndexes(): Promise<RouteIndexesMetadata> {
	const [narrativeCategories, oracleRoutes, digitalAssetTreasuryRoutes, stablecoinPeggedAssetSlugs] = await Promise.all(
		[
			(async () =>
				buildNarrativeCategoriesMetadata(await fetchMetadataJson<ICategoryInfoApiItem[]>(CATEGORY_INFO_API)))(),
			(async () => {
				const metrics = await fetchOracleMetrics()
				return buildOracleRoutesMetadata(metrics)
			})(),
			(async () => buildDigitalAssetTreasuryRoutesMetadata(await fetchDATInstitutions()))(),
			(async () => buildStablecoinPeggedAssetSlugs(await fetchStablecoinPeggedConfigApi()))()
		]
	)

	return {
		narrativeCategories,
		oracleRoutes,
		digitalAssetTreasuryRoutes,
		stablecoinPeggedAssetSlugs
	}
}
