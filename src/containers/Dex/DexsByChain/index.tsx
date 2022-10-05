import * as React from 'react'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { Header } from '~/Theme'
import { BreakpointPanel, BreakpointPanels, ChartAndValuesWrapper, Panel, PanelHiddenMobile } from '~/components'
import { DexsTable } from '~/components/Table'
import { RowLinksWithDropdown, RowLinksWrapper } from '~/components/Filters'
import { DexsSearch } from '~/components/Search'
import { formattedNum } from '~/utils'
import { formatVolumeHistoryToChartDataByProtocol } from '~/utils/dexs'
import { revalidate } from '~/api'
import { getChainsPageData } from '~/api/categories/protocols'
import { formatChain } from '~/api/categories/dexs/utils'
import type { VolumeSummaryDex } from '~/api/categories/dexs/types'
import type { IStackedBarChartProps } from '~/components/ECharts/BarChart/Stacked'
import { useFetchCharts } from '~/api/categories/dexs/client'

export async function getStaticProps() {
	const data = await getChainsPageData('All')
	return {
		...data,
		revalidate: revalidate()
	}
}

const StackedBarChart = dynamic(() => import('~/components/ECharts/BarChart/Stacked'), {
	ssr: false
}) as React.FC<IStackedBarChartProps>

const HeaderWrapper = styled(Header)`
	display: flex;
	justify-content: space-between;
	align-items: center;
	flex-wrap: wrap;
	gap: 12px;
	border: 1px solid transparent;
`

export interface IDexsContainer {
	chain: string
	totalVolume: number
	changeVolume1d: number
	changeVolume7d: number
	changeVolume30d: number
	totalDataChart: Array<[string, number]>
	totalDataChartBreakdown: Array<
		[
			string,
			{
				[dex: string]: number
			}
		]
	>
	dexs: VolumeSummaryDex[]
	tvlData: { [name: string]: number }
	allChains: string[]
}

export default function DexsContainer({
	dexs,
	totalVolume,
	changeVolume1d,
	changeVolume30d,
	totalDataChart,
	totalDataChartBreakdown,
	chain,
	allChains
}: IDexsContainer) {
	const [enableBreakdownChart, setEnableBreakdownChart] = React.useState(false)
	const [charts, setCharts] = React.useState<Pick<IDexsContainer, 'totalDataChart' | 'totalDataChartBreakdown'>>({
		totalDataChart,
		totalDataChartBreakdown
	})
	const { data, error, loading } = useFetchCharts()

	React.useEffect(() => {
		if (!error && !loading)
			setCharts({
				totalDataChart: data.totalDataChart,
				totalDataChartBreakdown: data.totalDataChartBreakdown
			})
	}, [data])

	const chartData = React.useMemo(() => {
		if (enableBreakdownChart) {
			return formatVolumeHistoryToChartDataByProtocol(
				charts.totalDataChartBreakdown.map(([date, value]) => ({
					dailyVolume: Object.entries(value).reduce((acc, [dex, volume]) => {
						acc[dex] = { [dex]: volume }
						return acc
					}, {}),
					timestamp: +date
				})),
				chain,
				chain.toLocaleLowerCase()
			)
		} else return charts.totalDataChart.map(([date, value]) => [new Date(+date * 1000), value])
	}, [totalDataChart, totalDataChartBreakdown, enableBreakdownChart, chain])

	return (
		<>
			<DexsSearch
				step={{
					category: 'DEXs',
					name: chain
				}}
				onToggleClick={(enabled) => setEnableBreakdownChart(enabled)}
			/>

			<HeaderWrapper>
				<span>Volume in {chain === 'All' ? 'all DEXs' : chain}</span>
			</HeaderWrapper>

			<ChartAndValuesWrapper>
				<BreakpointPanels>
					<BreakpointPanel>
						<h1>Total 24h volume (USD)</h1>
						<p style={{ '--tile-text-color': '#4f8fea' } as React.CSSProperties}>{formattedNum(totalVolume, true)}</p>
					</BreakpointPanel>
					<PanelHiddenMobile>
						<h2>Change (24h)</h2>
						<p style={{ '--tile-text-color': '#fd3c99' } as React.CSSProperties}> {changeVolume1d || 0}%</p>
					</PanelHiddenMobile>
					<PanelHiddenMobile>
						<h2>Change (30d)</h2>
						<p style={{ '--tile-text-color': '#46acb7' } as React.CSSProperties}> {changeVolume30d || 0}%</p>
					</PanelHiddenMobile>
				</BreakpointPanels>
				<BreakpointPanel id="chartWrapper">
					<StackedBarChart
						chartData={
							enableBreakdownChart
								? (chartData as IStackedBarChartProps['chartData'])
								: [
										{
											name: chain,
											data: chartData as IStackedBarChartProps['chartData'][0]['data']
										}
								  ]
						}
					/>
				</BreakpointPanel>
			</ChartAndValuesWrapper>

			<RowLinksWrapper>
				<RowLinksWithDropdown
					links={['All', ...allChains].map((chain) => ({
						label: formatChain(chain),
						to: chain === 'All' ? '/dexs' : `/dexs/${chain.toLowerCase()}`
					}))}
					activeLink={chain}
					alternativeOthersText="More chains"
				/>
			</RowLinksWrapper>

			{dexs && dexs.length > 0 ? (
				<DexsTable data={dexs} />
			) : (
				<Panel>
					<p style={{ textAlign: 'center' }}>
						{`There are no DEXs listed for the selected chain yet. 🦙🦙🦙 are working on it.`}
					</p>
				</Panel>
			)}
		</>
	)
}
