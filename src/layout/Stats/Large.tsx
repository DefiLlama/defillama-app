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

export const AccordionStat = styled.details`
	&[open] {
		summary {
			& > *[data-arrowicon] {
				transform: rotate(90deg);
				transition: 0.1s ease;
			}
		}
	}

	margin-bottom: -8px;

	summary {
		display: flex;
		gap: 16px;
		flex-wrap: wrap;
		align-items: center;
		list-style: none;
		list-style-type: none;
		cursor: pointer;

		& > *[data-arrowicon] {
			margin: auto -16px 8px -20px;
		}

		& > *[data-summaryheader] {
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
				display: flex;
				align-items: center;
				gap: 8px;

				div[data-tooltipanchor='true'] {
					button {
						opacity: 0;
					}

					button:focus-visible {
						opacity: 1;
					}
				}

				div[data-tooltipanchor='true']:focus-visible {
					button {
						opacity: 1;
					}
				}
			}

			& > *:nth-child(2) {
				font-family: var(--font-jetbrains);
				min-height: 2rem;
			}
		}
	}

	summary::-webkit-details-marker {
		display: none;
	}

	summary + span {
		margin-top: 16px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	:hover {
		summary {
			& > *[data-summaryheader] {
				& > *:first-child {
					div[data-tooltipanchor='true'] {
						button {
							opacity: 1;
						}
					}
				}
			}
		}
	}
`

export const AccordionStat2 = styled(AccordionStat)`
	summary {
		& > *[data-arrowicon] {
			margin: auto -16px 1px -20px;
		}

		& > *[data-summaryheader] {
			flex: 1;
			flex-direction: row;
			font-size: 1rem;
			align-items: center;
			justify-content: space-between;

			& > *:nth-child(2) {
				font-family: var(--font-jetbrains);
				min-height: 1rem;
			}
		}
	}
`
