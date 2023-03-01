import { useInView, defaultFallbackInView } from 'react-intersection-observer'
import styled from 'styled-components'
import { ButtonLight } from '~/components/ButtonStyled'

export const DetailsWrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 36px;
	padding: 24px;
	padding-bottom: calc(24px + 0.4375rem);
	color: ${({ theme }) => theme.text1};
	background: ${({ theme }) => theme.bg7};
	grid-column: span 1;
	border-radius: 12px 12px 0 0;

	@media screen and (min-width: 80rem) {
		min-width: 380px;
		border-radius: 12px 0 0 12px;
	}
`

export const Name = styled.h1`
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 1.25rem;
`

export const Symbol = styled.span`
	font-weight: 400;
	margin-right: auto;
`

export const SectionHeader = styled.h2`
	font-weight: 700;
	font-size: 1.25rem;
	margin: 0 0 -24px;
	border-left: 1px solid transparent;
`

export const InfoWrapper = styled.div`
	background: ${({ theme }) => theme.bg7};
	border: ${({ theme }) => '1px solid ' + theme.divider};
	border-radius: 12px;
	display: grid;
	padding: 24px;
	grid-template-columns: 1fr 1fr;
	box-shadow: ${({ theme }) => theme.shadowSm};

	@media screen and (min-width: 80rem) {
		grid-template-rows: repeat(2, auto);
	}
`

export const Section = styled.div`
	grid-column: 1 / -1;
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 24px 0;

	&:first-child {
		padding-top: 0;
	}

	&:last-child {
		padding-bottom: 0;
	}

	:nth-child(n + 2) {
		border-top: ${({ theme }) => '1px solid ' + theme.text5};
	}

	h3 {
		font-weight: 600;
		font-size: 1.125rem;
	}

	p {
		line-height: 1.5rem;
	}

	@media screen and (min-width: 80rem) {
		grid-column: span 1;

		:nth-child(2) {
			border-top: 1px solid transparent;
			padding-top: 0;
		}

		:nth-child(odd) {
			border-right: ${({ theme }) => '1px solid ' + theme.text5};
		}

		:nth-child(even) {
			padding-left: 24px;
		}

		&:only-child,
		:nth-child(odd):last-child {
			border-right: 1px solid transparent;
			grid-column: span 2;
		}
	}
`

export const LinksWrapper = styled.div`
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

export const DetailsTable = styled.table`
	border-collapse: collapse;

	caption,
	thead th {
		font-weight: 400;
		font-size: 0.75rem;
		text-align: left;
		color: ${({ theme }) => (theme.mode === 'dark' ? '#cccccc' : '#545757')};
	}

	th {
		font-weight: 600;
		font-size: 1rem;
		text-align: start;
	}

	td {
		font-weight: 400;
		font-size: 0.875rem;
		text-align: right;
		font-family: var(--font-jetbrains);
	}

	thead td {
		> * {
			width: min-content;
			background: none;
			margin-left: auto;
			color: ${({ theme }) => theme.text1};
		}
	}

	thead > tr > *,
	caption {
		padding: 0 0 4px;
	}

	tbody > tr > * {
		padding: 4px 0;
	}

	.question-helper {
		padding: 0 16px 4px;
	}
`

export const ExtraOption = styled.label`
	display: flex;
	align-items: center;
	gap: 8px;

	:hover {
		cursor: pointer;
	}
`

export const ChartsPlaceholder = styled.div`
	height: 400px;
	display: flex;
	justify-content: center;
	align-items: center;
	grid-column: 1 / -1;
`

export const ChartsWrapper = styled.div`
	display: grid;
	grid-template-columns: 1fr 1fr;
	border-radius: 12px;
	background: ${({ theme }) => theme.bg6};
	border: ${({ theme }) => '1px solid ' + theme.divider};
	box-shadow: ${({ theme }) => theme.shadowSm};
`

export const ChartWrapper = styled.div`
	grid-column: span 2;
	min-height: 400px;
	padding: 20px;
	display: flex;
	flex-direction: column;

	@media screen and (min-width: 80rem) {
		grid-column: span 1;

		:last-child:nth-child(2n - 1) {
			grid-column: span 2;
		}
	}
`

defaultFallbackInView(true)

export const LazyChart = ({ children, enable = true, ...props }) => {
	const { ref, inView } = useInView({
		triggerOnce: true
	})

	return enable ? (
		<ChartWrapper ref={ref} {...props}>
			{inView && children}
		</ChartWrapper>
	) : (
		children
	)
}
