import React, { useState } from 'react'
import { Icon } from '~/components/Icon'

interface CollapsibleSectionProps {
	title: string
	isDefaultExpanded?: boolean
	badge?: string | number
	children: React.ReactNode
	className?: string
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
	title,
	isDefaultExpanded = false,
	badge,
	children,
	className = ''
}) => {
	const [isExpanded, setIsExpanded] = useState(isDefaultExpanded)

	return (
		<div className={`rounded-lg border border-(--cards-border) bg-(--cards-bg) ${className}`}>
			<button
				type="button"
				onClick={() => setIsExpanded(!isExpanded)}
				className="flex w-full items-center justify-between rounded-t-lg px-3 py-2.5 transition-colors hover:bg-(--cards-bg-alt)"
			>
				<div className="flex items-center gap-2">
					{isExpanded ? (
						<Icon name="chevron-down" height={16} width={16} className="text-(--text-tertiary)" />
					) : (
						<Icon name="chevron-right" height={16} width={16} className="text-(--text-tertiary)" />
					)}
					<h3 className="text-sm font-semibold text-(--text-primary)">{title}</h3>
					{badge !== undefined && (
						<span className="rounded bg-(--primary)/10 px-1.5 py-0.5 text-[10px] font-medium text-(--primary)">
							{badge}
						</span>
					)}
				</div>
			</button>
			{isExpanded && <div className="border-t border-(--cards-border) px-3 py-2.5">{children}</div>}
		</div>
	)
}
