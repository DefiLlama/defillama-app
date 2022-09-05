import styled from 'styled-components'
import { RowLinksWrapper } from '~/components/Filters'

export const Wrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 24px;
	padding: 16px;
	background: ${({ theme }) => (theme.mode === 'dark' ? '#0a0a0a' : '#fbfbfb')};
	border-radius: 12px;
	box-shadow: ${({ theme }) => theme.shadowSm};
	isolation: isolate;
	z-index: 1;
`

export const StatsSection = styled.div`
	display: grid;
	grid-template-columns: 1fr;
	position: relative;
	z-index: 1;

	@media screen and (min-width: 80rem) {
		grid-template-columns: auto 1fr;
	}
`

export const StatsWrapper = styled.div`
	display: flex;
	flex-direction: column;
	color: ${({ theme }) => theme.text1};
	grid-column: span 1;
	padding: 0 16px;

	@media screen and (min-width: 80rem) {
		min-width: 380px;
		padding: 0 24px 0 36px;
	}
`

export const Stat = styled.p`
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding-bottom: 28px;

	& + & {
		padding-top: 28px;
		border-top: 1px solid rgba(129, 133, 133, 0.2);
	}

	& > *:first-child {
		font-family: var(--font-inter);
		font-weight: 600;
		font-size: 0.875rem;
		text-align: left;
		color: ${({ theme }) => (theme.mode === 'dark' ? '#a9a9a9' : '#737373')};
		margin: -2px 0;
	}

	& > *:nth-child(2) {
		font-family: var(--font-jetbrains);
		font-weight: 800;
		font-size: 36px;
		margin: -10px 0;
	}

	@media screen and (min-width: 80rem) {
		padding-bottom: 32px;

		& + & {
			padding-top: 32px;
		}
	}
`

export const LinksWrapper = styled(RowLinksWrapper)`
	grid-column: 1 / -1;
	margin: -4px 0 0;

	@media screen and (min-width: 80rem) {
		margin: -4px 0 32px;
	}
`

export const ChartWrapper = styled.div`
	grid-column: span 2;
	min-height: 360px;
	display: flex;
	flex-direction: column;

	@media screen and (min-width: 80rem) {
		grid-column: span 1;
		padding-left: 16px;
	}
`

export const TableHeader = styled.h1`
	font-weight: 700;
	font-size: 1.25rem;
	margin: 0 16px;
`

export const Fallback = styled.p`
	margin: 0 16px;
	padding: 1.25rem;
	text-align: center;
	background: ${({ theme }) => (theme.mode === 'dark' ? '#000' : '#fff')};
	border-radius: 16px;
`
