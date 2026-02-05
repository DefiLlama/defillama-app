import * as Ariakit from '@ariakit/react'
import Router, { useRouter } from 'next/router'
import * as React from 'react'
import { FilterBetweenRange } from '~/components/Filters/FilterBetweenRange'
import { NestedMenu } from '~/components/NestedMenu'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { RaisesSearch } from '~/containers/Raises/Search'
import { useIsClient } from '~/hooks/useIsClient'
import { useMedia } from '~/hooks/useMedia'

interface IDropdownMenusProps {
	header: string
	pathname?: string
	investors?: Array<string>
	selectedInvestors?: Array<string>
	chains?: Array<string>
	selectedChains?: Array<string>
	sectors?: Array<string>
	selectedSectors?: Array<string>
	rounds?: Array<string>
	selectedRounds?: Array<string>
	nestedMenu?: boolean
}

export function RaisesFilters(props: IDropdownMenusProps) {
	const isSmall = useMedia(`(max-width: 639px)`)
	const isClient = useIsClient()

	return (
		<div className="flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
			<h1 className="text-lg font-semibold">{props.header}</h1>
			<RaisesSearch list={props.investors} />
			<div className="flex min-h-9 flex-wrap gap-2 *:flex-1 sm:hidden">
				{isSmall && isClient ? (
					<React.Suspense fallback={<></>}>
						<NestedMenu label="Filters" className="w-full">
							<Filters {...props} nestedMenu />
						</NestedMenu>
					</React.Suspense>
				) : null}
			</div>
			<div className="hidden min-h-8 flex-wrap gap-2 sm:flex">
				{!isSmall && isClient ? (
					<React.Suspense fallback={<></>}>
						<Filters {...props} />
					</React.Suspense>
				) : null}
			</div>
		</div>
	)
}

const EMPTY_INVESTORS: string[] = []
const EMPTY_CHAINS: string[] = []
const EMPTY_SECTORS: string[] = []
const EMPTY_ROUNDS: string[] = []

function Filters({
	investors,
	selectedInvestors,
	chains,
	selectedChains,
	sectors,
	selectedSectors,
	rounds,
	selectedRounds,
	pathname,
	nestedMenu
}: IDropdownMenusProps) {
	const router = useRouter()

	// Check if any filters are active based on URL query params.
	// The selected* arrays default to "all values" when no query is set, so using their lengths
	// would incorrectly mark filters as active (especially on investor pages).
	const hasActiveFilters =
		(!!router.query.investor && router.query.investor !== 'All') ||
		(!!router.query.chain && router.query.chain !== 'All') ||
		(!!router.query.sector && router.query.sector !== 'All') ||
		(!!router.query.round && router.query.round !== 'All') ||
		!!router.query.minRaised ||
		!!router.query.maxRaised

	return (
		<>
			{investors && investors.length > 0 && (
				<SelectWithCombobox
					label="Investors"
					allValues={investors}
					selectedValues={selectedInvestors ?? EMPTY_INVESTORS}
					nestedMenu={nestedMenu}
					labelType="smol"
					variant="filter-responsive"
					includeQueryKey="investor"
					excludeQueryKey="excludeInvestor"
				/>
			)}

			{chains && chains.length > 0 && (
				<SelectWithCombobox
					label="Chains"
					allValues={chains}
					selectedValues={selectedChains ?? EMPTY_CHAINS}
					nestedMenu={nestedMenu}
					labelType="smol"
					variant="filter-responsive"
					includeQueryKey="chain"
					excludeQueryKey="excludeChain"
				/>
			)}

			{sectors && sectors.length > 0 && (
				<SelectWithCombobox
					label="Sectors"
					allValues={sectors}
					selectedValues={selectedSectors ?? EMPTY_SECTORS}
					nestedMenu={nestedMenu}
					labelType="smol"
					variant="filter-responsive"
					includeQueryKey="sector"
					excludeQueryKey="excludeSector"
				/>
			)}

			{rounds && rounds.length > 0 && (
				<SelectWithCombobox
					label="Rounds"
					allValues={rounds}
					selectedValues={selectedRounds ?? EMPTY_ROUNDS}
					nestedMenu={nestedMenu}
					labelType="smol"
					variant="filter-responsive"
					includeQueryKey="round"
					excludeQueryKey="excludeRound"
				/>
			)}

			<RaisedRange nestedMenu={nestedMenu} placement="bottom-start" />

			<button
				onClick={() => {
					// Clear only the query params; keep the current concrete path (works on dynamic routes too).
					const basePath = router.asPath.split('?')[0] || pathname || '/raises'
					router.push(basePath, undefined, { shallow: true })
				}}
				disabled={!hasActiveFilters}
				className="relative flex cursor-pointer flex-nowrap items-center justify-between gap-2 rounded-md border border-(--form-control-border) px-2 py-1.5 text-xs font-medium text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:cursor-not-allowed disabled:opacity-40"
			>
				Reset all filters
			</button>
		</>
	)
}

function RaisedRange({
	nestedMenu,
	placement
}: {
	nestedMenu?: boolean
	placement?: Ariakit.PopoverStoreProps['placement']
}) {
	const router = useRouter()

	const handleSubmit = (e) => {
		e.preventDefault()
		const form = e.target
		const minRaised = form.min?.value
		const maxRaised = form.max?.value

		const params = new URLSearchParams(window.location.search)
		if (minRaised) params.set('minRaised', minRaised)
		else params.delete('minRaised')
		if (maxRaised) params.set('maxRaised', maxRaised)
		else params.delete('maxRaised')
		Router.push(`${window.location.pathname}?${params.toString()}`, undefined, { shallow: true })
	}

	const handleClear = () => {
		const params = new URLSearchParams(window.location.search)
		params.delete('minRaised')
		params.delete('maxRaised')
		const queryString = params.toString()
		const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname
		Router.push(newUrl, undefined, { shallow: true })
	}

	const { minRaised, maxRaised } = router.query
	const min = typeof minRaised === 'string' && minRaised !== '' ? Number(minRaised) : null
	const max = typeof maxRaised === 'string' && maxRaised !== '' ? Number(maxRaised) : null

	return (
		<FilterBetweenRange
			name="Amount Raised"
			trigger={
				<>
					{min || max ? (
						<>
							<span>Amount Raised: </span>
							<span className="text-(--link)">{`${min?.toLocaleString() ?? 'min'} - ${
								max?.toLocaleString() ?? 'max'
							}`}</span>
						</>
					) : (
						<span>Amount Raised</span>
					)}
				</>
			}
			onSubmit={handleSubmit}
			onClear={handleClear}
			nestedMenu={nestedMenu}
			min={min}
			max={max}
			placement={placement}
		/>
	)
}
