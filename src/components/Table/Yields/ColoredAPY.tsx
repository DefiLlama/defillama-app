import styled from 'styled-components'

export const ColoredAPY = styled.span`
	color: ${({ theme }) => theme.text1};

	&[data-variant='supply'] {
		color: #4f8fea;
	}

	&[data-variant='borrow'] {
		color: #e59421;
	}

	&[data-variant='positive'] {
		color: #30c338;
	}
`
