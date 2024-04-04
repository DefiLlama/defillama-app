import styled from 'styled-components'
import { StatsSection } from '~/layout/Stats/Medium'

export const Card = styled(StatsSection)`
	display: flex;
	flex-direction: column;
	justify-content: space-between;
`

export const Grid = styled.div`
	display: grid;
	grid-template-columns: 1fr 1fr;
	grow: 1;
	gap: 10px;

	@media screen and (max-width: 50rem) {
		grid-template-columns: 1fr;
	}
	@media screen and (min-width: 95em) {
		grid-template-columns: 1fr 1fr 1fr;
	}
`

export const DataWrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 10px;
	position: relative;
	min-height: 500px;

	#chartWrapper {
		flex: 1;
	}

	@media screen and (min-width: 105rem) {
		flex-direction: row;
	}
`

export const ControlsWrapper = styled.div`
	width: fit-content;
	display: flex;
	gap: 10px;
	text-align: center;
	vertical-align: middle;
	align-items: center;
`

export const ToggleWrapper = styled.span`
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
	margin-left: auto;
`
