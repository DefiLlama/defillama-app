import type { ReactNode } from 'react'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'

interface MetricRowProps {
	label: ReactNode
	tooltip?: ReactNode
	value: ReactNode
	extra?: ReactNode
	className?: string
	valueClassName?: string
	dashed?: boolean
}

export const MetricRow = ({
	label,
	tooltip,
	value,
	extra,
	className = '',
	valueClassName = 'ml-auto font-jetbrains',
	dashed = false
}: MetricRowProps) => (
	<p
		className={`group flex flex-wrap justify-start gap-4 border-b ${dashed ? 'border-dashed' : ''} border-(--cards-border) py-1 last:border-none ${className}`.trim()}
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

type SubMetricRowProps = Omit<MetricRowProps, 'dashed'>

export const SubMetricRow = ({
	label,
	tooltip,
	value,
	extra,
	className = '',
	valueClassName = 'ml-auto font-jetbrains'
}: SubMetricRowProps) => (
	<MetricRow
		label={label}
		tooltip={tooltip}
		value={value}
		extra={extra}
		className={className}
		valueClassName={valueClassName}
		dashed={true}
	/>
)

interface MetricSectionProps {
	label: ReactNode
	tooltip?: string | null
	value: ReactNode
	extra?: ReactNode
	children?: ReactNode
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
				// MetricSection only supports string tooltips because <summary> uses native title for safe toggling.
				<span title={tooltip ?? undefined} className="text-(--text-label) underline decoration-dotted">
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
		{children ? <div className="mb-3 flex flex-col">{children}</div> : null}
	</details>
)
