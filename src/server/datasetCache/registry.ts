import { DATASET_DOMAIN_ARTIFACTS, type DatasetDomain, type DatasetDomainArtifactContract } from './artifacts'
import type { DatasetDomainBuildAdapter } from './buildTypes'
export { DATASET_DOMAIN_ARTIFACTS, DATASET_DOMAINS } from './artifacts'
export type { DatasetDomain, DatasetDomainArtifactContract } from './artifacts'
export type { DatasetDomainBuildAdapter, DatasetDomainBuildResult } from './buildTypes'

const DATASET_CACHE_TRACE_ROOT_INCLUDE = './.cache/datasets'
let domainBuildersImport: Promise<typeof import('./domainBuilders')> | null = null

export const DATASET_CACHE_MANIFEST_TRACE_INCLUDE = `${DATASET_CACHE_TRACE_ROOT_INCLUDE}/manifest.json`

function importDomainBuilders(): Promise<typeof import('./domainBuilders')> {
	domainBuildersImport ??= import('./domainBuilders')
	return domainBuildersImport
}

export const DATASET_CACHE_REGISTRY = {
	yields: {
		buildAdapter: (rootDir) => importDomainBuilders().then((builders) => builders.buildYieldsDomain(rootDir)),
		artifacts: DATASET_DOMAIN_ARTIFACTS.yields,
		traceFolders: ['yields']
	},
	'token-rights': {
		buildAdapter: (rootDir) => importDomainBuilders().then((builders) => builders.buildTokenRightsDomain(rootDir)),
		artifacts: DATASET_DOMAIN_ARTIFACTS['token-rights'],
		traceFolders: ['token-rights']
	},
	risk: {
		buildAdapter: (rootDir) => importDomainBuilders().then((builders) => builders.buildRiskDomain(rootDir)),
		artifacts: DATASET_DOMAIN_ARTIFACTS.risk,
		traceFolders: ['risk']
	},
	raises: {
		buildAdapter: (rootDir) => importDomainBuilders().then((builders) => builders.buildRaisesDomain(rootDir)),
		artifacts: DATASET_DOMAIN_ARTIFACTS.raises,
		traceFolders: ['raises']
	},
	treasuries: {
		buildAdapter: (rootDir) => importDomainBuilders().then((builders) => builders.buildTreasuriesDomain(rootDir)),
		artifacts: DATASET_DOMAIN_ARTIFACTS.treasuries,
		traceFolders: ['treasuries']
	},
	liquidity: {
		buildAdapter: (rootDir) => importDomainBuilders().then((builders) => builders.buildLiquidityDomain(rootDir)),
		artifacts: DATASET_DOMAIN_ARTIFACTS.liquidity,
		traceFolders: ['liquidity']
	},
	liquidations: {
		buildAdapter: (rootDir) => importDomainBuilders().then((builders) => builders.buildLiquidationsDomain(rootDir)),
		artifacts: DATASET_DOMAIN_ARTIFACTS.liquidations,
		traceFolders: ['liquidations']
	},
	'cex-markets': {
		buildAdapter: (rootDir) => importDomainBuilders().then((builders) => builders.buildCexMarketsDomain(rootDir)),
		artifacts: DATASET_DOMAIN_ARTIFACTS['cex-markets'],
		traceFolders: ['cex-markets']
	},
	'token-markets': {
		buildAdapter: (rootDir) => importDomainBuilders().then((builders) => builders.buildTokenMarketsDomain(rootDir)),
		artifacts: DATASET_DOMAIN_ARTIFACTS['token-markets'],
		traceFolders: ['token-markets']
	}
} as const satisfies Record<
	DatasetDomain,
	{
		buildAdapter: DatasetDomainBuildAdapter
		artifacts: DatasetDomainArtifactContract
		traceFolders: readonly string[]
	}
>

export function getDatasetDomainBuildAdapter(domain: DatasetDomain): DatasetDomainBuildAdapter {
	return DATASET_CACHE_REGISTRY[domain].buildAdapter
}

export function getDatasetCacheTraceIncludes(...domains: DatasetDomain[]): string[] {
	const includes = new Set<string>([DATASET_CACHE_MANIFEST_TRACE_INCLUDE])

	for (const domain of domains) {
		for (const folder of DATASET_CACHE_REGISTRY[domain].traceFolders) {
			includes.add(`${DATASET_CACHE_TRACE_ROOT_INCLUDE}/${folder}/**/*`)
		}
	}

	return Array.from(includes)
}
