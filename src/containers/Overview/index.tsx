import * as React from 'react'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { Header } from '~/Theme'
import { BreakpointPanel, BreakpointPanels, ChartAndValuesWrapper, Panel, PanelHiddenMobile } from '~/components'
import { OverviewTable } from '~/components/Table'
import { RowLinksWithDropdown, RowLinksWrapper } from '~/components/Filters'
import { AdaptorsSearch } from '~/components/Search'
import { formattedNum } from '~/utils'
import { formatVolumeHistoryToChartDataByProtocol } from '~/utils/dexs'
import { revalidate } from '~/api'
import { getChainPageData } from '~/api/categories/adaptors'
import { formatChain } from '~/api/categories/dexs/utils'
import type { VolumeSummaryDex } from '~/api/categories/dexs/types'
import type { IStackedBarChartProps } from '~/components/ECharts/BarChart/Stacked'
import { AsyncReturnType, upperCaseFirst } from './utils'
import { ProtocolAdaptorSummary } from '~/api/categories/adaptors/types'
import { useFetchCharts } from '~/api/categories/adaptors/client'

/* export async function getStaticProps() {
	const data = await getChainsPageData('All')
	return {
		...data,
		revalidate: revalidate()
	}
} */

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

export interface IOverviewContainerProps extends AsyncReturnType<typeof getChainPageData> {
	type: string
}

export default function OverviewContainer(props: IOverviewContainerProps) {
	const chain = props.chain ?? 'All'
	const [enableBreakdownChart, setEnableBreakdownChart] = React.useState(false)
	const [charts, setCharts] = React.useState<Pick<IOverviewContainerProps, 'totalDataChartBreakdown'>>({
		totalDataChartBreakdown: props.totalDataChartBreakdown
	})
	const { data, error, loading } = useFetchCharts(props.type, chain === 'All' ? undefined : chain)

	React.useEffect(() => {
		if (data && !error && !loading)
			setCharts({
				totalDataChartBreakdown: data.totalDataChartBreakdown
			})
	}, [data, loading, error])

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
				chain.toLowerCase()
			)
		} else
			return props.totalDataChart.map<IStackedBarChartProps['chartData'][number]>(({ name, data }) => ({
				name: name,
				data: data.map(([tiemstamp, value]) => [new Date(+tiemstamp * 1000), value])
			}))
	}, [charts, enableBreakdownChart, chain, props.totalDataChart])

	return (
		<>
			<AdaptorsSearch
				type={props.type}
				step={{
					category: upperCaseFirst(props.type),
					name: 'Overview'
				}}
				onToggleClick={
					charts.totalDataChartBreakdown && charts.totalDataChartBreakdown.length > 0
						? (enabled) => setEnableBreakdownChart(enabled)
						: undefined
				}
			/>

			<HeaderWrapper>
				<span>
					{props.type === 'volumes' ? 'Volume' : upperCaseFirst(props.type)} in{' '}
					{chain === 'All' ? 'all protocols' : chain}
				</span>
			</HeaderWrapper>

			<ChartAndValuesWrapper>
				<BreakpointPanels>
					<BreakpointPanel>
						<h1>Total {props.type === 'volumes' ? 'volume' : props.type} (24h)</h1>
						<p style={{ '--tile-text-color': '#4f8fea' } as React.CSSProperties}>
							{formattedNum(props.total24h, true)}
						</p>
					</BreakpointPanel>
					<PanelHiddenMobile>
						<h2>Change (24h)</h2>
						<p style={{ '--tile-text-color': '#fd3c99' } as React.CSSProperties}> {props.change_1d || 0}%</p>
					</PanelHiddenMobile>
					<PanelHiddenMobile>
						<h2>Change (30d)</h2>
						<p style={{ '--tile-text-color': '#46acb7' } as React.CSSProperties}> {props.change_1m || 0}%</p>
					</PanelHiddenMobile>
				</BreakpointPanels>
				<BreakpointPanel id="chartWrapper">
					{chartData && chartData.length > 0 && <StackedBarChart chartData={chartData} />}
				</BreakpointPanel>
			</ChartAndValuesWrapper>

			<RowLinksWrapper>
				<RowLinksWithDropdown
					links={['All', ...props.allChains].map((chain) => ({
						label: formatChain(chain),
						to: chain === 'All' ? `/overview/${props.type}` : `/overview/${props.type}/chain/${chain.toLowerCase()}`
					}))}
					activeLink={chain}
					alternativeOthersText="More chains"
				/>
			</RowLinksWrapper>

			{props.protocols && props.protocols.length > 0 ? (
				<OverviewTable data={props.protocols} type={props.type} />
			) : (
				<Panel>
					<p style={{ textAlign: 'center' }}>
						{`Looks like we couldn't find any protocol👀. 🦙🦙🦙 are working on it.`}
					</p>
				</Panel>
			)}
		</>
	)
}
