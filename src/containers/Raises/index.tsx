import { useRouter } from 'next/router'
import * as React from 'react'
import { Announcement } from '~/components/Announcement'
import type { IMultiSeriesChart2Props } from '~/components/ECharts/types'
import { RaisesFilters } from '~/containers/Raises/Filters'
import { formattedNum } from '~/utils'
import { useRaisesData } from './hooks'
import { RaisesTable } from './Table'
import type { IRaise } from './types'

const MultiSeriesChart2 = React.lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>

interface RaisesContainerProps {
	raises: IRaise[]
	investors: string[]
	rounds: string[]
	sectors: string[]
	chains: string[]
	investorName: string | null
}

const RaisesContainer = ({ raises, investors, rounds, sectors, chains, investorName }: RaisesContainerProps) => {
	const { pathname } = useRouter()

	const {
		filteredRaisesList,
		selectedInvestors,
		selectedRounds,
		selectedChains,
		selectedSectors,
		totalAmountRaised,
		monthlyInvestmentChart
	} = useRaisesData({
		raises,
		investors,
		rounds,
		sectors,
		chains
	})
	const deferredMonthlyInvestmentChart = React.useDeferredValue(monthlyInvestmentChart)

	return (
		<>
			<Announcement notCancellable>
				<span>Are we missing any funding round?</span>{' '}
				<a
					href="https://airtable.com/shrON6sFMgyFGulaq"
					className="font-medium text-(--blue) underline"
					target="_blank"
					rel="noopener noreferrer"
				>
					Add it here!
				</a>
				<br />
				<span>
					Are you a VC and want to submit your investments in bulk? Email them to us at{' '}
					<a href="mailto:support@defillama.com" className="text-(--blue) underline">
						support@defillama.com
					</a>
				</span>
			</Announcement>
			<RaisesFilters
				header={investorName ? `${investorName} raises` : 'Raises'}
				rounds={rounds}
				selectedRounds={selectedRounds}
				sectors={sectors}
				selectedSectors={selectedSectors}
				investors={investors}
				selectedInvestors={selectedInvestors}
				chains={chains}
				selectedChains={selectedChains}
				pathname={pathname}
			/>

			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
					<p className="flex flex-col gap-1 text-base">
						<span className="text-(--text-label)">Total Funding Rounds</span>
						<span className="font-jetbrains text-2xl font-semibold">{filteredRaisesList.length}</span>
					</p>
					<p className="flex flex-col gap-1 text-base">
						<span className="text-(--text-label)">Total Funding Amount</span>
						<span className="font-jetbrains text-2xl font-semibold">${formattedNum(totalAmountRaised)}</span>
					</p>
				</div>

				<div className="col-span-2 rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<React.Suspense fallback={<div className="min-h-[398px]" />}>
						<MultiSeriesChart2
							dataset={deferredMonthlyInvestmentChart.dataset}
							charts={deferredMonthlyInvestmentChart.charts}
							valueSymbol="$"
							groupBy="monthly"
							exportButtons="auto"
						/>
					</React.Suspense>
				</div>
			</div>

			<RaisesTable raises={filteredRaisesList} />
		</>
	)
}

export default RaisesContainer
