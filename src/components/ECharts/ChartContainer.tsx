interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
	id: string
	header?: React.ReactNode
	chartClassName?: string
	chartStyle?: React.CSSProperties
}

export function ChartContainer({ id, header, chartClassName, chartStyle, className, ...props }: ChartContainerProps) {
	return (
		<div className={`relative ${className ?? ''}`} {...props}>
			{header}
			<div id={id} className={chartClassName ?? 'my-auto min-h-[360px]'} style={chartStyle} />
		</div>
	)
}
