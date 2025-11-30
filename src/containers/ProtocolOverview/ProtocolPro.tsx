import * as React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export function SortableItem(props) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.id })
	const style = {
		transform: CSS.Translate.toString(transform),
		transition,
		cursor: isDragging ? 'grabbing' : 'pointer',
		gridColumn: props.isTable ? '1/-1' : 'auto',
		zIndex: isDragging ? 50 : 'auto',
		boxShadow: isDragging ? '0 12px 24px rgba(0, 0, 0, 0.25)' : 'none',
		scale: isDragging ? '1.02' : '1',
		opacity: isDragging ? 0.95 : 1,
		background: isDragging ? 'var(--cards-bg)' : undefined,
		borderRadius: isDragging ? '6px' : undefined
	}

	const tableListeners = props.isTable ? { ...listeners, onKeyDown: (e) => e.stopPropagation() } : listeners
	return (
		<div ref={setNodeRef} style={style} {...props} {...attributes} {...tableListeners}>
			{props.children}
		</div>
	)
}
export const ChartTypes = {
	tvl: 'TVL',
	mcap: 'MCAP',
	tokenPrice: 'Token Price',
	fdv: 'FDV',
	volume: 'Volume',
	derivativesVolume: 'Perps Volume',
	chainFees: 'Fees',
	revenue: 'Revenue',
	unlocks: 'Unlocks',
	activeUsers: 'Active Addresses',
	newUsers: 'New Addresses',
	transactions: 'Transactions',
	gasUsed: 'Gas Used',
	governance: 'Governance',
	treasury: 'Treasury',
	bridgeVolume: 'Bridge Volume',
	tokenVolume: 'Token Volume',
	tokenLiquidity: 'Token Liquidity',
	twitter: 'Tweets',
	devMetrics: 'Devs',
	contributersMetrics: 'Contributers',
	contributersCommits: 'Contributers Commits',
	devCommits: 'Devs Commits',
	staking: 'Staking',
	borrowed: 'Borrowed'
}
