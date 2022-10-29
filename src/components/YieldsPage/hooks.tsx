import * as React from 'react'
import { useRouter } from 'next/router'

interface IFormatYieldQueryParams {
	projectList?: Array<{ name: string; slug: string }>
	lendingProtocols?: Array<{ name: string; slug: string }>
	farmProtocols?: Array<{ name: string; slug: string }>
	chainList?: Array<{ name: string; slug: string }>
	categoryList?: Array<{ name: string; slug: string }>
}

export const useFormatYieldQueryParams = ({
	projectList,
	chainList,
	categoryList,
	lendingProtocols,
	farmProtocols
}: IFormatYieldQueryParams) => {
	const router = useRouter()
	const { project, lendingProtocol, farmProtocol, chain, token, excludeToken, attribute, category } = router.query

	return React.useMemo(() => {
		let selectedProjects = [],
			selectedChains = [],
			selectedAttributes = [],
			includeTokens = [],
			excludeTokens = [],
			selectedCategories = [],
			selectedLendingProtocols = [],
			selectedFarmProtocols = []

		if (projectList) {
			if (project) {
				if (typeof project === 'string') {
					selectedProjects = project === 'All' ? projectList.map((p) => p.slug) : project === 'None' ? [] : [project]
				} else {
					selectedProjects = [...project]
				}
			} else selectedProjects = projectList.map((p) => p.slug)
		}

		if (lendingProtocols) {
			if (lendingProtocol) {
				if (typeof lendingProtocol === 'string') {
					selectedLendingProtocols =
						lendingProtocol === 'All'
							? lendingProtocols.map((p) => p.slug)
							: lendingProtocol === 'None'
							? []
							: [lendingProtocol]
				} else {
					selectedLendingProtocols = [...lendingProtocol]
				}
			} else selectedLendingProtocols = lendingProtocols.map((p) => p.slug)
		}

		if (farmProtocols) {
			if (farmProtocol) {
				if (typeof farmProtocol === 'string') {
					selectedFarmProtocols =
						farmProtocol === 'All' ? farmProtocols.map((p) => p.slug) : farmProtocol === 'None' ? [] : [farmProtocol]
				} else {
					selectedFarmProtocols = [...farmProtocol]
				}
			} else selectedFarmProtocols = farmProtocols.map((p) => p.slug)
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

		return {
			selectedProjects,
			selectedChains,
			selectedAttributes,
			includeTokens,
			excludeTokens,
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
