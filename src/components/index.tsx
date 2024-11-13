import styled from 'styled-components'
import { primaryColor } from '~/constants/colors'
import { transparentize } from 'polished'

export const Panel = styled.div`
	position: relative;
	background-color: ${({ theme }) => theme.advancedBG};
	padding: 1.25rem;
	display: flex;
	flex-direction: column;
	justify-content: flex-start;
	border-radius: 8px;
	border: 1px solid ${({ theme }) => theme.bg3};
	box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.05);
`

export const ChartAndValuesWrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 10px;
	position: relative;

	#chartWrapper {
		flex: 1;
		min-height: 381px;
	}

	@media screen and (min-width: 80rem) {
		flex-direction: row;
	}
`

export const BreakpointPanels = styled.div`
	display: flex;
	flex-direction: column;
	gap: 10px;
	flex: 1;

	@media screen and (min-width: 80rem) {
		max-width: 350px;
	}
`

export const BreakpointPanel = styled(Panel)`
	flex: 1;
	gap: 4px;
	padding: 18px 25px;
	justify-content: center;

	& > h1,
	& > h2 {
		min-width: 0;
		font-weight: 500;
		font-size: 1rem;
	}

	& > p {
		margin: 4px 0 -6px;
		font-weight: 600;
		font-size: 2rem;
		color: var(--tile-text-color);
	}
`

export const PanelHiddenMobile = styled(BreakpointPanel)`
	@media screen and (max-width: 50rem) {
		display: none;
	}
`

export const TabList = styled.div`
	display: flex;
	flex-wrap: nowrap;
	overflow-x: auto;
	border-bottom: ${({ theme }) => '1px solid ' + theme.divider};
`

export const Tab = styled.button`
	padding: 8px 24px;
	white-space: nowrap;
	border-bottom: 1px solid transparent;

	&[aria-selected='true'] {
		border-bottom: ${'1px solid ' + primaryColor};
	}

	& + & {
		border-left: ${({ theme }) => '1px solid ' + theme.divider};
	}

	:first-child {
		border-top-left-radius: 12px;
	}

	:hover,
	:focus-visible {
		background-color: ${transparentize(0.9, primaryColor)};
	}
`
