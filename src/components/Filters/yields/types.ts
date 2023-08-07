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
	includeLsdApy?: boolean
	isMobile?: boolean
	ltvPlaceholder?: string
	show1dVolume?: boolean
	show7dVolume?: boolean
	showInceptionApy?: boolean
	showBorrowBaseApy?: boolean
	showBorrowRewardApy?: boolean
	showNetBorrowApy?: boolean
	showLTV?: boolean
	showTotalSupplied?: boolean
	showTotalBorrowed?: boolean
	showAvailable?: boolean
}

export interface IYieldFiltersProps extends IDropdownMenusProps {
	header: string
	poolsNumber?: number
	projectsNumber?: number
	chainsNumber?: number
	tokens?: Array<{ name: string; symbol: string; logo?: string | null; fallbackLogo?: string | null }>
	strategyInputsData?: Array<{ name: string; symbol: string; image?: string | null; image2?: string | null }>
	noOfStrategies?: number
	showSearchOnMobile?: boolean
}
