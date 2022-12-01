export interface IDropdownMenusProps {
	pathname?: string
	tokensList?: Array<string>
	selectedTokens?: Array<string>
	chainList?: Array<string>
	selectedChains?: Array<string>
	projectList?: Array<{ name: string; slug: string }>
	selectedProjects?: Array<string>
	categoryList?: Array<string>
	selectedCategories?: Array<string>
	attributes?: boolean
	tvlRange?: boolean
	apyRange?: boolean
	show7dBaseApy?: boolean
	show7dIL?: boolean
	resetFilters?: boolean
}

export interface IYieldFiltersProps extends IDropdownMenusProps {
	header: string
	poolsNumber?: number
	projectsNumber?: number
	chainsNumber?: number
	tokens?: Array<{ name: string; symbol: string; logo: string }>
}
