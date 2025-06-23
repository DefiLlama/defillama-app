import * as React from 'react'
import { useRouter } from 'next/router'

interface IFormatYieldQueryParams {
	projectList?: Array<string>
	lendingProtocols?: Array<string>
	farmProtocols?: Array<string>
	chainList?: Array<string>
	categoryList?: Array<string>
}

export const useFormatYieldQueryParams = ({
	projectList,
	chainList,
	categoryList,
	lendingProtocols,
	farmProtocols
}: IFormatYieldQueryParams) => {
	const router = useRouter()
	const {
		project,
		lendingProtocol,
		farmProtocol,
		chain,
		token,
		excludeToken,
		exactToken,
		attribute,
		category,
		token_pair
	} = router.query

	return React.useMemo(() => {
		let selectedProjects = [],
			selectedChains = [],
			selectedAttributes = [],
			includeTokens = [],
			excludeTokens = [],
			exactTokens = [],
			selectedCategories = [],
			selectedLendingProtocols = [],
			selectedFarmProtocols = [],
			pairTokens = []

		if (projectList) {
			if (project) {
				if (typeof project === 'string') {
					selectedProjects = project === 'All' ? projectList : project === 'None' ? [] : [project]
				} else {
					selectedProjects = [...project]
				}
			} else selectedProjects = projectList
		}

		if (lendingProtocols) {
			if (lendingProtocol) {
				if (typeof lendingProtocol === 'string') {
					selectedLendingProtocols =
						lendingProtocol === 'All' ? lendingProtocols : lendingProtocol === 'None' ? [] : [lendingProtocol]
				} else {
					selectedLendingProtocols = [...lendingProtocol]
				}
			} else selectedLendingProtocols = lendingProtocols
		}

		if (farmProtocols) {
			if (farmProtocol) {
				if (typeof farmProtocol === 'string') {
					selectedFarmProtocols = farmProtocol === 'All' ? farmProtocols : farmProtocol === 'None' ? [] : [farmProtocol]
				} else {
					selectedFarmProtocols = [...farmProtocol]
				}
			} else selectedFarmProtocols = farmProtocols
		}

		if (categoryList) {
			if (category) {
				if (typeof category === 'string') {
					selectedCategories = category === 'All' ? categoryList : category === 'None' ? [] : [category]
				} else {
					selectedCategories = [...category]
				}
			} else selectedCategories = categoryList
		}

		if (chainList) {
			if (chain) {
				if (typeof chain === 'string') {
					selectedChains = chain === 'All' ? chainList : chain === 'None' ? [] : [chain]
				} else {
					selectedChains = [...chain]
				}
			} else selectedChains = chainList
		}

		if (attribute) {
			if (typeof attribute === 'string') {
				selectedAttributes = [attribute]
			} else {
				selectedAttributes = [...attribute]
			}
		}

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
			excludeTokens,
			exactTokens,
			selectedCategories,
			selectedLendingProtocols,
			selectedFarmProtocols,
			pairTokens
		}
	}, [
		attribute,
		chain,
		project,
		token,
		excludeToken,
		exactToken,
		category,
		projectList,
		chainList,
		categoryList,
		lendingProtocols,
		farmProtocols,
		lendingProtocol,
		farmProtocol,
		token_pair
	])
}
