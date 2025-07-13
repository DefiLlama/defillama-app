import * as React from 'react'
import { useRouter } from 'next/router'
import { YieldsSearch } from '~/components/Search/Yields/Optimizer'
import { useMedia } from '~/hooks/useMedia'
import { IncludeExcludeTokens } from './IncludeExcludeTokens'
import { LTV } from './LTV'
import { YieldFilterDropdowns } from './Dropdowns'
import type { IYieldFiltersProps } from './types'
import { InputFilter } from './Amount'
import { NestedMenu } from '~/components/NestedMenu'
import { useIsClient } from '~/hooks'
import { useYieldFilters } from '~/contexts/LocalStorage'
import { Icon } from '~/components/Icon'
import * as Ariakit from '@ariakit/react'

function SavedFilters({ currentFilters }) {
	const { savedFilters, saveFilter, deleteFilter } = useYieldFilters()
	const router = useRouter()

	const handleSave = () => {
		const name = window.prompt('Enter a name for this filter configuration')
		if (name) {
			saveFilter(name, currentFilters)
		}
	}

	const handleLoad = (name: string) => {
		const filters = savedFilters[name]
		if (filters) {
			router.push(
				{
					pathname: router.pathname,
					query: filters
				},
				undefined,
				{ shallow: true }
			)
		}
	}

	const handleDelete = (name: string) => {
		if (window.confirm(`Delete saved filter "${name}"?`)) {
			deleteFilter(name)
		}
	}

	return (
		<div className="flex items-center gap-2 ml-auto">
			<button
				onClick={handleSave}
				className="flex items-center gap-1 justify-center py-2 px-2 whitespace-nowrap text-xs rounded-md text-(--link-text) bg-(--link-bg) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
			>
				Save Current Filters
			</button>
			<Ariakit.MenuProvider>
				<Ariakit.MenuButton className="bg-(--btn-bg) hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) flex items-center justify-between gap-2 py-2 px-3 rounded-md cursor-pointer text-(--text1) text-xs flex-nowrap">
					Saved Filters
					<Ariakit.MenuButtonArrow />
				</Ariakit.MenuButton>
				<Ariakit.Menu
					unmountOnHide
					gutter={8}
					wrapperProps={{
						className: 'max-sm:fixed! max-sm:bottom-0! max-sm:top-[unset]! max-sm:transform-none! max-sm:w-full!'
					}}
					className="flex flex-col bg-(--bg1) rounded-md max-sm:rounded-b-none z-10 overflow-auto overscroll-contain min-w-[180px] max-h-[60vh] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer sm:max-w-md"
				>
					{Object.entries(savedFilters).map(([name], i) => (
						<Ariakit.MenuItem
							key={`custom-filter-${name}-${i}`}
							onClick={() => handleLoad(name)}
							className="flex items-center justify-between gap-4 py-2 px-3 shrink-0 hover:bg-(--primary1-hover) focus-visible:bg-(--primary1-hover) data-active-item:bg-(--primary1-hover) cursor-pointer first-of-type:rounded-t-md last-of-type:rounded-b-md border-b border-(--form-control-border) whitespace-nowrap overflow-hidden text-ellipsis"
						>
							{name}
							<button
								onClick={(e) => {
									e.stopPropagation()
									handleDelete(name)
								}}
								className="text-red-500 hover:text-red-600 flex items-center justify-center"
							>
								<Icon name="x" height={16} width={16} />
								<span className="sr-only">Delete</span>
							</button>
						</Ariakit.MenuItem>
					))}
					{Object.keys(savedFilters).length === 0 && <p className="p-4 text-center text-xs">No saved filters</p>}
				</Ariakit.Menu>
			</Ariakit.MenuProvider>
		</div>
	)
}

export function YieldFiltersV2({
	header,
	poolsNumber,
	projectsNumber,
	chainsNumber,
	tokens,
	noOfStrategies,
	strategyInputsData,
	ltvPlaceholder,
	showSearchOnMobile,
	...props
}: IYieldFiltersProps) {
	const trackingStats =
		poolsNumber && projectsNumber && chainsNumber
			? `Tracking ${poolsNumber + (poolsNumber > 1 ? ' pools' : ' pool')} over ${
					projectsNumber + (projectsNumber > 1 ? ' protocols' : ' protocol')
			  } on ${chainsNumber + (chainsNumber > 1 ? ' chains' : ' chain')}.`
			: noOfStrategies
			? `: ${noOfStrategies} Strategies`
			: null

	const isSmall = useMedia(`(max-width: 639px)`)
	const isClient = useIsClient()

	const { query } = useRouter()

	const lend = typeof query.lend === 'string' ? query.lend : null
	const borrow = typeof query.borrow === 'string' ? query.borrow : null

	return (
		<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md">
			<div className="flex items-center flex-wrap gap-2 p-3">
				<h1 className="font-semibold">{header}</h1>
				{trackingStats ? <p>{trackingStats}</p> : null}
				<SavedFilters currentFilters={query} />
			</div>
			<div className="flex flex-col gap-4 p-3 rounded-b-md">
				{strategyInputsData ? (
					<StrategySearch lend={lend} borrow={borrow} searchData={strategyInputsData} ltvPlaceholder={ltvPlaceholder} />
				) : null}
				{tokens && (showSearchOnMobile || !isSmall) ? (
					<IncludeExcludeTokens tokens={tokens} data-alwaysdisplay={showSearchOnMobile ? true : false} />
				) : null}
				<div className="flex flex-wrap gap-2 min-h-9 *:flex-1 sm:hidden">
					{isSmall && isClient ? (
						<React.Suspense fallback={<></>}>
							<NestedMenu label="Filters">
								<YieldFilterDropdowns {...props} nestedMenu />
							</NestedMenu>
						</React.Suspense>
					) : null}
				</div>
				<div className="hidden flex-wrap gap-2 min-h-8 sm:flex">
					{!isSmall && isClient ? (
						<React.Suspense fallback={<></>}>
							<YieldFilterDropdowns {...props} />
						</React.Suspense>
					) : null}
				</div>
			</div>
		</div>
	)
}

function useFormatTokensSearchList({ searchData }) {
	const data = React.useMemo(() => {
		const stablecoinsSearch = {
			name: `All USD Stablecoins`,
			symbol: 'USD_Stables',
			logo: 'https://icons.llamao.fi/icons/pegged/usd_native?h=48&w=48'
		}

		const yieldsList =
			searchData.map((el) => [
				`${el.name}`,
				{
					name: `${el.name}`,
					symbol: el.symbol.toUpperCase(),
					logo: el.image2 || null,
					fallbackLogo: el.image || null
				}
			]) ?? []

		return Object.fromEntries([[stablecoinsSearch.name, stablecoinsSearch]].concat(yieldsList))
	}, [searchData])

	return { data }
}

const StrategySearch = ({ lend, borrow, searchData, ltvPlaceholder }) => {
	const { data } = useFormatTokensSearchList({ searchData })

	return (
		<div className="flex flex-col md:flex-row md:items-center gap-2 flex-wrap *:flex-1">
			<YieldsSearch value={lend} searchData={data} lend />
			{lend ? (
				<>
					<YieldsSearch value={borrow} searchData={data} />
					<LTV placeholder={ltvPlaceholder} />
					<InputFilter placeholder="Lend Amount" filterKey="lendAmount" />
					<InputFilter placeholder="Borrow Amount" filterKey="borrowAmount" />
				</>
			) : null}
		</div>
	)
}
