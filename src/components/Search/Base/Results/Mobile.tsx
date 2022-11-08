import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import styled from 'styled-components'
import { MobileRow } from './Row/Mobile'
import type { ISearchItem } from '../../types'

const MobilePopover = styled.div`
	position: absolute;
	top: 56px;
	left: 8px;
	right: 8px;
	height: 100%;
	max-height: 240px;
	overflow-y: auto;
	background: ${({ theme }) => theme.bg6};
	border-bottom-left-radius: 12px;
	border-bottom-right-radius: 12px;
	outline: ${({ theme }) => '1px solid ' + theme.text5};
	box-shadow: ${({ theme }) => theme.shadowLg};
	z-index: 10;
`

const Empty = styled.div`
	padding: 24px 12px;
	color: ${({ theme }) => theme.text1};
	text-align: center;
`

interface IMobileResultsProps {
	inputValue: string
	data: Array<ISearchItem>
	loading: boolean
	onItemClick?: (item: ISearchItem) => void | null
}

export function MobileResults({ inputValue, data, loading, onItemClick, ...props }: IMobileResultsProps) {
	const results = filterAnSortResults(data, inputValue)

	// The scrollable element for your list
	const parentRef = useRef()

	// The virtualizer
	const rowVirtualizer = useVirtualizer({
		count: results.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 50
	})

	return (
		<MobilePopover ref={parentRef} {...props}>
			{loading ? (
				<Empty>Loading...</Empty>
			) : results.length ? (
				<>
					{/* The large inner element to hold all of the items */}
					<div
						style={{
							height: `${rowVirtualizer.getTotalSize()}px`,
							width: '100%',
							position: 'relative'
						}}
					>
						{/* Only the visible items in the virtualizer, manually positioned to be in view */}
						{rowVirtualizer.getVirtualItems().map((virtualItem) => {
							const data = results[virtualItem.index]

							return (
								<MobileRow
									data={data}
									style={{
										position: 'absolute',
										top: 0,
										left: 0,
										width: '100%',
										height: `${virtualItem.size}px`,
										transform: `translateY(${virtualItem.start}px)`
									}}
									key={virtualItem.key}
									onItemClick={onItemClick}
								/>
							)
						})}
					</div>
				</>
			) : (
				<Empty>No results found</Empty>
			)}
		</MobilePopover>
	)
}

const filterAnSortResults = (data: Array<ISearchItem>, inputValue: string): Array<ISearchItem> => {
	if (!inputValue || inputValue === '') {
		return data
	}

	const results: Array<ISearchItem> = data.filter((item) =>
		item.name.toLowerCase().startsWith(inputValue.toLowerCase())
	)

	if (inputValue.length < 3) {
		return results
	}

	const { pools, tokens } = results.reduce(
		(acc, curr) => {
			if (curr.name.startsWith('Show all')) {
				acc.pools.push(curr)
			} else acc.tokens.push(curr)
			return acc
		},
		{ tokens: [], pools: [] }
	)

	return [...pools, ...tokens]
}
