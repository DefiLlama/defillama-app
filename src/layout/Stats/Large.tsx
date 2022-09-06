import styled from 'styled-components'

export const StatsWrapper = styled.div`
	display: flex;
	flex-direction: column;
	color: ${({ theme }) => theme.text1};
	grid-column: span 1;
	padding: 0 16px;

	hr {
		margin: 20px 0;
		border: 1px solid hsl(180deg 2% 51% / 10%);
	}

	@media screen and (min-width: 80rem) {
		min-width: 380px;
		padding: 0 0 0 36px;

		hr {
			margin: 32px 0;
		}
	}
`

export const Stat = styled.p`
	display: flex;
	flex-direction: column;
	gap: 16px;

	& > *:nth-child(1) {
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
		font-size: 2.25rem;
		margin: -10px 0;
	}

	& > *[data-default-style] {
		font-family: var(--font-inter);
		font-weight: 400;
		font-size: 1rem;
		margin: -2px 0;
	}
`
