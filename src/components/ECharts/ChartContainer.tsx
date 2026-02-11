interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
	id: string
	header?: React.ReactNode | undefined
	chartClassName?: string | undefined
	chartStyle?: React.CSSProperties | undefined
}

export function ChartContainer({ id, header, chartClassName, chartStyle, ...props }: ChartContainerProps) {
	return (
		<div className="relative" {...props}>
			{header}
			<div id={id} className={chartClassName ?? 'my-auto min-h-[360px]'} style={chartStyle} />
		</div>
	)
}
