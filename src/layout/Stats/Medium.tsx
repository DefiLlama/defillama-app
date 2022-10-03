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

export const Stat = styled.p`
	font-weight: 700;
	font-size: 2rem;
	display: flex;
	flex-direction: column;
	gap: 8px;

	& > *:first-child {
		font-weight: 400;
		font-size: 0.75rem;
		text-align: left;
		color: ${({ theme }) => (theme.mode === 'dark' ? '#cccccc' : '#545757')};
	}
`
