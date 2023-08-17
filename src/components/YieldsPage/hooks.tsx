import * as React from 'react'
import { useRouter } from 'next/router'
import { slug } from '~/utils'

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
	const { project, lendingProtocol, farmProtocol, chain, token, excludeToken, exactToken, attribute, category } =
		router.query

	return React.useMemo(() => {
		let selectedProjects = [],
			selectedChains = [],
			selectedAttributes = [],
			includeTokens = [],
			excludeTokens = [],
			exactTokens = [],
			selectedCategories = [],
			selectedLendingProtocols = [],
			selectedFarmProtocols = []

		if (projectList) {
			if (project) {
				if (typeof project === 'string') {
					selectedProjects = project === 'All' ? projectList.map((p) => slug(p)) : project === 'None' ? [] : [project]
				} else {
					selectedProjects = [...project]
				}
			} else selectedProjects = projectList.map((p) => slug(p))
		}

		if (lendingProtocols) {
			if (lendingProtocol) {
				if (typeof lendingProtocol === 'string') {
					selectedLendingProtocols =
						lendingProtocol === 'All'
							? lendingProtocols.map((p) => slug(p))
							: lendingProtocol === 'None'
							? []
							: [lendingProtocol]
				} else {
					selectedLendingProtocols = [...lendingProtocol]
				}
			} else selectedLendingProtocols = lendingProtocols.map((p) => slug(p))
		}

		if (farmProtocols) {
			if (farmProtocol) {
				if (typeof farmProtocol === 'string') {
					selectedFarmProtocols =
						farmProtocol === 'All' ? farmProtocols.map((p) => slug(p)) : farmProtocol === 'None' ? [] : [farmProtocol]
				} else {
					selectedFarmProtocols = [...farmProtocol]
				}
			} else selectedFarmProtocols = farmProtocols.map((p) => slug(p))
		}

		if (categoryList) {
			if (category) {
				if (typeof category === 'string') {
					selectedCategories = category === 'All' ? [...categoryList] : category === 'None' ? [] : [category]
				} else {
					selectedCategories = [...category]
				}
			} else selectedCategories = [...categoryList]
		}

		if (chainList) {
			if (chain) {
				if (typeof chain === 'string') {
					selectedChains = chain === 'All' ? [...chainList] : chain === 'None' ? [] : [chain]
				} else {
					selectedChains = [...chain]
				}
			} else selectedChains = [...chainList]
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

		return {
			selectedProjects,
			selectedChains,
			selectedAttributes,
			includeTokens,
			excludeTokens,
			exactTokens,
			selectedCategories,
			selectedLendingProtocols,
			selectedFarmProtocols
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
		farmProtocol
	])
}
