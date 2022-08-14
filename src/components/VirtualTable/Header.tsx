import styled from 'styled-components'
import QuestionHelper from '~/components/QuestionHelper'

export const HeaderWithHelperText = ({ value, helperText }: { value: string; helperText: string }) => {
	return (
		<Wrapper>
			<span>{value}</span>
			{/* <QuestionHelper text={helperText} /> */}
		</Wrapper>
	)
}

const Wrapper = styled.span`
	display: flex;
	gap: 4px;
	font-weight: 500 !important;

	svg {
		flex-shrink: 0;
		color: ${({ theme }) => theme.text1};
	}
`
