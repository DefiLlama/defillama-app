import * as React from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { NestedMenu } from '~/components/NestedMenu'
import { useYieldFilters } from '~/contexts/LocalStorage'
import { useIsClient } from '~/hooks'
import { useMedia } from '~/hooks/useMedia'
import { YieldsSearch } from '../Search'
import { InputFilter } from './Amount'
import { YieldFilterDropdowns } from './Dropdowns'
import { IncludeExcludeTokens } from './IncludeExcludeTokens'
import { LTV } from './LTV'
import type { IYieldFiltersProps } from './types'

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
		<div className="ml-auto flex items-center gap-2">
			<button
				onClick={handleSave}
				className="ml-auto flex items-center justify-center gap-1 rounded-md bg-(--link-bg) px-2 py-2 text-xs whitespace-nowrap text-(--link-text) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:cursor-not-allowed disabled:opacity-50"
			>
				Save Current Filters
			</button>
			<Ariakit.MenuProvider>
				<Ariakit.MenuButton className="flex cursor-pointer flex-nowrap items-center justify-between gap-2 rounded-md bg-(--btn-bg) px-3 py-2 text-xs text-(--text-primary) hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg)">
					Saved Filters
					<Ariakit.MenuButtonArrow />
				</Ariakit.MenuButton>
				<Ariakit.Menu
					unmountOnHide
					gutter={8}
					wrapperProps={{
						className: 'max-sm:fixed! max-sm:bottom-0! max-sm:top-[unset]! max-sm:transform-none! max-sm:w-full!'
					}}
					className="max-sm:drawer z-10 flex max-h-[60vh] min-w-[180px] flex-col overflow-auto overscroll-contain rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) max-sm:rounded-b-none sm:max-w-md dark:border-[hsl(204,3%,32%)]"
				>
					{Object.entries(savedFilters).map(([name], i) => (
						<Ariakit.MenuItem
							key={`custom-filter-${name}-${i}`}
							onClick={() => handleLoad(name)}
							className="flex shrink-0 cursor-pointer items-center justify-between gap-4 overflow-hidden border-b border-(--form-control-border) px-3 py-2 text-ellipsis whitespace-nowrap first-of-type:rounded-t-md last-of-type:rounded-b-md hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) data-active-item:bg-(--primary-hover)"
						>
							{name}
							<button
								onClick={(e) => {
									e.stopPropagation()
									handleDelete(name)
								}}
								className="flex items-center justify-center text-red-500 hover:text-red-600"
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
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex flex-wrap items-center gap-2 p-3">
				<h1 className="font-semibold">{header}</h1>
				{trackingStats ? <p>{trackingStats}</p> : null}
				<SavedFilters currentFilters={query} />
			</div>
			<div className="flex flex-col gap-4 rounded-b-md p-3">
				{strategyInputsData ? (
					<StrategySearch lend={lend} borrow={borrow} searchData={strategyInputsData} ltvPlaceholder={ltvPlaceholder} />
				) : null}
				{tokens && (showSearchOnMobile || !isSmall) ? (
					<IncludeExcludeTokens tokens={tokens} data-alwaysdisplay={showSearchOnMobile ? true : false} />
				) : null}
				<div className="flex min-h-9 flex-wrap gap-2 *:flex-1 sm:hidden">
					{isSmall && isClient ? (
						<React.Suspense fallback={<></>}>
							<NestedMenu label="Filters">
								<YieldFilterDropdowns {...props} nestedMenu />
							</NestedMenu>
						</React.Suspense>
					) : null}
				</div>
				<div className="hidden min-h-8 flex-wrap gap-2 sm:flex">
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

const StrategySearch = ({ lend, borrow, searchData, ltvPlaceholder }) => {
	const data = React.useMemo(() => {
		const stablecoinsSearch = {
			name: `All USD Stablecoins`,
			symbol: 'USD_Stables'
		}

		return [stablecoinsSearch].concat(searchData) as Array<{ name: string; symbol: string }>
	}, [searchData])

	return (
		<div className="flex flex-col flex-wrap gap-2 *:flex-1 md:flex-row md:items-center">
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
