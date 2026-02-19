import { Icon } from '~/components/Icon'
import { Flag } from '../Flag'

interface SectionHeaderProps {
	id: string
	children: React.ReactNode
}

export const SectionHeader = ({ id, children }: SectionHeaderProps) => (
	<h2 className="group relative flex items-center gap-1 text-base font-semibold" id={id}>
		{children}
		<a aria-hidden="true" tabIndex={-1} href={`#${id}`} className="absolute top-0 right-0 z-10 flex h-full w-full items-center" />
		<Icon name="link" className="invisible h-3.5 w-3.5 group-hover:visible group-focus-visible:visible" />
	</h2>
)

interface MetricRowProps {
	label: React.ReactNode
	value: React.ReactNode
	className?: string
}

export const MetricRow = ({ label, value, className = '' }: MetricRowProps) => (
	<p className={`flex flex-wrap justify-between gap-4 border-b border-(--cards-border) py-1 first:pt-0 last:border-none last:pb-0 ${className}`}>
		<span className="text-(--text-label)">{label}</span>
		<span className="font-jetbrains">{value}</span>
	</p>
)

interface MetricSectionProps {
	title: React.ReactNode
	value: React.ReactNode
	dataType: string
	protocolName: string
	category: string
	children?: React.ReactNode
	defaultOpen?: boolean
}

export const MetricSection = ({
	title,
	value,
	dataType,
	protocolName,
	category,
	children,
	defaultOpen = false
}: MetricSectionProps) => (
	<details className="group" open={defaultOpen}>
		<summary className="flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 group-last:border-none group-open:border-none group-open:font-semibold">
			{typeof title === 'string' ? <span className="text-(--text-label)">{title}</span> : title}
			<Icon
				name="chevron-down"
				height={16}
				width={16}
				className="relative top-0.5 -ml-3 transition-transform duration-100 group-open:rotate-180"
			/>
			<Flag
				protocol={protocolName}
				dataType={dataType}
				isLending={category === 'Lending'}
				className="mr-auto opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
			/>
			<span className="ml-auto font-jetbrains">{value}</span>
		</summary>
		{children && <div className="mb-3 flex flex-col">{children}</div>}
	</details>
)
