export const StatsCard = ({
	label,
	value,
	subtle,
	variant = 'default'
}: {
	label: string
	value: string
	subtle?: string
	variant?: 'default' | 'highlight'
}) => {
	const base = 'flex min-h-[86px] flex-col gap-1 rounded-md border p-3 transition-colors duration-200'
	const containerClass =
		variant === 'highlight'
			? `${base} border-(--form-control-border) bg-(--bg-input) shadow-xs`
			: `${base} border-(--cards-border) bg-(--cards-bg)`

	const valueClass =
		variant === 'highlight'
			? 'font-jetbrains text-2xl font-semibold text-(--text-primary)'
			: 'font-jetbrains text-xl font-semibold text-(--text-primary)'

	return (
		<dl className={containerClass}>
			<dt className="text-xs font-medium tracking-wide text-(--text-label) uppercase">{label}</dt>
			<dd className={valueClass}>{value}</dd>
			{subtle ? <dd className="text-xs text-(--text-secondary)">{subtle}</dd> : null}
		</dl>
	)
}
