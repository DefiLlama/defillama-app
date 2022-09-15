import styled from 'styled-components'
import QuestionHelper from '~/components/QuestionHelper'

export const HeaderWithHelperText = ({ value, helperText }: { value: string; helperText: string }) => {
	return (
		<>
			<span>{value}</span>
			<Helper text={helperText} />
		</>
	)
}

const Helper = styled(QuestionHelper)`
	color: ${({ theme }) => theme.text1};
`
