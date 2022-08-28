import styled from 'styled-components'

export const Banner = styled.p`
	background: #445ed0;
	text-align: center;
	margin: -36px -12px 0;
	padding: 6px;
	color: white;

	a {
		color: inherit;
		text-decoration: underline;
	}

	@media screen and (min-width: 37.5rem) {
		margin: -36px -32px 0;
	}

	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		margin: 0;
		position: fixed;
		top: 0;
		left: 220px;
		right: 0;
	}
`
