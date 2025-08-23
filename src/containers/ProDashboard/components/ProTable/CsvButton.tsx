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
				'pro-border flex items-center gap-2 border bg-(--bg-main) px-3 py-1.5 text-sm text-(--text-primary) transition-colors hover:bg-(--bg-tertiary) disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#070e0f]'
			}
			replaceClassName={true}
			smol={smol}
			isLoading={isLoading}
		/>
	)
}
