import styled from 'styled-components'
import { TabList as AriakitTabList, Tab as AriaktiTab } from 'ariakit'
import { transparentize } from 'polished'

export const TabLayout = styled.span`
	display: flex;
	flex-direction: column;
	background: ${({ theme }) => theme.bg7};
	border: ${({ theme }) => '1px solid ' + theme.divider};
	border-radius: 12px;
	box-shadow: ${({ theme }) => theme.shadowSm};
`

export const GridContent = styled.div`
	display: grid;
	grid-template-columns: 1fr 1fr;
	padding: 24px;

	@media screen and (min-width: 80rem) {
		grid-template-rows: repeat(2, auto);
	}
`

export const TabList = styled(AriakitTabList)`
	display: flex;
	flex-wrap: nowrap;
	overflow-x: auto;
	border-bottom: ${({ theme }) => '1px solid ' + theme.divider};
`

export const Tab = styled(AriaktiTab)`
	padding: 8px 24px;
	white-space: nowrap;
	border-bottom: 1px solid transparent;

	&[aria-selected='true'] {
		border-bottom: ${({ color }) => '1px solid ' + color};
	}

	& + & {
		border-left: ${({ theme }) => '1px solid ' + theme.divider};
	}

	:first-child {
		border-top-left-radius: 12px;
	}

	:hover,
	:focus-visible {
		background-color: ${({ color }) => transparentize(0.9, color)};
	}
`
