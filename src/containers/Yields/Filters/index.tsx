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
import { ButtonLight } from '~/components/ButtonStyled'
import { Icon } from '~/components/Icon'

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
			router.push({
				pathname: router.pathname,
				query: filters
			})
		}
	}

	const handleDelete = (name: string) => {
		if (window.confirm(`Delete saved filter "${name}"?`)) {
			deleteFilter(name)
		}
	}

	return (
		<div className="flex items-center gap-2">
			<ButtonLight onClick={handleSave}>Save Current Filters</ButtonLight>
			<NestedMenu label="Saved Filters">
				{Object.entries(savedFilters).map(([name]) => (
					<div key={name} className="flex items-center justify-between gap-2 p-2">
						<button onClick={() => handleLoad(name)} className="hover:text-[var(--text1)]">
							{name}
						</button>
						<button onClick={() => handleDelete(name)} className="text-red-500 hover:text-red-600">
							<Icon name="x" height={16} width={16} />
						</button>
					</div>
				))}
				{Object.keys(savedFilters).length === 0 && <div className="p-2 text-[var(--text2)]">No saved filters</div>}
			</NestedMenu>
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
		<div className="bg-[var(--cards-bg)] rounded-md">
			<div className="relative flex items-center justify-between flex-wrap p-3">
				<div className="flex items-center gap-2">
					<h1 className="font-semibold">{header}</h1>
					{trackingStats ? <p>{trackingStats}</p> : null}
				</div>
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
