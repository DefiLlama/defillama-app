import styled from 'styled-components'

export const StatsSection = styled.div`
	display: grid;
	grid-template-columns: 1fr;

	border-radius: 12px;
	background: ${({ theme }) => theme.bg6};
	border: ${({ theme }) => '1px solid ' + theme.divider};
	box-shadow: ${({ theme }) => theme.shadowSm};
	position: relative;
	isolation: isolate;

	@media screen and (min-width: 80rem) {
		grid-template-columns: auto 1fr;
	}
`

export const StatWrapper = styled.div`
	position: relative;
	display: flex;
	gap: 20px;
	align-items: flex-end;
	justify-content: space-between;
	flex-wrap: wrap;
`
