import QuestionHelper from '~/components/QuestionHelper'

export const HeaderWithHelperText = ({ value, helperText }: { value: string; helperText: string }) => {
	return (
		<>
			<span>{value}</span>
			<QuestionHelper text={helperText} />
		</>
	)
}
