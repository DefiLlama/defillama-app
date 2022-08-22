import styled from 'styled-components'

export const Button = styled.button`
	background: #445ed0;
	color: #ffffff;
	padding: 6px 10px;
	border-radius: 8px;
	filter: drop-shadow(0px 6px 10px rgba(0, 0, 0, 15%));
`

export const Close = styled.button`
	margin-left: auto;
	color: ${({ theme }) => theme.text1};
`
