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
					selectedProjects =
						project === 'All'
							? [...projectList]
							: project === 'None'
							? []
							: projectList.filter((p) => slug(p) === slug(project))
				} else {
					const pl = project.map((p) => slug(p))
					selectedProjects = projectList.filter((p) => pl.includes(slug(p)))
				}
			} else selectedProjects = [...projectList]
		}

		if (lendingProtocols) {
			if (lendingProtocol) {
				if (typeof lendingProtocol === 'string') {
					selectedLendingProtocols =
						lendingProtocol === 'All'
							? [...lendingProtocols]
							: lendingProtocol === 'None'
							? []
							: lendingProtocols.filter((p) => slug(p) === slug(lendingProtocol))
				} else {
					const lp = lendingProtocol.map((l) => slug(l))
					selectedLendingProtocols = lendingProtocols.filter((p) => lp.includes(slug(p)))
				}
			} else selectedLendingProtocols = [...lendingProtocols]
		}

		if (farmProtocols) {
			if (farmProtocol) {
				if (typeof farmProtocol === 'string') {
					selectedFarmProtocols =
						farmProtocol === 'All'
							? [...farmProtocols]
							: farmProtocol === 'None'
							? []
							: farmProtocols.filter((p) => slug(p) === slug(farmProtocol))
				} else {
					const fp = farmProtocol.map((f) => slug(f))
					selectedFarmProtocols = farmProtocols.filter((f) => fp.includes(slug(f)))
				}
			} else selectedFarmProtocols = [...farmProtocols]
		}

		if (categoryList) {
			if (category) {
				if (typeof category === 'string') {
					selectedCategories =
						category === 'All'
							? [...categoryList]
							: category === 'None'
							? []
							: categoryList.filter((c) => slug(c) === slug(category))
				} else {
					const cc = category.map((c) => slug(c))
					selectedCategories = categoryList.filter((c) => cc.includes(slug(c)))
				}
			} else selectedCategories = [...categoryList]
		}

		if (chainList) {
			if (chain) {
				if (typeof chain === 'string') {
					selectedChains =
						chain === 'All' ? [...chainList] : chain === 'None' ? [] : chainList.filter((c) => slug(c) === slug(chain))
				} else {
					const cc = chain.map((c) => slug(c))
					selectedChains = chainList.filter((c) => cc.includes(slug(c)))
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
