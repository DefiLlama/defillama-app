import React, { useContext } from 'react'
import { ChartData, getLiquidationsCsvData, getReadableValue, PROTOCOL_NAMES_MAP_REVERSE } from '~/utils/liquidations'
import { DownloadIcon } from '~/components'
import styled from 'styled-components'
import { download } from '~/utils'
import { useStackBy } from './utils'
import { LiquidationsContext } from '~/pages/liquidations/[symbol]'

const DownloadButtonContainer = styled.button`
	padding: 4px 6px;
	border-radius: 6px;
	background: ${({ theme }) => theme.bg3};
	position: absolute;
	bottom: 8px;
	right: 8px;
	display: flex;
	align-items: center;
`
const DownloadButton = ({ symbol }: { symbol: string }) => {
	return (
		<DownloadButtonContainer
			onClick={async () => {
				const csvString = await getLiquidationsCsvData(symbol)
				download(`${symbol}-all-positions.csv`, csvString)
			}}
		>
			<DownloadIcon />
			<span>&nbsp;&nbsp;.csv</span>
		</DownloadButtonContainer>
	)
}

export const TotalLiquidable = (props: ChartData) => {
	const stackBy = useStackBy()
	const { selectedSeries } = useContext(LiquidationsContext)

	let totalLiquidable: string
	if (!selectedSeries) {
		totalLiquidable = getReadableValue(props.totalLiquidable)
	} else {
		const _totalLiquidable = Object.entries(selectedSeries)
			.filter((x) => x[1])
			.map((x) => x[0])
			.reduce((acc, cur) => {
				return acc + props.totalLiquidables[stackBy][PROTOCOL_NAMES_MAP_REVERSE[cur]]
			}, 0)
		totalLiquidable = getReadableValue(_totalLiquidable)
	}

	return (
		<>
			<h1>Total Liquidatable (USD)</h1>
			<p style={{ '--tile-text-color': '#4f8fea' } as React.CSSProperties}>${totalLiquidable}</p>
			<DownloadButton symbol={props.symbol} />
		</>
	)
}
