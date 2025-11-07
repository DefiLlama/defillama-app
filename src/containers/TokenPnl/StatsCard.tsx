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
	const base = 'flex flex-col rounded-md border p-3 transition-colors duration-200'
	const containerClass =
		variant === 'highlight'
			? `${base} border-(--cards-border) bg-gradient-to-b from-white/5 to-transparent backdrop-blur-sm`
			: `${base} border-(--cards-border) bg-(--cards-bg)`
	return (
		<div className={containerClass}>
			<span className="text-xs font-light tracking-wide text-(--text-secondary) uppercase">{label}</span>
			<span className={variant === 'highlight' ? 'text-xl font-bold' : 'text-lg font-medium'}>{value}</span>
			{subtle ? <span className="text-xs text-(--text-secondary)">{subtle}</span> : null}
		</div>
	)
}
