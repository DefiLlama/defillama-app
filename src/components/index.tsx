import * as React from 'react'
import styled from 'styled-components'
import { Text, Box } from 'rebass'
import { CheckboxCheck } from 'ariakit'
import { DownloadCloud } from 'react-feather'
import Table from '~/components/Table'
import { BasicLink } from '~/components/Link'

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

export const PanelThicc = styled(Panel)`
	display: none;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	text-align: center;

	@media (min-width: 80rem) {
		display: flex;
	}
`

export const PanelSmol = styled(Panel)`
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	text-align: center;

	@media (min-width: 80rem) {
		display: none;
	}
`

export const StyledAnchor = styled.a`
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 0.2rem;
	margin-left: 0.2rem;
	:hover {
		text-decoration: underline;
	}

	@media (min-width: 80rem) {
		margin-right: 0.2rem;
	}
`

export const ChartAndValuesWrapper = styled.div`
	flex: 1;
	isolation: isolate;
	z-index: 1;
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

const Divider = styled(Box)`
	height: 1px;
	background-color: ${({ theme }) => theme.divider};
`

export const IconWrapper = styled.div`
	position: absolute;
	right: 0;
	border-radius: 3px;
	height: 16px;
	width: 16px;
	padding: 0px;
	bottom: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	color: ${({ theme }) => theme.text1};

	:hover {
		cursor: pointer;
		opacity: 0.7;
	}
`

const Hint = ({ children, ...rest }) => (
	<Text fontSize={16} weight={500} {...rest}>
		{children}
	</Text>
)

interface IHover {
	fade?: boolean
}

export const Hover = styled.div<IHover>`
	:hover {
		cursor: pointer;
		opacity: ${({ fade }) => fade && '0.7'};
	}
`

export const StyledIcon = styled.div`
	color: ${({ theme }) => theme.text1};
`

interface IEmptyCard {
	height?: number
}

const EmptyCard = styled.div<IEmptyCard>`
	display: flex;
	align-items: center;
	justify-content: center;
	height: 200px;
	border-radius: 20px;
	color: ${({ theme }) => theme.text1};
	height: ${({ height }) => height && height};
`

export const SideBar = styled.span`
	display: grid;
	grid-gap: 24px;
	position: sticky;
	top: 4rem;
`

export const SubNav = styled.ul`
	list-style: none;
	display: flex;
	flex-direction: row;
	justify-content: flex-start;
	align-items: flex-start;
	padding: 0;
	margin-bottom: 2rem;
`

interface ISubNavEl {
	isActive: boolean
}

export const SubNavEl = styled.li<ISubNavEl>`
	list-style: none;
	display: flex;
	padding-bottom: 0.5rem;
	margin-right: 1rem;
	font-weight: ${({ isActive }) => (isActive ? 600 : 500)};
	border-bottom: 1px solid rgba(0, 0, 0, 0);

	:hover {
		cursor: pointer;
		border-bottom: 1px solid ${({ theme }) => theme.bg3};
	}
`

export const FixedMenu = styled.div`
	z-index: 99;
	width: 100%;
	padding: 1rem;
	margin-bottom: 2rem;
	max-width: 100vw;

	@media screen and (max-width: 800px) {
		margin-bottom: 0;
	}
`

export const ProtocolsTable = styled(Table)`
	tr > *:not(:first-child) {
		& > * {
			width: 100px;
			font-weight: 400;
		}
	}

	// PROTOCOL NAME
	tr > *:nth-child(1) {
		#table-p-logo {
			display: none;
		}

		#table-p-name {
			width: 80px;
		}

		#table-p-symbol {
			display: none;
		}
	}

	// Category
	tr > *:nth-child(2) {
		display: none;
	}

	// CHAINS
	tr > *:nth-child(3) {
		display: none;

		& > * {
			width: 200px;
		}
	}

	// 1D CHANGE
	tr > *:nth-child(4) {
		display: none;
	}

	// 7D CHANGE
	tr > *:nth-child(5) {
		display: none;
	}

	// 1M CHANGE
	tr > *:nth-child(6) {
		display: none;
	}

	// TVL
	tr > *:nth-child(7) {
		padding-right: 20px;
	}

	// MCAPTVL
	tr > *:nth-child(8) {
		display: none;
	}

	@media screen and (min-width: 360px) {
		// PROTOCOL NAME
		tr > *:nth-child(1) {
			#table-p-name {
				width: 120px;
			}
		}
	}

	@media screen and (min-width: ${({ theme }) => theme.bpSm}) {
		// 7D CHANGE
		tr > *:nth-child(5) {
			display: revert;
		}
	}

	@media screen and (min-width: 640px) {
		// PROTOCOL NAME
		tr > *:nth-child(1) {
			#table-p-logo {
				display: flex;
			}
		}
	}

	@media screen and (min-width: 720px) {
		// 1M CHANGE
		tr > *:nth-child(6) {
			display: revert;
		}
	}

	@media screen and (min-width: ${({ theme }) => theme.bpMed}) {
		// PROTOCOL NAME
		tr > *:nth-child(1) {
			#table-p-name {
				width: 140px;
			}

			#table-p-symbol {
				display: revert;
			}
		}
	}

	@media screen and (min-width: 900px) {
		// TVL
		tr > *:nth-child(7) {
			padding-right: 0px;
		}

		// MCAPTVL
		tr > *:nth-child(8) {
			display: revert;
		}
	}

	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		// 1D CHANGE
		tr > *:nth-child(4) {
			display: none !important;
		}

		// TVL
		tr > *:nth-child(7) {
			padding-right: 20px;
		}

		// MCAPTVL
		tr > *:nth-child(8) {
			display: none !important;
		}
	}

	@media screen and (min-width: 1200px) {
		// Category
		tr > *:nth-child(2) {
			display: revert !important;

			& > * {
				width: 140px;
			}
		}

		// 1M CHANGE
		tr > *:nth-child(6) {
			display: revert !important;
		}
	}

	@media screen and (min-width: 1300px) {
		// 1D CHANGE
		tr > *:nth-child(4) {
			display: revert !important;
		}

		// TVL
		tr > *:nth-child(7) {
			padding-right: 0px;
		}

		// MCAPTVL
		tr > *:nth-child(8) {
			display: revert !important;
		}
	}

	@media screen and (min-width: 1540px) {
		tr > *:nth-child(1) {
			& > * {
				width: 220px;
			}
		}

		// CHAINS
		tr > *:nth-child(3) {
			display: revert;
		}
	}

	@media screen and (min-width: 1580px) {
		tr > *:nth-child(1) {
			& > * {
				width: 280px;
			}
		}
	}
	@media screen and (min-width: 1680px) {
		tr > *:nth-child(1) {
			#table-p-name {
				width: 180px;
			}
		}
	}
`

export const ApplyFilters = styled.button`
	padding: 12px;
	margin: 12px 0 0;
	background: #2172e5;
	color: #fff;
	font-weight: 400;
	border-radius: 8px;

	:hover,
	:focus-visible {
		background: #4190ff;
	}

	@media screen and (min-width: 640px) {
		border-radius: 0 0 8px 8px;
	}
`

export const Checkbox = styled(CheckboxCheck)`
	display: flex;
	height: 13px;
	width: 13px;
	align-items: center;
	justify-content: center;
	margin-left: auto;
	border-radius: 2px;
	border: 1px solid #28a2b5;
	box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.05);
	color: ${({ theme }) => theme.text1};
`

export const DownloadButton = styled(BasicLink)`
	padding: 4px 6px;
	border-radius: 6px;
	background: ${({ theme }) => theme.bg3};
	position: absolute;
	bottom: 8px;
	right: 8px;
	display: flex;
	align-items: center;
`

export const DownloadIcon = styled(DownloadCloud)`
	color: inherit;
	width: 16px;
	height: 16px;
`

export const Checkbox2 = styled.input`
	position: relative;
	top: 1px;
	padding: 0;
	-webkit-appearance: none;
	appearance: none;
	background-color: transparent;
	width: 1em;
	height: 1em;
	border: ${({ theme }) => '1px solid ' + theme.text4};
	border-radius: 0.15em;
	transform: translateY(-0.075em);
	display: grid;
	place-content: center;

	::before {
		content: '';
		width: 0.5em;
		height: 0.5em;
		transform: scale(0);
		transition: 120ms transform ease-in-out;
		box-shadow: ${({ theme }) => 'inset 1em 1em ' + theme.text1};
		transform-origin: bottom left;
		clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
	}

	:checked::before {
		transform: scale(1);
	}

	:focus-visible {
		outline-offset: max(2px, 0.15em);
	}

	:hover {
		cursor: pointer;
	}
`

export { Hint, Divider, EmptyCard }
