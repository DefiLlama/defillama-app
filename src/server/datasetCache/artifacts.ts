export type DatasetDomainArtifactContract = {
	files: Readonly<Record<string, string>>
	optionalShardDirs?: Readonly<Record<string, string>>
}

export const DATASET_DOMAIN_ARTIFACTS = {
	yields: {
		files: {
			rows: 'rows.json',
			pageData: 'page-data.json',
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
			exchangesList: 'exchanges-list.json',
			tokenSymbols: 'token-symbols.json',
			cexByDefillamaSlug: 'cex-by-defillama-slug.json'
		}
	}
} as const satisfies Record<string, DatasetDomainArtifactContract>

export type DatasetDomain = keyof typeof DATASET_DOMAIN_ARTIFACTS

export const DATASET_DOMAINS = Object.keys(DATASET_DOMAIN_ARTIFACTS) as DatasetDomain[]
