export function KpiCard({
	label,
	value,
	sub,
	change
}: {
	label: string
	value: string
	sub?: string
	change?: { value: number; formatted: string }
}) {
	return (
		<div className="flex flex-col gap-1 rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<span className="text-xs font-medium tracking-wide text-(--text-label)">{label}</span>
			<div className="flex items-baseline gap-2">
				<span className="text-2xl font-semibold text-(--text-primary)">{value}</span>
				{change && (
					<span className={`text-xs font-medium ${change.value >= 0 ? 'text-green-500' : 'text-red-500'}`}>
						{change.formatted}
					</span>
				)}
			</div>
			{sub && <span className="text-xs text-(--text-label)">{sub}</span>}
		</div>
	)
}

export function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<h3 className="mb-3 text-sm font-medium text-(--text-label)">{title}</h3>
			{children}
		</div>
	)
}

export function SectionHeader({ children }: { children: React.ReactNode }) {
	return <h2 className="text-xs font-semibold tracking-wider text-(--text-label) uppercase">{children}</h2>
}

export function formatNumber(n: number, decimals = 2): string {
	if (!Number.isFinite(n)) return '—'
	const abs = Math.abs(n)
	if (abs >= 1e12) return `${(n / 1e12).toFixed(decimals)}T`
	if (abs >= 1e9) return `${(n / 1e9).toFixed(decimals)}B`
	if (abs >= 1e6) return `${(n / 1e6).toFixed(decimals)}M`
	if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`
	return n.toLocaleString('en-US', { maximumFractionDigits: decimals })
}

export function formatPct(n: number, decimals = 2): string {
	if (!Number.isFinite(n)) return '—'
	return `${n.toFixed(decimals)}%`
}
