import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'

interface MetricRowProps {
	label: React.ReactNode
	tooltip?: React.ReactNode
	value: React.ReactNode
	extra?: React.ReactNode
	className?: string
	valueClassName?: string
}

export const MetricRow = ({
	label,
	tooltip,
	value,
	extra,
	className = '',
	valueClassName = 'ml-auto font-jetbrains'
}: MetricRowProps) => (
	<p
		className={`group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none ${className}`.trim()}
	>
		{tooltip ? (
			<Tooltip content={tooltip} className="text-(--text-label) underline decoration-dotted">
				{label}
			</Tooltip>
		) : (
			<span className="text-(--text-label)">{label}</span>
		)}
		{extra}
		<span className={valueClassName}>{value}</span>
	</p>
)

export const SubMetricRow = ({
	label,
	tooltip,
	value,
	extra,
	className = '',
	valueClassName = 'ml-auto font-jetbrains'
}: MetricRowProps) => (
	<p
		className={`group flex flex-wrap justify-start gap-4 border-b border-dashed border-(--cards-border) py-1 last:border-none ${className}`.trim()}
	>
		{tooltip ? (
			<Tooltip content={tooltip} className="text-(--text-label) underline decoration-dotted">
				{label}
			</Tooltip>
		) : (
			<span className="text-(--text-label)">{label}</span>
		)}
		{extra}
		<span className={valueClassName}>{value}</span>
	</p>
)

interface MetricSectionProps {
	label: React.ReactNode
	tooltip?: React.ReactNode
	value: React.ReactNode
	extra?: React.ReactNode
	children?: React.ReactNode
	defaultOpen?: boolean
	className?: string
	valueClassName?: string
}

export const MetricSection = ({
	label,
	tooltip,
	value,
	extra,
	children,
	defaultOpen = false,
	className = '',
	valueClassName = 'ml-auto font-jetbrains'
}: MetricSectionProps) => (
	<details className={`group ${className}`.trim()} open={defaultOpen}>
		<summary className="flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 group-last:border-none group-open:border-none group-open:font-semibold">
			{tooltip ? (
				// Keep native title in <summary>; wrapped tooltip triggers can interfere with details toggling.
				<span
					title={typeof tooltip === 'string' ? tooltip : undefined}
					className={`text-(--text-label)${typeof tooltip === 'string' ? ' underline decoration-dotted' : ''}`}
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
			{extra}
			<span className={valueClassName}>{value}</span>
		</summary>
		{children && <div className="mb-3 flex flex-col">{children}</div>}
	</details>
)
