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

export const Stat = styled.h1`
	font-size: 1.5rem;
	font-weight: 600;
	display: flex;
	flex-direction: column;
	gap: 8px;

	& > *:first-child {
		font-weight: 400;
		font-size: 1rem;
		text-align: left;
		color: ${({ theme }) => (theme.mode === 'dark' ? '#cccccc' : '#545757')};
	}

	& > *:nth-child(2) {
		font-family: var(--font-jetbrains);
		min-height: 2rem;
		display: flex;
		align-items: center;
		gap: 16px;
		justify-content: space-between;
		flex-wrap: wrap;
	}

	& > *[data-default-style='true'] {
		font-family: var(--font-inter);
		font-weight: 400;
		font-size: 1rem;
		margin: -2px 0;
	}
`

export const StatInARow = styled.h1`
	font-weight: 400;
	font-size: 1rem;
	display: flex;
	align-items: center;
	gap: 16px;
	justify-content: space-between;
	flex-wrap: wrap;

	& > *:first-child {
		text-align: left;
		color: ${({ theme }) => (theme.mode === 'dark' ? '#cccccc' : '#545757')};
	}

	& > *:nth-child(2) {
		font-family: var(--font-jetbrains);
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 16px;
		justify-content: space-between;
		flex-wrap: wrap;
	}

	& > *[data-default-style='true'] {
		font-family: var(--font-inter);
		font-weight: 400;
		font-size: 1rem;
		margin: -2px 0;
	}
`
