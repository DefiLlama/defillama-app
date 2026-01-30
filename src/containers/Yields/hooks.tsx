import { useRouter } from 'next/router'
import * as React from 'react'
import { EVM_CHAINS_FALLBACK_SET } from '~/constants/chains'
import { toNumberOrNullFromQueryParam } from '~/utils'

interface IFormatYieldQueryParams {
	projectList?: Array<string>
	lendingProtocols?: Array<string>
	farmProtocols?: Array<string>
	chainList?: Array<string>
	categoryList?: Array<string>
	evmChains?: Array<string>
}

// Helper to parse exclude query param to Set
const parseExcludeParam = (param: string | string[] | undefined): Set<string> => {
	if (!param) return new Set()
	if (typeof param === 'string') return new Set([param])
	return new Set(param)
}

export const useFormatYieldQueryParams = ({
	projectList,
	chainList,
	categoryList,
	lendingProtocols,
	farmProtocols,
	evmChains
}: IFormatYieldQueryParams) => {
	// Use dynamic EVM chains from props, or fall back to static list
	const evmChainsSet = React.useMemo(
		() => (evmChains && evmChains.length > 0 ? new Set(evmChains) : EVM_CHAINS_FALLBACK_SET),
		[evmChains]
	)
	const router = useRouter()
	const {
		project,
		excludeProject,
		lendingProtocol,
		excludeLendingProtocol,
		farmProtocol,
		excludeFarmProtocol,
		chain,
		excludeChain,
		token,
		excludeToken,
		exactToken,
		attribute,
		excludeAttribute,
		category,
		excludeCategory,
		token_pair,
		minTvl,
		maxTvl,
		minApy,
		maxApy,
		minAvailable,
		maxAvailable,
		customLTV
	} = router.query

	return React.useMemo(() => {
		let selectedProjects: string[] = [],
			selectedChains: string[] = [],
			selectedAttributes: string[] = [],
			includeTokens: string[] = [],
			excludeTokens: string[] = [],
			exactTokens: string[] = [],
			selectedCategories: string[] = [],
			selectedLendingProtocols: string[] = [],
			selectedFarmProtocols: string[] = [],
			pairTokens: string[] = []

		// Parse exclude sets upfront
		const excludeProjectSet = parseExcludeParam(excludeProject)
		const excludeChainSet = parseExcludeParam(excludeChain)
		const excludeCategorySet = parseExcludeParam(excludeCategory)
		const excludeAttributeSet = parseExcludeParam(excludeAttribute)
		const excludeLendingProtocolSet = parseExcludeParam(excludeLendingProtocol)
		const excludeFarmProtocolSet = parseExcludeParam(excludeFarmProtocol)

		// Projects - apply exclusion inline
		if (projectList) {
			let projects: string[]
			if (project) {
				if (typeof project === 'string') {
					projects = project === 'All' ? [...projectList] : project === 'None' ? [] : [project]
				} else {
					projects = [...project]
				}
			} else {
				projects = [...projectList]
			}
			// Filter out excluded projects
			selectedProjects = excludeProjectSet.size > 0 ? projects.filter((p) => !excludeProjectSet.has(p)) : projects
		}

		// Lending Protocols - apply exclusion inline
		if (lendingProtocols) {
			let protocols: string[]
			if (lendingProtocol) {
				if (typeof lendingProtocol === 'string') {
					protocols =
						lendingProtocol === 'All' ? [...lendingProtocols] : lendingProtocol === 'None' ? [] : [lendingProtocol]
				} else {
					protocols = [...lendingProtocol]
				}
			} else {
				protocols = [...lendingProtocols]
			}
			// Filter out excluded lending protocols
			selectedLendingProtocols =
				excludeLendingProtocolSet.size > 0 ? protocols.filter((p) => !excludeLendingProtocolSet.has(p)) : protocols
		}

		// Farm Protocols - apply exclusion inline
		if (farmProtocols) {
			let protocols: string[]
			if (farmProtocol) {
				if (typeof farmProtocol === 'string') {
					protocols = farmProtocol === 'All' ? [...farmProtocols] : farmProtocol === 'None' ? [] : [farmProtocol]
				} else {
					protocols = [...farmProtocol]
				}
			} else {
				protocols = [...farmProtocols]
			}
			// Filter out excluded farm protocols
			selectedFarmProtocols =
				excludeFarmProtocolSet.size > 0 ? protocols.filter((p) => !excludeFarmProtocolSet.has(p)) : protocols
		}

		// Categories - apply exclusion inline
		if (categoryList) {
			let categories: string[]
			if (category) {
				if (typeof category === 'string') {
					categories = category === 'All' ? [...categoryList] : category === 'None' ? [] : [category]
				} else {
					categories = [...category]
				}
			} else {
				categories = [...categoryList]
			}
			// Filter out excluded categories
			selectedCategories =
				excludeCategorySet.size > 0 ? categories.filter((c) => !excludeCategorySet.has(c)) : categories
		}

		// Chains - apply exclusion inline
		if (chainList) {
			const isEvmChain = (c: string) => evmChainsSet.has(c) || evmChainsSet.has(c.toLowerCase())

			let chains: string[]
			if (chain) {
				if (typeof chain === 'string') {
					if (chain === 'All') {
						chains = [...chainList]
					} else if (chain === 'None') {
						chains = []
					} else if (chain === 'ALL_EVM') {
						chains = chainList.filter(isEvmChain)
					} else {
						chains = [chain]
					}
				} else {
					// Handle array of chains - expand ALL_EVM if present
					if (chain.includes('ALL_EVM')) {
						const evmChainsFromList = chainList.filter(isEvmChain)
						const otherChains = chain.filter((c) => c !== 'ALL_EVM')
						chains = [...new Set([...otherChains, ...evmChainsFromList])]
					} else {
						chains = [...chain]
					}
				}
			} else {
				chains = [...chainList]
			}
			// Filter out excluded chains
			selectedChains = excludeChainSet.size > 0 ? chains.filter((c) => !excludeChainSet.has(c)) : chains
		}

		// Attributes - apply exclusion inline
		if (attribute) {
			let attributes: string[]
			if (typeof attribute === 'string') {
				attributes = [attribute]
			} else {
				attributes = [...attribute]
			}
			// Filter out excluded attributes
			selectedAttributes =
				excludeAttributeSet.size > 0 ? attributes.filter((a) => !excludeAttributeSet.has(a)) : attributes
		}

		// Tokens - keep excludeTokens separate since token matching is substring-based
		if (token) {
			if (typeof token === 'string') {
				includeTokens = [token]
			} else {
				includeTokens = [...token]
			}
		}

		if (excludeToken) {
			if (typeof excludeToken === 'string') {
				excludeTokens = [excludeToken]
			} else {
				excludeTokens = [...excludeToken]
			}
		}

		if (exactToken) {
			if (typeof exactToken === 'string') {
				exactTokens = [exactToken]
			} else {
				exactTokens = [...exactToken]
			}
		}

		if (token_pair) {
			if (typeof token_pair === 'string') {
				pairTokens = [token_pair]
			} else {
				pairTokens = [...token_pair]
			}
		}

		return {
			selectedProjects,
			selectedChains,
			selectedAttributes,
			includeTokens,
			excludeTokens, // Keep this since token matching is substring-based
			exactTokens,
			selectedCategories,
			selectedLendingProtocols,
			selectedFarmProtocols,
			pairTokens,
			minTvl: toNumberOrNullFromQueryParam(minTvl),
			maxTvl: toNumberOrNullFromQueryParam(maxTvl),
			minApy: toNumberOrNullFromQueryParam(minApy),
			maxApy: toNumberOrNullFromQueryParam(maxApy),
			minAvailable: minAvailable ? toNumberOrNullFromQueryParam(minAvailable) : null,
			maxAvailable: maxAvailable ? toNumberOrNullFromQueryParam(maxAvailable) : null,
			customLTV: toNumberOrNullFromQueryParam(customLTV)
		}
	}, [
		projectList,
		chainList,
		categoryList,
		lendingProtocols,
		farmProtocols,
		project,
		excludeProject,
		lendingProtocol,
		excludeLendingProtocol,
		farmProtocol,
		excludeFarmProtocol,
		chain,
		excludeChain,
		token,
		excludeToken,
		exactToken,
		attribute,
		excludeAttribute,
		category,
		excludeCategory,
		token_pair,
		minTvl,
		maxTvl,
		minApy,
		maxApy,
		minAvailable,
		maxAvailable,
		customLTV,
		evmChainsSet
	])
}
