import { ReactNode } from 'react'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'

export const ProTableCSVButton = ({
	onClick,
	customText = '',
	smol,
	isLoading
}: {
	onClick: () => void
	customText?: ReactNode
	smol?: boolean
	isLoading?: boolean
}) => {
	const tableButtonStyles =
		'flex items-center gap-2 px-3 py-1.5 text-sm border pro-border hover:bg-[var(--bg3)] text-[var(--text1)] transition-colors bg-[var(--bg1)] dark:bg-[#070e0f] disabled:opacity-50 disabled:cursor-not-allowed'

	return (
		<CSVDownloadButton
			onClick={onClick}
			customText={customText}
			customClassName={tableButtonStyles}
			smol={smol}
			isLoading={isLoading}
		/>
	)
}
