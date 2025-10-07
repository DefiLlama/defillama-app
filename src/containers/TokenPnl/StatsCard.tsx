export const StatsCard = ({ label, value, subtle }: { label: string; value: string; subtle?: string }) => {
	return (
		<div className="flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
			<span className="text-xs tracking-wide text-(--text-secondary) uppercase">{label}</span>
			<span className="text-lg font-semibold">{value}</span>
			{subtle ? <span className="text-xs text-(--text-secondary)">{subtle}</span> : null}
		</div>
	)
}
