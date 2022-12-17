import styled from 'styled-components'

export const Header = styled.div`
	position: relative;
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
	background: ${({ theme }) => (theme.mode === 'dark' ? 'black' : 'white')};
	padding: 16px;
	border-radius: 12px 12px 0 0;
	border: 1px solid ${({ theme }) => theme.divider};
	border-bottom: 0;

	& > * {
		font-size: 0.875rem;
		font-weight: 400;
	}

	p {
		color: #646466;
	}

	button {
		margin-left: auto;
		color: ${({ theme }) => theme.link};
	}
`

export const Wrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 20px;
	padding: 20px 16px 24px;
	background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(246, 246, 246, 0.6)')};
	border-radius: 0 0 12px 12px;
	border: 1px solid ${({ theme }) => theme.divider};
	border-top: 0;
`

export const SearchWrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 8px;
	width: 100%;

	& > * {
		gap: 8px;
		flex: 1;
	}

	& > * {
		& > *[data-searchicon='true'] {
			top: 14px;
			right: 16px;
		}
	}

	@media (min-width: ${({ theme }) => theme.bpMed}) {
		flex-direction: row;
	}
`

export const DropdownsWrapper = styled.div`
	display: flex;
	gap: 12px;
	flex-wrap: wrap;

	@media screen and (max-width: 30rem) {
		& > *:first-child {
			width: 100%;
		}
	}
`
