/* eslint-disable no-unused-vars*/
import React, { useContext, useMemo } from 'react'
import { ChartData, getReadableValue } from '~/utils/liquidations'
import { BreakpointPanel, BreakpointPanels, ChartAndValuesWrapper, PanelHiddenMobile } from '~/components'
import { LiquidationsChart } from './LiquidationsChart'
import { TotalLiquidable } from './TotalLiquidable'
import { LiquidableChanges24H } from './LiquidableChanges24H'
import { LiquidationsContext } from '~/pages/liquidations/[symbol]'
import { useStackBy } from './utils'

export const LiquidationsContent = (props: { data: ChartData; prevData: ChartData }) => {
	const { data, prevData } = props
	return (
		<ChartAndValuesWrapper>
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
		</ChartAndValuesWrapper>
	)
}

const DangerousPositionsAmount = (props: { data: ChartData }) => {
	const { data } = props
	const stackBy = useStackBy()
	const { selectedSeries } = useContext(LiquidationsContext)
	const dangerousPositionsAmount = useMemo(
		() => getDangerousPositionsAmount(data, stackBy, selectedSeries),
		[data, stackBy, selectedSeries]
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
		const selectedChains = Object.keys(selectedSeries).filter((chain) => selectedSeries[chain])
		selectedChains.forEach((chain) => {
			console.log(chain)
			const binSize = data.chartDataBins.byChain[chain].binSize
			dangerousPositionsAmount += Object.entries(data.chartDataBins.byChain[chain].bins)
				.filter(([bin]) => binSize * parseInt(bin) >= priceThreshold)
				.reduce((acc, [, value]) => acc + value, 0)
		})
	} else {
		const selectedProtocols = Object.keys(selectedSeries).filter((protocol) => selectedSeries[protocol])
		selectedProtocols.forEach((protocol) => {
			console.log(protocol)
			const binSize = data.chartDataBins.byProtocol[protocol].binSize
			dangerousPositionsAmount += Object.entries(data.chartDataBins.byProtocol[protocol].bins)
				.filter(([bin]) => binSize * parseInt(bin) >= priceThreshold)
				.reduce((acc, [, value]) => acc + value, 0)
		})
	}
	return dangerousPositionsAmount
}
