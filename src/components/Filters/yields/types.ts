export interface IDropdownMenusProps {
	pathname?: string
	tokensList?: Array<string>
	selectedTokens?: Array<string>
	chainList?: Array<string>
	selectedChains?: Array<string>
	projectList?: Array<string>
	selectedProjects?: Array<string>
	lendingProtocols?: Array<string>
	selectedLendingProtocols?: Array<string>
	farmProtocols?: Array<string>
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
	ltvPlaceholder?: string
	show1dVolume?: boolean
	show7dVolume?: boolean
}

export interface IYieldFiltersProps extends IDropdownMenusProps {
	header: string
	poolsNumber?: number
	projectsNumber?: number
	chainsNumber?: number
	tokens?: Array<{ name: string; symbol: string; logo: string }>
	strategyInputsData?: Array<{ name: string; symbol: string; image: string }>
	noOfStrategies?: number
	showSearchOnMobile?: boolean
}
