export type DatasetDomainBuildResult = {
	builtAt: number
}

export type DatasetDomainBuildAdapter = (rootDir: string) => Promise<DatasetDomainBuildResult>

const DATASET_CACHE_TRACE_ROOT_INCLUDE = './.cache/datasets'

export const DATASET_CACHE_MANIFEST_TRACE_INCLUDE = `${DATASET_CACHE_TRACE_ROOT_INCLUDE}/manifest.json`

export type DatasetDomainArtifactContract = {
	files: Readonly<Record<string, string>>
	optionalShardDirs?: Readonly<Record<string, string>>
}

export const DATASET_DOMAIN_ARTIFACTS = {
	yields: {
		files: {
			rows: 'rows.json',
			config: 'config.json',
			lendBorrow: 'lend-borrow.json'
		},
		optionalShardDirs: {
			byToken: 'by-token'
		}
	},
	'token-rights': {
		files: {
			full: 'full.json',
			byDefillamaId: 'by-defillama-id.json',
			byProtocolName: 'by-protocol-name.json'
		}
	},
	risk: {
		files: {
			indexed: 'indexed.json'
		}
	},
	raises: {
		files: {
			full: 'full.json'
		}
	},
	treasuries: {
		files: {
			full: 'full.json'
		}
	},
	liquidity: {
		files: {
			full: 'full.json'
		}
	},
	liquidations: {
		files: {
			rawProtocols: 'raw/protocols.json',
			rawAll: 'raw/all.json',
			rawBlockExplorers: 'raw/block-explorers.json'
		}
	},
	markets: {
		files: {
			tokensList: 'tokens-list.json',
			exchangesList: 'exchanges-list.json'
		}
	}
} as const satisfies Record<string, DatasetDomainArtifactContract>

export const DATASET_CACHE_REGISTRY = {
	yields: {
		buildAdapter: (rootDir) => import('./domainBuilders').then((builders) => builders.buildYieldsDomain(rootDir)),
		artifacts: DATASET_DOMAIN_ARTIFACTS.yields,
		traceFolders: ['yields']
	},
	'token-rights': {
		buildAdapter: (rootDir) => import('./domainBuilders').then((builders) => builders.buildTokenRightsDomain(rootDir)),
		artifacts: DATASET_DOMAIN_ARTIFACTS['token-rights'],
		traceFolders: ['token-rights']
	},
	risk: {
		buildAdapter: (rootDir) => import('./domainBuilders').then((builders) => builders.buildRiskDomain(rootDir)),
		artifacts: DATASET_DOMAIN_ARTIFACTS.risk,
		traceFolders: ['risk']
	},
	raises: {
		buildAdapter: (rootDir) => import('./domainBuilders').then((builders) => builders.buildRaisesDomain(rootDir)),
		artifacts: DATASET_DOMAIN_ARTIFACTS.raises,
		traceFolders: ['raises']
	},
	treasuries: {
		buildAdapter: (rootDir) => import('./domainBuilders').then((builders) => builders.buildTreasuriesDomain(rootDir)),
		artifacts: DATASET_DOMAIN_ARTIFACTS.treasuries,
		traceFolders: ['treasuries']
	},
	liquidity: {
		buildAdapter: (rootDir) => import('./domainBuilders').then((builders) => builders.buildLiquidityDomain(rootDir)),
		artifacts: DATASET_DOMAIN_ARTIFACTS.liquidity,
		traceFolders: ['liquidity']
	},
	liquidations: {
		buildAdapter: (rootDir) => import('./domainBuilders').then((builders) => builders.buildLiquidationsDomain(rootDir)),
		artifacts: DATASET_DOMAIN_ARTIFACTS.liquidations,
		traceFolders: ['liquidations']
	},
	markets: {
		buildAdapter: (rootDir) => import('./domainBuilders').then((builders) => builders.buildMarketsDomain(rootDir)),
		artifacts: DATASET_DOMAIN_ARTIFACTS.markets,
		traceFolders: ['markets']
	}
} as const satisfies Record<
	string,
	{
		buildAdapter: DatasetDomainBuildAdapter
		artifacts: DatasetDomainArtifactContract
		traceFolders: readonly string[]
	}
>

export type DatasetDomain = keyof typeof DATASET_CACHE_REGISTRY

export const DATASET_DOMAINS = Object.keys(DATASET_CACHE_REGISTRY) as DatasetDomain[]

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
