import { Investors } from './Investors'
import { Chains } from './chains'
import { Sectors } from './sectors'
import { Rounds } from './rounds'
import { RaisedRange } from './RaisedRange'
import type { IDropdownMenusProps } from './types'
import { ResetAllButton } from '../v2Base'
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
	isMobile
}: IDropdownMenusProps) {
	const router = useRouter()
	return (
		<>
			{investors && investors.length > 0 && (
				<Investors
					investors={investors}
					selectedInvestors={selectedInvestors || []}
					pathname={pathname}
					subMenu={isMobile}
					variant="secondary"
				/>
			)}

			{chains && chains.length > 0 && (
				<Chains
					chains={chains}
					selectedChains={selectedChains || []}
					pathname={pathname}
					subMenu={isMobile}
					variant="secondary"
				/>
			)}

			{sectors && sectors.length > 0 && (
				<Sectors
					sectors={sectors}
					selectedSectors={selectedSectors || []}
					pathname={pathname}
					subMenu={isMobile}
					variant="secondary"
				/>
			)}

			{rounds && rounds.length > 0 && (
				<Rounds
					rounds={rounds}
					selectedRounds={selectedRounds || []}
					pathname={pathname}
					subMenu={isMobile}
					variant="secondary"
				/>
			)}

			<RaisedRange subMenu={isMobile} variant="secondary" />

			<ResetAllButton
				onClick={() => {
					router.push('/raises')
				}}
				data-variant="secondary"
			>
				Reset all filters
			</ResetAllButton>
		</>
	)
}
