import * as React from 'react'
import styled from 'styled-components'
import { Header } from '~/Theme'
import { DexsSearch } from '~/components/Search'
import { revalidate } from '~/api'
import { getChainsPageData } from '~/api/categories/protocols'
import { BreakpointPanel, BreakpointPanels, ChartAndValuesWrapper, Panel, PanelHiddenMobile } from '~/components'
import dynamic from 'next/dynamic'
import { formattedNum } from '~/utils'
import { useInView } from 'react-intersection-observer'
import { VolumeSummaryDex } from '~/api/categories/dexs/types'
import { RowLinksWithDropdown, RowLinksWrapper } from '~/components/Filters'
import { formatVolumeHistoryToChartDataByProtocol } from '~/utils/dexs'
import { formatChain } from '~/api/categories/dexs/utils'
import type { IStackedBarChartProps } from '~/components/ECharts/BarChart/Stacked'
import { DexsTable } from '~/components/VirtualTable'

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

const ChartsWrapper = styled.section`
	display: flex;
	flex-direction: column;
	gap: 12px;
	width: 100%;
	padding: 0;
	align-items: center;
	z-index: 1;

	& > * {
		width: 100%;
		margin: 0 !important;
	}

	@media (min-width: 80rem) {
		flex-direction: row;
	}
`

const ChartWrapper = styled.section`
	grid-column: span 2;
	min-height: 360px;
	display: flex;
	flex-direction: column;

	@media (min-width: 90rem) {
		grid-column: span 1;

		:last-child:nth-child(2n - 1) {
			grid-column: span 2;
		}
	}
`

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
	tvlData,
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

	const dexWithSubrows = React.useMemo(() => {
		return dexs.map((dex) => {
			return {
				...dex,
				volumetvl: dex.totalVolume24h / tvlData[dex.name],
				dominance: (100 * dex.totalVolume24h) / totalVolume,
				chains: dex.chains.map(formatChain),
				subRows: dex.protocolVersions
					? Object.entries(dex.protocolVersions)
							.map(([versionName, summary]) => ({
								...dex,
								name: `${dex.name} - ${versionName.toUpperCase()}`,
								...summary
							}))
							.sort((first, second) => 0 - (first.totalVolume24h > second.totalVolume24h ? 1 : -1))
					: null
			}
		})
	}, [dexs, tvlData, totalVolume])

	const chartData = React.useMemo(() => {
		if (enableBreakdownChart) {
			return formatVolumeHistoryToChartDataByProtocol(
				totalDataChartBreakdown.map(([date, value]) => ({
					dailyVolume: Object.entries(value).reduce((acc, [dex, volume]) => {
						acc[dex] = { [dex]: volume }
						return acc
					}, {}),
					timestamp: +date
				})),
				chain,
				chain.toLocaleLowerCase()
			)
		} else return totalDataChart.map(([date, value]) => [new Date(+date * 1000), value])
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
					<ChartsWrapper>
						<Chart>
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
						</Chart>
					</ChartsWrapper>
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
				<DexsTable data={dexWithSubrows} />
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

export const Chart = ({ children }) => {
	const { ref, inView } = useInView({
		triggerOnce: true
	})

	return <ChartWrapper ref={ref}>{inView && children}</ChartWrapper>
}
