import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'

interface ChainMetricRowProps {
	label: React.ReactNode
	tooltip?: React.ReactNode
	value: React.ReactNode
}

export const ChainMetricRow = ({ label, tooltip, value }: ChainMetricRowProps) => (
	<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
		{tooltip ? (
			<Tooltip content={tooltip} className="text-(--text-label) underline decoration-dotted">
				{label}
			</Tooltip>
		) : (
			<span className="text-(--text-label)">{label}</span>
		)}
		<span className="ml-auto font-jetbrains">{value}</span>
	</p>
)

interface ChainSubMetricRowProps {
	label: React.ReactNode
	tooltip?: React.ReactNode
	value: React.ReactNode
	className?: string
}

export const ChainSubMetricRow = ({ label, tooltip, value, className }: ChainSubMetricRowProps) => (
	<p
		className={`justify-stat flex flex-wrap gap-4 border-b border-dashed border-(--cards-border) py-1 last:border-none ${className ?? ''}`}
	>
		{tooltip ? (
			<Tooltip content={tooltip} className="text-(--text-label) underline decoration-dotted">
				{label}
			</Tooltip>
		) : (
			<span className="text-(--text-label)">{label}</span>
		)}
		<span className="ml-auto font-jetbrains">{value}</span>
	</p>
)

interface ChainMetricSectionProps {
	label: React.ReactNode
	tooltip?: React.ReactNode
	value: React.ReactNode
	children?: React.ReactNode
}

export const ChainMetricSection = ({ label, tooltip, value, children }: ChainMetricSectionProps) => (
	<details className="group">
		<summary className="flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 group-last:border-none group-open:border-none group-open:font-semibold">
			{tooltip ? (
				<span
					title={typeof tooltip === 'string' ? tooltip : undefined}
					className="text-(--text-label) underline decoration-dotted"
				>
					{label}
				</span>
			) : (
				<span className="text-(--text-label)">{label}</span>
			)}
			<Icon
				name="chevron-down"
				height={16}
				width={16}
				className="relative top-0.5 -ml-3 transition-transform duration-100 group-open:rotate-180"
			/>
			<span className="ml-auto font-jetbrains">{value}</span>
		</summary>
		{children && <div className="mb-3 flex flex-col">{children}</div>}
	</details>
)
