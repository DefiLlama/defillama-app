import * as React from 'react'
import { useRouter } from 'next/router'

export const useFormatYieldQueryParams = ({ projectList, chainList }) => {
	const router = useRouter()
	const { project, chain, token, excludeToken, attribute } = router.query

	return React.useMemo(() => {
		let selectedProjects = [],
			selectedChains = [],
			selectedAttributes = [],
			includeTokens = [],
			excludeTokens = []

		if (project) {
			if (typeof project === 'string') {
				selectedProjects = project === 'All' ? projectList.map((p) => p.slug) : [project]
			} else {
				selectedProjects = [...project]
			}
		}

		if (chain) {
			if (typeof chain === 'string') {
				selectedChains = chain === 'All' ? [...chainList] : [chain]
			} else {
				selectedChains = [...chain]
			}
		} else selectedChains = [...chainList]

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
			excludeTokens
		}
	}, [attribute, chain, project, token, excludeToken, projectList, chainList])
}
