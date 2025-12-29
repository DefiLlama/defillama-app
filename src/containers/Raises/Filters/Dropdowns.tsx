import { useRouter } from 'next/router'
import { Chains } from './chains'
import { Investors } from './Investors'
import { RaisedRange } from './RaisedRange'
import { Rounds } from './rounds'
import { Sectors } from './sectors'
import type { IDropdownMenusProps } from './types'

export function RaisesFilterDropdowns({
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

	// Check if any filters are active
	const hasActiveFilters =
		(selectedInvestors && selectedInvestors.length > 0) ||
		(selectedChains && selectedChains.length > 0) ||
		(selectedSectors && selectedSectors.length > 0) ||
		(selectedRounds && selectedRounds.length > 0) ||
		router.query.minRaised ||
		router.query.maxRaised

	return (
		<>
			{investors && investors.length > 0 && (
				<Investors
					investors={investors}
					selectedInvestors={selectedInvestors || []}
					pathname={pathname}
					nestedMenu={nestedMenu}
				/>
			)}

			{chains && chains.length > 0 && (
				<Chains chains={chains} selectedChains={selectedChains || []} pathname={pathname} nestedMenu={nestedMenu} />
			)}

			{sectors && sectors.length > 0 && (
				<Sectors
					sectors={sectors}
					selectedSectors={selectedSectors || []}
					pathname={pathname}
					nestedMenu={nestedMenu}
				/>
			)}

			{rounds && rounds.length > 0 && (
				<Rounds rounds={rounds} selectedRounds={selectedRounds || []} pathname={pathname} nestedMenu={nestedMenu} />
			)}

			<RaisedRange nestedMenu={nestedMenu} variant="secondary" placement="bottom-start" />

			<button
				onClick={() => {
					router.push('/raises')
				}}
				disabled={!hasActiveFilters}
				className="rounded-md bg-(--btn-bg) px-3 py-2 hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) max-sm:text-left disabled:cursor-not-allowed disabled:opacity-40 md:text-xs"
			>
				Reset all filters
			</button>
		</>
	)
}
