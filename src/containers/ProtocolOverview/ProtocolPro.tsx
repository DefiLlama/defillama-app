import * as React from 'react'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export function SortableItem(props) {
	const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: props.id })
	const style = {
		transform: CSS.Translate.toString(transform),
		transition,
		cursor: 'pointer',
		gridColumn: props.isTable ? '1/-1' : 'auto'
	}

	return (
		<div ref={setNodeRef} style={style} {...props} {...attributes} {...listeners}>
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
	fees: 'Fees',
	revenue: 'Revenue',
	unlocks: 'Unlocks',
	activeUsers: 'Active Users',
	newUsers: 'New Users',
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
