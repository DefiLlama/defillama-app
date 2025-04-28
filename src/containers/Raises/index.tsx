import * as React from 'react'
import dynamic from 'next/dynamic'
import Layout from '~/layout'
import type { IBarChartProps } from '~/components/ECharts/types'
import { Announcement } from '~/components/Announcement'
import { RaisesFilters } from '~/components/Filters/raises'
import { useRouter } from 'next/router'
import { formattedNum } from '~/utils'
import { RaisesTable } from './RaisesTable'
import { downloadCsv } from './download'
import { useRaisesData } from './hooks'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

const RaisesContainer = ({ raises, investors, rounds, sectors, chains, investorName }) => {
	const { pathname } = useRouter()

	const { filteredRaisesList, selectedInvestors, selectedRounds, selectedChains, selectedSectors, monthlyInvestment } =
		useRaisesData({
			raises,
			investors,
			rounds,
			sectors,
			chains
		})

	const totalAmountRaised = monthlyInvestment.reduce((acc, curr) => (acc += curr[1]), 0)

	return (
		<Layout title={`Raises - DefiLlama`} defaultSEO>
			<Announcement notCancellable>
				<span>Are we missing any funding round?</span>{' '}
				<a
					href="https://airtable.com/shrON6sFMgyFGulaq"
					className="text-[var(--blue)] underline font-medium"
					target="_blank"
					rel="noopener noreferrer"
				>
					Add it here!
				</a>
				<br />
				<span>Are you a VC and want to submit your investments in bulk? Email them to us at raises@llama.fi</span>
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

			<div className="grid grid-cols-2 relative isolate xl:grid-cols-3 gap-1">
				<div className="bg-[var(--cards-bg)] rounded-md flex flex-col gap-6 p-5 col-span-2 w-full xl:col-span-1 overflow-x-auto">
					<p className="flex flex-col gap-1 text-base">
						<span className="text-[#545757] dark:text-[#cccccc]">Total Funding Rounds</span>
						<span className="font-jetbrains font-semibold text-2xl">{filteredRaisesList.length}</span>
					</p>
					<p className="flex flex-col gap-1 text-base">
						<span className="text-[#545757] dark:text-[#cccccc]">Total Funding Amount</span>
						<span className="font-jetbrains font-semibold text-2xl">${formattedNum(totalAmountRaised)}</span>
					</p>
					<CSVDownloadButton onClick={() => downloadCsv({ raises })} className="mt-auto mr-auto" />
				</div>

				<div className="bg-[var(--cards-bg)] rounded-md col-span-2 min-h-[360px] ">
					<BarChart chartData={monthlyInvestment} title="" valueSymbol="$" color="#1F67D2" groupBy="monthly" />
				</div>
			</div>

			<RaisesTable raises={filteredRaisesList} downloadCsv={() => downloadCsv({ raises })} />
		</Layout>
	)
}

export default RaisesContainer
