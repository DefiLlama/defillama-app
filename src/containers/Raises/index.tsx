import * as React from 'react'
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
import { oldBlue } from '~/constants/colors'
import { Metrics } from '~/components/Metrics'

const BarChart = React.lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>

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
					className="text-(--blue) underline font-medium"
					target="_blank"
					rel="noopener noreferrer"
				>
					Add it here!
				</a>
				<br />
				<span>Are you a VC and want to submit your investments in bulk? Email them to us at support@defillama.com</span>
			</Announcement>
			<Metrics currentMetric="Total Raised" />
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

			<div className="grid grid-cols-2 relative isolate xl:grid-cols-3 gap-2">
				<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md flex flex-col gap-6 p-5 col-span-2 w-full xl:col-span-1 overflow-x-auto">
					<p className="flex flex-col gap-1 text-base">
						<span className="text-[#545757] dark:text-[#cccccc]">Total Funding Rounds</span>
						<span className="font-jetbrains font-semibold text-2xl">{filteredRaisesList.length}</span>
					</p>
					<p className="flex flex-col gap-1 text-base">
						<span className="text-[#545757] dark:text-[#cccccc]">Total Funding Amount</span>
						<span className="font-jetbrains font-semibold text-2xl">${formattedNum(totalAmountRaised)}</span>
					</p>
					<CSVDownloadButton
						onClick={() => downloadCsv({ raises })}
						className="h-[30px] bg-transparent! border border-(--form-control-border) text-[#666]! dark:text-[#919296]! hover:bg-(--link-hover-bg)! focus-visible:bg-(--link-hover-bg)! mt-auto mr-auto"
					/>
				</div>

				<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md col-span-2 min-h-[408px] pt-2">
					<React.Suspense fallback={<></>}>
						<BarChart chartData={monthlyInvestment} title="" valueSymbol="$" color={oldBlue} groupBy="monthly" />
					</React.Suspense>
				</div>
			</div>

			<RaisesTable raises={filteredRaisesList} downloadCsv={() => downloadCsv({ raises })} />
		</Layout>
	)
}

export default RaisesContainer
