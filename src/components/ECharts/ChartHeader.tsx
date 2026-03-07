interface ChartHeaderProps {
	title?: string
	headingAs?: 'h1' | 'h2'
	customComponents?: React.ReactNode
	exportButtons?: React.ReactNode
	className?: string
}

export function ChartHeader({
	title,
	headingAs: HeadingTag = 'h2',
	customComponents,
	exportButtons,
	className
}: ChartHeaderProps) {
	return title || customComponents || exportButtons ? (
		<div className={className ?? 'mb-2 flex flex-wrap items-center justify-end gap-2 px-2'}>
			{title ? <HeadingTag className="mr-auto text-base font-semibold">{title}</HeadingTag> : null}
			{customComponents ?? null}
			{exportButtons ?? null}
		</div>
	) : null
}
