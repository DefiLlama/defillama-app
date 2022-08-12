import styled from 'styled-components'
import { ButtonLight } from '~/components/ButtonStyled'

export const StatsSection = styled.section`
	display: grid;
	grid-template-columns: 1fr;
	border-radius: 12px;
	background: ${({ theme }) => theme.bg6};
	border: ${({ theme }) => '1px solid ' + theme.divider};
	box-shadow: ${({ theme }) => theme.shadowSm};
	position: relative;
	isolation: isolate;

	@media (min-width: 80rem) {
		grid-template-columns: auto 1fr;
	}
`

export const StatWrapper = styled.section`
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
		color: ${({ theme }) => (theme.mode === 'dark' ? '#969b9b' : '#545757')};
	}
`

export const ProtocolDetails = styled.div`
	display: flex;
	flex-direction: column;
	gap: 36px;
	padding: 24px;
	padding-bottom: calc(24px + 0.4375rem);
	color: ${({ theme }) => theme.text1};
	background: ${({ theme }) => theme.bg7};
	grid-column: span 1;
	border-radius: 12px 12px 0 0;

	@media (min-width: 80rem) {
		min-width: 380px;
		border-radius: 0 0 0 12px;
	}
`

export const PoolDetails = styled(ProtocolDetails)`
	border-top-left-radius: 12px;

	@media (min-width: 80rem) {
		max-width: 380px;
	}
`

export const ProtocolName = styled.h1`
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 1.25rem;
`

export const Symbol = styled.span`
	font-weight: 400;
`

export const SectionHeader = styled.h2`
	font-weight: 700;
	font-size: 1.25rem;
	margin: 0 0 -24px;
	border-left: 1px solid transparent;
`

export const InfoWrapper = styled.section`
	padding: 24px;
	background: ${({ theme }) => theme.bg7};
	border: ${({ theme }) => '1px solid ' + theme.divider};
	border-radius: 12px;
	display: grid;
	grid-template-columns: 1fr 1fr;
	grid-template-rows: repeat(3, auto);
	box-shadow: ${({ theme }) => theme.shadowSm};

	@media (min-width: 80rem) {
		grid-template-rows: repeat(2, auto);
	}
`

export const Section = styled.section`
	grid-column: 1 / -1;
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 24px 0;
	border-bottom: 1px solid transparent;

	h3 {
		font-weight: 600;
		font-size: 1.125rem;
	}

	&:not(:first-of-type) {
		border-top: ${({ theme }) => '1px solid ' + theme.text5};
	}

	&:first-of-type {
		padding-top: 0;
	}

	&:last-of-type {
		padding-bottom: 0;
		border-bottom: none;
	}

	p {
		line-height: 1.5rem;
	}

	@media (min-width: 80rem) {
		h3:not(:first-of-type) {
			margin-top: 24px;
		}

		&:nth-child(1) {
			grid-column: 1 / 2;
			border-right: 1px solid transparent;
		}

		&:nth-child(2) {
			grid-column: 1 / 2;
			padding-bottom: 0;
			border-right: 1px solid transparent;
			border-bottom: none;
		}

		&:nth-child(3) {
			grid-row: 1 / -1;
			grid-column: 2 / 3;
			border-top: 0;
			border-left: ${({ theme }) => '1px solid ' + theme.text5};
			padding: 0 0 0 24px;
			margin-left: 24px;
		}
	}
`

export const LinksWrapper = styled.section`
	display: flex;
	gap: 16px;
	flex-wrap: wrap;
`

export const Button = styled(ButtonLight)`
	display: flex;
	gap: 4px;
	align-items: center;
	padding: 8px 12px;
	font-size: 0.875rem;
	font-weight: 400;
	white-space: nowrap;
	font-family: var(--font-inter);
`

export const FlexRow = styled.p`
	display: flex;
	align-items: center;
	gap: 8px;
`

export const DownloadButton = styled(Button)`
	display: flex;
	align-items: center;
	color: inherit;
	padding: 8px 12px;
	border-radius: 10px;
`

export const ButtonYields = styled(ButtonLight)`
	display: flex;
	gap: 4px;
	align-items: center;
	padding: 4px 6px;
	font-size: 0.875rem;
	font-weight: 400;
	white-space: nowrap;
	font-family: var(--font-inter);
`
