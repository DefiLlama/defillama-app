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
                'pro-border pro-bg1 pro-hover-bg pro-text1 flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50'
            }
            replaceClassName={true}
            smol={smol}
            isLoading={isLoading}
        />
    )
}
