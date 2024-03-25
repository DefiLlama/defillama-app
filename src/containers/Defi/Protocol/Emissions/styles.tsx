import styled from 'styled-components'

export const ChartWrapper = styled.div`
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 20px;
`

export const PieChartContainer = styled.div`
	width: 500px;
`

export const RowWrapper = styled.div`
	display: flex;
	flex-direction: row;
	gap: 20px;

	@media (max-width: 1300px) {
		flex-direction: column;
	}
`
export const BoxContainer = styled.div`
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	gap: 20px;
	flex: 1 1 0px;

	@media (max-width: 1300px) {
		flex-direction: column;
	}
`
export const Box = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	background-color: ${({ theme }) => theme.bg7};
	border: 1px solid ${({ theme }) => theme.text5};
	border-radius: 8px;
	padding: 16px;
	width: fit-content;
	width: 100%;

	@media (max-width: 1300px) {
		width: 100%;
	}
`

export const Body = styled.div`
	display: flex;
	flex-direction: column;
	gap: 8px;
	width: 100%;
	span {
		font-size: 16px;
	}
`

export const Header = styled.div`
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	margin-bottom: 16px;
	font-size: 20px;
`
export const Row = styled.div`
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	flex-wrap: wrap;
`

export const Separator = styled.div`
	height: 1px;
	background-color: ${(props) => props.theme.text4};
	width: 100%;
	margin-bottom: 8px;
	margin-top: 4px;
`

export const Value = styled.span`
	font-size: 16px;
	color: ${(props) => props.theme.text3};
`
