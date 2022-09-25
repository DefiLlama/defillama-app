import * as React from 'react'
import styled from 'styled-components'
import { DownloadIcon } from '~/components'
import { download } from '~/utils'
import { getLiquidationsCsvData } from '~/utils/liquidations'

const DownloadButtonContainer = styled.button`
	display: none;
	padding: 4px 6px;
	border-radius: 6px;
	background: ${({ theme }) => theme.bg3};
	bottom: 8px;
	right: 8px;
	align-items: center;
	height: 28px;

	@media (min-width: 80rem) {
		display: flex;
	}
`
export const DownloadButton = ({ symbol }: { symbol: string }) => {
	return (
		<DownloadButtonContainer
			onClick={async () => {
				const csvString = await getLiquidationsCsvData(symbol)
				download(`${symbol}-all-positions.csv`, csvString)
			}}
		>
			<DownloadIcon />
			<span>&nbsp;&nbsp;Download all positions</span>
		</DownloadButtonContainer>
	)
}

const DownloadButtonSmolContainer = styled.button`
	padding: 4px 6px;
	border-radius: 6px;
	background: ${({ theme }) => theme.bg3};
	position: absolute;
	bottom: 8px;
	right: 8px;
	display: flex;
	align-items: center;
	height: 28px;

	@media (min-width: 80rem) {
		display: none;
	}
`

export const DownloadButtonSmol = ({ symbol }: { symbol: string }) => {
	return (
		<DownloadButtonSmolContainer
			onClick={async () => {
				const csvString = await getLiquidationsCsvData(symbol)
				download(`${symbol}-all-positions.csv`, csvString)
			}}
		>
			<DownloadIcon />
			<span>&nbsp;&nbsp;.csv</span>
		</DownloadButtonSmolContainer>
	)
}
