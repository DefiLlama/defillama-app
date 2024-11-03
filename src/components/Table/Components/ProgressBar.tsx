import React from 'react'
import styled from 'styled-components'
import { formattedNum } from '~/utils'

const ProgressBarContainer = styled.div`
	width: 100%;
	background-color: ${({ theme }) => theme.bg4};
	border-radius: 10px;
	box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
`

const Progress = styled.div<{ width?: number }>`
	width: ${(props) => props.width}%;
	background-color: #3255d7;
	height: 10px;
	border-radius: 10px;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: width 0.3s ease-in-out;
`

const Column = styled.div`
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 8px;
	width: 100%;
	padding: 0px 8px;
`
const Row = styled.div`
	display: flex;
	justify-content: space-between;
	width: 100%;
`

const LigthText = styled.div`
	color: ${({ theme }) => theme.text2};
`

export const ProgressBar = ({ percent, tokenPrice, symbol, name, maxSupply }) => {
	const tokenSymbol = tokenPrice?.[0]?.symbol?.toUpperCase() || symbol?.toUpperCase() || name
	return (
		<Column>
			<Row>
				<div style={{ color: '#3255d7' }}>{formattedNum(percent)}%</div>
				<LigthText>
					{formattedNum(maxSupply)} {tokenSymbol}
				</LigthText>
			</Row>
			<ProgressBarContainer>
				<Progress width={percent} />
			</ProgressBarContainer>
		</Column>
	)
}
