import { Investors } from './Investors'
import { Chains } from './chains'
import { Sectors } from './sectors'
import { Rounds } from './rounds'
import { RaisedRange } from './RaisedRange'
import type { IDropdownMenusProps } from './types'
import { useRouter } from 'next/router'

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

			<RaisedRange nestedMenu={nestedMenu} variant="secondary" />

			<button
				onClick={() => {
					router.push('/raises')
				}}
				className="rounded-md py-2 px-3 md:text-xs bg-(--btn-bg) hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) max-sm:text-left"
			>
				Reset all filters
			</button>
		</>
	)
}
