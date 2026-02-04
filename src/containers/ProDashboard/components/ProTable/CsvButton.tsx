import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'

export const ProTableCSVButton = ({
	onClick,
	smol,
	isLoading,
	className
}: {
	onClick: () => void
	smol?: boolean
	isLoading?: boolean
	className?: string
}) => {
	return (
		<CSVDownloadButton
			onClick={onClick}
			className={
				className ||
				'flex items-center gap-2 rounded-md border pro-border pro-bg1 pro-hover-bg px-3 py-1.5 text-sm pro-text1 transition-colors disabled:cursor-not-allowed disabled:opacity-50'
			}
			replaceClassName={true}
			smol={smol}
			isLoading={isLoading}
		/>
	)
}
