import * as React from 'react'
import dynamic from 'next/dynamic'
import Layout from '~/layout'
import type { IBarChartProps } from '~/components/ECharts/types'
import { ChartWrapper, DetailsWrapper } from '~/layout/ProtocolAndPool'
import { StatsSection } from '~/layout/Stats/Medium'
import { Stat } from '~/layout/Stats/Large'
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

			<StatsSection>
				<DetailsWrapper>
					<Stat>
						<span>Total Funding Rounds</span>
						<span>{filteredRaisesList.length}</span>
					</Stat>
					<Stat>
						<span>Total Funding Amount</span>
						<span>${formattedNum(totalAmountRaised)}</span>
					</Stat>
					<CSVDownloadButton
						onClick={() => downloadCsv({ raises })}
						isLight
						style={{ width: '100px', marginTop: 'auto' }}
					/>
				</DetailsWrapper>

				<ChartWrapper>
					<BarChart chartData={monthlyInvestment} title="Monthly sum" valueSymbol="$" />
				</ChartWrapper>
			</StatsSection>

			<RaisesTable raises={filteredRaisesList} downloadCsv={() => downloadCsv({ raises })} />
		</Layout>
	)
}

export default RaisesContainer
