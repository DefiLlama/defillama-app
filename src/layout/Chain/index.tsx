import styled from 'styled-components'
import { RowLinksWrapper } from '~/components/Filters'

export const Wrapper = styled.div`
	display: grid;
	grid-template-columns: 1fr;
	gap: 32px;
	border-radius: 12px;
	isolation: isolate;

	@media screen and (min-width: ${({ theme }) => theme.bpSm}) {
		padding: 16px;
		background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(7, 14, 15, 0.7)' : '#fbfbfb')};
		box-shadow: ${({ theme }) => theme.shadowSm};
	}

	@media screen and (min-width: 80rem) {
		grid-template-columns: auto 1fr;
		gap: 48px;
	}
`

export const LinksWrapper = styled(RowLinksWrapper)`
	grid-column: 1 / -1;
	margin-bottom: 0;

	@media screen and (max-width: ${({ theme }) => theme.bpSm}) {
		button:only-child {
			width: 100%;
		}
	}
`

export const ChartWrapper = styled.div`
	grid-column: 1 / -1;
	min-height: 360px;
	display: flex;
	flex-direction: column;

	@media screen and (min-width: 80rem) {
		grid-column: span 1;
	}
`

export const TableHeader = styled.h1`
	font-weight: 700;
	font-size: 1.25rem;
	margin: 0 0 -24px;
	grid-column: 1 / -1;

	@media screen and (min-width: 80rem) {
		margin: 0 16px -24px;
	}
`

export const Fallback = styled.p`
	padding: 1.25rem;
	text-align: center;
	background: ${({ theme }) => (theme.mode === 'dark' ? '#070E0F' : '#fff')};
	border-radius: 16px;
	grid-column: 1 / -1;

	@media screen and (min-width: 80rem) {
		margin: 0 16px;
	}
`
