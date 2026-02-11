interface ChartHeaderProps {
	title?: string | undefined
	customComponents?: React.ReactNode | undefined
	exportButtons?: React.ReactNode | undefined
	className?: string | undefined
}

export function ChartHeader({ title, customComponents, exportButtons, className }: ChartHeaderProps) {
	return title || customComponents || exportButtons ? (
		<div className={className ?? 'mb-2 flex flex-wrap items-center justify-end gap-2 px-2'}>
			{title ? <h1 className="mr-auto text-base font-semibold">{title}</h1> : null}
			{customComponents ?? null}
			{exportButtons ?? null}
		</div>
	) : null
}
