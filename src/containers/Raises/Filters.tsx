import * as Ariakit from '@ariakit/react'
import { useRouter } from 'next/router'
import * as React from 'react'
import { FilterBetweenRange } from '~/components/Filters/FilterBetweenRange'
import { ResponsiveFilterLayout } from '~/components/Filters/ResponsiveFilterLayout'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { RaisesSearch } from '~/containers/Raises/Search'
import { useRangeFilter } from '~/hooks/useRangeFilter'

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
	return (
		<div className="flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
			<h1 className="text-lg font-semibold">{props.header}</h1>
			<RaisesSearch list={props.investors} />
			<ResponsiveFilterLayout>{(nestedMenu) => <Filters {...props} nestedMenu={nestedMenu} />}</ResponsiveFilterLayout>
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
	const { min, max, handleSubmit, handleClear } = useRangeFilter('minRaised', 'maxRaised')

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
