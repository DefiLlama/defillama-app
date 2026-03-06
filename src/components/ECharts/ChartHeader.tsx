interface ChartHeaderProps {
	title?: string
	customComponents?: React.ReactNode
	exportButtons?: React.ReactNode
	className?: string
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
