/* eslint-disable no-unused-vars*/
import React, { useContext, useMemo } from 'react'
import { ChartData, getReadableValue, PROTOCOL_NAMES_MAP_REVERSE } from '~/utils/liquidations'
import { BreakpointPanel, BreakpointPanels, ChartAndValuesWrapper, PanelHiddenMobile } from '~/components'
import { LiquidationsChart } from './LiquidationsChart'
import { TotalLiquidable } from './TotalLiquidable'
import { LiquidableChanges24H } from './LiquidableChanges24H'
import { LiquidationsContext } from '~/pages/liquidations/[symbol]'
import { useStackBy } from './utils'
import styled from 'styled-components'

export const LiquidationsContent = (props: { data: ChartData; prevData: ChartData }) => {
	const { data, prevData } = props
	return (
		<Wrapper>
			<BreakpointPanels>
				<BreakpointPanel>
					<TotalLiquidable {...data} />
				</BreakpointPanel>
				<PanelHiddenMobile>
					<LiquidableChanges24H data={data} prevData={prevData} />
				</PanelHiddenMobile>
				<PanelHiddenMobile>
					<DangerousPositionsAmount data={data} />
				</PanelHiddenMobile>
			</BreakpointPanels>
			<BreakpointPanel>
				<LiquidationsChart chartData={data} uid={data.symbol} />
			</BreakpointPanel>
		</Wrapper>
	)
}

const DangerousPositionsAmount = (props: { data: ChartData }) => {
	const stackBy = useStackBy()
	const { selectedSeries } = useContext(LiquidationsContext)
	const dangerousPositionsAmount = useMemo(
		() => getDangerousPositionsAmount(props.data, stackBy, selectedSeries),
		[props.data, stackBy, selectedSeries]
	)
	return (
		<>
			<h2>Within -20% of current price</h2>
			<p style={{ '--tile-text-color': '#46acb7' } as React.CSSProperties}>
				${getReadableValue(dangerousPositionsAmount)}
			</p>
		</>
	)
}

const getDangerousPositionsAmount = (
	data: ChartData,
	stackBy: 'chains' | 'protocols',
	selectedSeries: {
		[key: string]: boolean
	},
	threshold = -0.2
) => {
	const priceThreshold = data.currentPrice * (1 + threshold)
	let dangerousPositionsAmount = 0
	if (!selectedSeries) {
		dangerousPositionsAmount = data.dangerousPositionsAmount
	} else if (stackBy === 'chains') {
		Object.keys(selectedSeries)
			.filter((chain) => selectedSeries[chain])
			.forEach((chain) => {
				const _chain = PROTOCOL_NAMES_MAP_REVERSE[chain]
				const binSize = data.chartDataBins.chains[_chain]?.binSize ?? 0
				dangerousPositionsAmount += Object.entries(data.chartDataBins.chains[_chain]?.bins ?? {})
					.filter(([bin]) => binSize * parseInt(bin) >= priceThreshold)
					.reduce((acc, [, value]) => acc + value, 0)
			})
	} else {
		Object.keys(selectedSeries)
			.filter((protocol) => selectedSeries[protocol])
			.forEach((protocol) => {
				const _protocol = PROTOCOL_NAMES_MAP_REVERSE[protocol]
				const binSize = data.chartDataBins.protocols[_protocol]?.binSize ?? 0
				dangerousPositionsAmount += Object.entries(data.chartDataBins.protocols[_protocol]?.bins ?? {})
					.filter(([bin]) => binSize * parseInt(bin) >= priceThreshold)
					.reduce((acc, [, value]) => acc + value, 0)
			})
	}
	return dangerousPositionsAmount
}

const Wrapper = styled(ChartAndValuesWrapper)`
	z-index: 0;
	margin-top: -1rem;
`
