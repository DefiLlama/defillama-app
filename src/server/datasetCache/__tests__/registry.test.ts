import { describe, expect, it } from 'vitest'
import nextConfig from '../../../../next.config'
import {
	DATASET_CACHE_MANIFEST_TRACE_INCLUDE,
	DATASET_DOMAIN_ARTIFACTS,
	DATASET_CACHE_REGISTRY,
	DATASET_DOMAINS,
	getDatasetCacheTraceIncludes,
	getDatasetDomainBuildAdapter,
	type DatasetDomain
} from '../registry'

describe('dataset cache registry', () => {
	it('declares every domain once with a build adapter', () => {
		const registeredDomains = Object.keys(DATASET_CACHE_REGISTRY).toSorted()

		expect(DATASET_DOMAINS.toSorted()).toEqual(registeredDomains)
		for (const domain of DATASET_DOMAINS) {
			expect(getDatasetDomainBuildAdapter(domain)).toBe(DATASET_CACHE_REGISTRY[domain].buildAdapter)
			expect(DATASET_CACHE_REGISTRY[domain].artifacts).toBe(DATASET_DOMAIN_ARTIFACTS[domain])
		}
	})

	it('declares required artifact files for every domain', () => {
		for (const domain of DATASET_DOMAINS) {
			const artifacts = DATASET_DOMAIN_ARTIFACTS[domain]
			expect(Object.keys(artifacts.files).length).toBeGreaterThan(0)
			for (const relativePath of Object.values(artifacts.files)) {
				expect(relativePath).toMatch(/\.json$/)
				expect(relativePath).not.toMatch(/^\//)
				expect(relativePath).not.toContain('..')
			}
		}
	})

	it('builds trace includes from declared domain folders', () => {
		expect(getDatasetCacheTraceIncludes('yields')).toEqual([
			DATASET_CACHE_MANIFEST_TRACE_INCLUDE,
			'./.cache/datasets/yields/**/*'
		])
		expect(getDatasetCacheTraceIncludes('markets', 'markets')).toEqual([
			DATASET_CACHE_MANIFEST_TRACE_INCLUDE,
			'./.cache/datasets/markets/**/*'
		])
	})

	it('uses registry trace helpers for configured standalone routes', () => {
		const includes = nextConfig.outputFileTracingIncludes as Record<string, string[]>
		const expectedRouteDomains: Record<string, DatasetDomain[]> = {
			'/cex/*': ['markets'],
			'/cex/markets/*': ['markets'],
			'/token/*': ['markets', 'liquidations', 'raises', 'treasuries', 'yields', 'liquidity', 'token-rights', 'risk'],
			'/token-rights': ['token-rights'],
			'/protocol/token-rights/*': ['token-rights'],
			'/protocol/yields/*': ['yields'],
			'/yields/pool/*': ['yields'],
			'/api/datasets/yields': ['yields'],
			'/api/datasets/yields-token-borrow-routes': ['yields'],
			'/api/token-liquidations/*': ['liquidations'],
			'/api/liquidations': ['liquidations'],
			'/api/liquidations/*': ['liquidations'],
			'/api/liquidations/*/*': ['liquidations']
		}

		for (const [route, domains] of Object.entries(expectedRouteDomains)) {
			expect(includes[route]).toEqual(getDatasetCacheTraceIncludes(...domains))
		}
	})
})
