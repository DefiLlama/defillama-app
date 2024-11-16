import styled from 'styled-components'
import { primaryColor } from '~/constants/colors'
import { transparentize } from 'polished'

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
