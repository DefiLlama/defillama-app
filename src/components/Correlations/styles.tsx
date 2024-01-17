import styled from 'styled-components'
import { Wrapper } from '../LiquidationsPage/TableSwitch'

export const Table = styled.table`
	max-width: 480px;
	table-layout: fixed;
	text-align: center;
	overflow: hidden;
`

export const Row = styled.tr`
	:hover {
		background-color: rgba(0, 153, 255, 0.5);
	}
`

export const Cell = styled.td<{ value?: number }>`
	width: 50px;
	height: 50px;
	position: relative;
	background-color: ${(props) =>
		Number(props.value) > 0 ? `rgba(53, 222, 59, ${props.value})` : `rgb(255,0,0, ${-props.value})`};
	:hover::after {
		content: '';
		position: absolute;
		background-color: rgba(0, 153, 255, 0.5);
		left: 0;
		top: -5000px;
		height: 10000px;
		width: 100%;
		z-index: -1;
	}
`

export const ButtonCell = styled.td`
	width: 50px;
	height: 50px;
	font-size: 24px;
	:hover {
		background-color: rgba(0, 153, 255, 0.5);
	}
	cursor: pointer;
`

export const HeaderCell = styled(Cell)`
	font-weight: bold;
`

export const ModalWrapper = styled.div<{ open: boolean }>`
	display: ${(props) => (props.open ? 'block' : 'none')};
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background-color: rgba(0, 0, 0, 0.5);
	z-index: 999;
	input {
		width: 100%;
		margin-right: auto;
		border-radius: 8px;
		padding: 8px;
		padding-left: 32px;
		background: ${({ theme }) => (theme.mode === 'dark' ? '#000' : '#fff')};

		font-size: 0.875rem;
		border: none;
	}
`

export const ModalContent = styled.div`
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	padding: 40px;
	background-color: ${({ theme }) => theme.background};
	box-shadow: 0 0 10px rgba(0, 0, 0, 0.3); /* Shadow */
	border-radius: 10px;
	min-height: 520px;
	overflow: scroll;
`

export const List = styled.div`
	padding: 8px;
`

export const CloseButton = styled.button`
	position: absolute;
	top: 10px;
	right: 10px;
	background: none;
	border: none;
	font-size: 20px;
	cursor: pointer;
`

export const Image = styled.img`
	display: inline-block;
	object-fit: cover;
	aspect-ratio: 1;
	background: ${({ theme }) => theme.bg3};
	border-radius: 50%;
	flex-shrink: 0;
`

export const SearchRow = styled.div`
	display: flex;
	border-bottom: 1px #999 solid;
	align-items: center;
	gap: 8px;
	margin-bottom: 8px;
	margin-top: 8px;
	padding: 4px;
	cursor: pointer;
`

export const Body = styled.div`
	display: flex;
	margin: 0 auto;

	@media screen and (max-width: ${({ theme: { bpSm } }) => bpSm}) {
		flex-direction: column;
	}
`

export const SelectedBody = styled.div`
	max-height: 480px;
	overflow: scroll;
	margin-right: 32px;
	margin-top: 12px;

	::-webkit-scrollbar {
		display: none;
	}

	::-webkit-scrollbar-thumb {
		background-color: var(--transparent);
		border: 0px solid var(--transparent);
	}

	::-webkit-scrollbar-track {
		background: transparent;
		width: 0px;
		height: 0px;
	}
	scrollbar-width: none;
`

export const SearchBody = styled.div`
	::-webkit-scrollbar {
		display: none;
	}

	::-webkit-scrollbar-thumb {
		background-color: var(--transparent);
		border: 0px solid var(--transparent);
	}

	::-webkit-scrollbar-track {
		background: transparent;
		width: 0px;
		height: 0px;
	}
	scrollbar-width: none;
`

export const Add = styled.div`
	display: flex;
	justify-content: center;
	cursor: pointer;
	font-size: 24px;
`

export const ToggleWrapper = styled(Wrapper)`
	@media screen and (max-width: ${({ theme: { bpSm } }) => bpSm}) {
		display: flex;
		position: relative;
	}
`

export const Description = styled.div`
	display: flex;
	text-align: center;
	margin: 0 auto;
	font-size: 14px;
	color: ${({ theme }) => theme.text2};
	width: 500px;
`
