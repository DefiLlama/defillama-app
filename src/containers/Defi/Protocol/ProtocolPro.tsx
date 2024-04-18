import * as React from 'react'

import styled from 'styled-components'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const SortbaleBody = styled.div<{ isTable: boolean }>`
	cursor: pointer;
	grid-column: ${({ isTable }) => (isTable ? '1/-1' : 'auto')};
`

export function SortableItem(props) {
	const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: props.id })
	const style = {
		transform: CSS.Translate.toString(transform),
		transition
	}

	return (
		<SortbaleBody ref={setNodeRef} style={style} {...props} {...attributes} {...listeners}>
			{props.children}
		</SortbaleBody>
	)
}
export const ChartTypes = {
	tvl: 'TVL',
	mcap: 'MCAP',
	tokenPrice: 'Token Price',
	fdv: 'FDV',
	volume: 'Volume',
	derivativesVolume: 'Derivatives Volume',
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
