import * as React from 'react'
import styled from 'styled-components'
import { download } from '~/utils'
import { getLiquidationsCsvData } from '~/utils/liquidations'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Icon } from '~/components/Icon'

export const DownloadButton = ({ symbol }: { symbol: string }) => {
	return (
		<CSVDownloadButton
			onClick={async () => {
				const csvString = await getLiquidationsCsvData(symbol)
				download(`${symbol}-all-positions.csv`, csvString)
			}}
		/>
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
			<Icon name="download-cloud" height={16} width={16} />
			<span>&nbsp;&nbsp;.csv</span>
		</DownloadButtonSmolContainer>
	)
}
