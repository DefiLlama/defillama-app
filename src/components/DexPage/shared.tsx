import styled from 'styled-components'

export const ListOptions = styled.nav`
	display: flex;
	align-items: center;
	gap: 10px;
	overflow: hidden;
	margin: 0 0 -20px;

	button {
		font-weight: 600;
	}
`

export const ListHeader = styled.h3`
	font-size: 1.125rem;
	color: ${({ theme }) => theme.text1};
	font-weight: 500;
	white-space: nowrap;

	@media screen and (max-width: 40rem) {
		font-size: 1rem;
	}
`
