export interface IDropdownMenusProps {
	pathname?: string
	tokensList?: Array<string>
	selectedTokens?: Array<string>
	chainList?: Array<string>
	selectedChains?: Array<string>
	projectList?: Array<{ name: string; slug: string }>
	selectedProjects?: Array<string>
	lendingProtocols?: Array<{ name: string; slug: string }>
	selectedLendingProtocols?: Array<string>
	farmProtocols?: Array<{ name: string; slug: string }>
	selectedFarmProtocols?: Array<string>
	categoryList?: Array<string>
	selectedCategories?: Array<string>
	attributes?: boolean
	tvlRange?: boolean
	apyRange?: boolean
	availableRange?: boolean
	show7dBaseApy?: boolean
	show7dIL?: boolean
	resetFilters?: boolean
	excludeBadDebt?: boolean
	selectedAttributes?: Array<string>
	excludeRewardApy?: boolean
	isMobile?: boolean
}

export interface IYieldFiltersProps extends IDropdownMenusProps {
	header: string
	poolsNumber?: number
	projectsNumber?: number
	chainsNumber?: number
	tokens?: Array<{ name: string; symbol: string; logo: string }>
	strategyInputsData?: Array<{ name: string; symbol: string; image: string }>
	noOfStrategies?: number
}
