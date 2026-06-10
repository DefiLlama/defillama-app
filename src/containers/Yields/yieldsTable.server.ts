import type { ParsedUrlQuery } from 'querystring'
import type { IResponseCGMarketsAPI } from '~/api/coingecko.types'
import type { YieldPoolFilterState } from './domain/poolFilters'
import { decodeYieldsQuery } from './queryState'
import type { YieldTokenOption } from './types'

export function buildYieldTokenOptions(cgList: Array<IResponseCGMarketsAPI>): YieldTokenOption[] {
	const tokens: YieldTokenOption[] = []
	for (const token of cgList) {
		if (!token.symbol) continue

		tokens.push({
			name: token.name,
			symbol: token.symbol.toUpperCase(),
			logo: token.image2 || null,
			fallbackLogo: token.image || null
		})
	}

	return tokens
}

export function getYieldPoolFilterState(data: {
	projectList?: string[]
	chainList?: string[]
	categoryList?: string[]
	evmChains?: string[]
	query: ParsedUrlQuery
}): YieldPoolFilterState {
	const decoded = decodeYieldsQuery(data.query, {
		projectList: data.projectList,
		chainList: data.chainList,
		categoryList: data.categoryList,
		evmChains: data.evmChains
	})

	return {
		selectedProjects: decoded.selectedProjects,
		selectedChains: decoded.selectedChains,
		selectedAttributes: decoded.selectedAttributes,
		includeTokens: decoded.includeTokens,
		excludeTokens: decoded.excludeTokens,
		exactTokens: decoded.exactTokens,
		selectedCategories: decoded.selectedCategories,
		pairTokens: decoded.pairTokens,
		minTvl: decoded.minTvl,
		maxTvl: decoded.maxTvl,
		minApy: decoded.minApy,
		maxApy: decoded.maxApy
	}
}
