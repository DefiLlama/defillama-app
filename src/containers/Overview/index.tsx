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
import { IMainBarChartProps, MainBarChart } from './common'

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
					category: chain === 'All' ? 'Home' : upperCaseFirst(props.type),
					name: chain === 'All' ? upperCaseFirst(props.type) : chain
				}}
				onToggleClick={
					charts.totalDataChartBreakdown && charts.totalDataChartBreakdown.length > 0
						? (enabled) => setEnableBreakdownChart(enabled)
						: undefined
				}
			/>

			{getChartByType(props.type, {
				type: props.type,
				total24h: props.total24h,
				change_1d: props.change_1d,
				change_1m: props.change_1m,
				chartData: chartData
			})}

			<RowLinksWrapper>
				<RowLinksWithDropdown
					links={['All', ...props.allChains].map((chain) => ({
						label: formatChain(chain),
						to: chain === 'All' ? `/${props.type}` : `/${props.type}/chain/${chain.toLowerCase()}`
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

const getChartByType = (type: string, props?: IMainBarChartProps) => {
	switch (type) {
		case 'fees':
			return <></>
		default:
			return MainBarChart(props)
	}
}

interface ITitleProps {
	type: string
	chain: string
}
const getTitleByType: React.FC<ITitleProps> = (props) => {
	let title = upperCaseFirst(props.type)
	if (props.type === 'volumes') title = 'Volume'
	if (props.type === 'fees') title = 'Fees and revenue'
	return (
		<HeaderWrapper>
			<span>
				{title} in {props.chain === 'All' ? 'all protocols' : props.chain}
			</span>
		</HeaderWrapper>
	)
}
