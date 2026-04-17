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
	value?: ReactNode
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
	<details className={`group/metric ${className}`.trim()} open={defaultOpen}>
		<summary className="flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 group-last/metric:border-none group-open/metric:border-none group-open/metric:font-semibold">
			{tooltip ? (
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
				className="relative top-0.5 -ml-3 transition-transform duration-100 group-open/metric:rotate-180"
			/>
			{extra}
			{value != null ? <span className={valueClassName}>{value}</span> : null}
		</summary>
		{children ? <div className="mb-3 flex flex-col">{children}</div> : null}
	</details>
)

export const SubMetricSection = ({
	label,
	value,
	children,
	defaultOpen = false
}: {
	label: ReactNode
	value?: ReactNode
	children?: ReactNode
	defaultOpen?: boolean
}) => (
	<details className="group/sub" open={defaultOpen}>
		<summary className="flex flex-wrap justify-start gap-4 border-b border-dashed border-(--cards-border) py-1 group-last/sub:border-none group-open/sub:border-none group-open/sub:font-semibold">
			<span className="text-(--text-label)">{label}</span>
			<Icon
				name="chevron-down"
				height={16}
				width={16}
				className="relative top-0.5 -ml-3 transition-transform duration-100 group-open/sub:rotate-180"
			/>
			{value != null ? <span className="ml-auto font-jetbrains">{value}</span> : null}
		</summary>
		{children ? <div className="mb-3 flex flex-col">{children}</div> : null}
	</details>
)
