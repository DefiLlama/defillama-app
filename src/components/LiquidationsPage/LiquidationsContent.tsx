/* eslint-disable no-unused-vars*/
import React, { useState } from 'react'
import { ChartData, getLiquidationsCsvData, getReadableValue } from '~/utils/liquidations'
import { BreakpointPanel, BreakpointPanels, ChartAndValuesWrapper, DownloadIcon, PanelHiddenMobile } from '~/components'
import { LiquidationsChart } from './LiquidationsChart'
import styled from 'styled-components'
import { download } from '~/utils'
import { useStackBy } from './utils'

export const DownloadButton = styled.button`
	padding: 4px 6px;
	border-radius: 6px;
	background: ${({ theme }) => theme.bg3};
	position: absolute;
	bottom: 8px;
	right: 8px;
	display: flex;
	align-items: center;
`

const TotalLiquidable = (props: ChartData & { selectedSeries: string[] }) => {
	const stackBy = useStackBy()

	let totalLiquidable: string
	if (props.selectedSeries.length === 1 && props.selectedSeries[0] === 'all') {
		totalLiquidable = getReadableValue(props.totalLiquidable)
	} else {
		totalLiquidable = getReadableValue(
			(props.selectedSeries.length === 0 ? props.availability[stackBy] : props.selectedSeries).reduce(
				(acc, cur) => acc + props.totalLiquidables[stackBy][cur],
				0
			)
		)
	}

	return (
		<>
			<h1>Total Liquidable (USD)</h1>
			<p style={{ '--tile-text-color': '#4f8fea' } as React.CSSProperties}>${totalLiquidable}</p>
			<DownloadButton
				onClick={async () => {
					const csvString = await getLiquidationsCsvData(props.symbol)
					download(`${props.symbol}-all-positions.csv`, csvString)
				}}
			>
				<DownloadIcon />
				<span>&nbsp;&nbsp;.csv</span>
			</DownloadButton>
		</>
	)
}

export const LiquidationsContent = (
	props: ChartData & { selectedSeries: string[]; setSelectedSeries: React.Dispatch<React.SetStateAction<string[]>> }
) => {
	return (
		<ChartAndValuesWrapper>
			<BreakpointPanels>
				<BreakpointPanel>
					<TotalLiquidable {...props} />
				</BreakpointPanel>
				<PanelHiddenMobile>
					<h2>Change (24h)</h2>
					<p style={{ '--tile-text-color': '#fd3c99' } as React.CSSProperties}>
						{(props.historicalChange[24] * 100).toFixed(1) || 0}%
					</p>
				</PanelHiddenMobile>
				<PanelHiddenMobile>
					<h2>Within -20% of current price</h2>
					<p style={{ '--tile-text-color': '#46acb7' } as React.CSSProperties}>
						${getReadableValue(props.dangerousPositionsAmount)}
					</p>
				</PanelHiddenMobile>
			</BreakpointPanels>
			<BreakpointPanel>
				<LiquidationsChart chartData={props} uid={props.symbol} setSelectedSeries={props.setSelectedSeries} />
			</BreakpointPanel>
		</ChartAndValuesWrapper>
	)
}
