import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ComboboxPopover, ComboboxState } from 'ariakit/combobox'
import styled from 'styled-components'
import { Row } from './Row'
import type { ISearchItem } from '../types'

const Popover = styled(ComboboxPopover)`
	height: 100%;
	max-height: 320px;
	overflow-y: auto;
	background: ${({ theme }) => theme.bg6};
	border-bottom-left-radius: 12px;
	border-bottom-right-radius: 12px;
	outline: ${({ theme }) => '1px solid ' + theme.text5};
	box-shadow: ${({ theme }) => theme.shadowLg};
	transform: translate(0px, -5px);
	z-index: 10;
`

const Empty = styled.div`
	padding: 24px 12px;
	color: ${({ theme }) => theme.text1};
	text-align: center;
`

interface IResultsProps {
	state: ComboboxState
	data: Array<ISearchItem>
	loading: boolean
	onItemClick?: (item: ISearchItem) => void
}

export function Results({ state, data, loading, onItemClick, ...props }: IResultsProps) {
	const parentRef = useRef()

	const rowVirtualizer = useVirtualizer({
		count: state.matches.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 50,
		overscan: 5
	})

	return (
		<Popover state={state} {...props}>
			{loading || !state.mounted ? (
				<Empty>Loading...</Empty>
			) : state.matches.length ? (
				<div
					ref={parentRef}
					style={{
						height: state.matches.length * 50 > 240 ? 240 : state.matches.length * 50,
						width: '100%'
					}}
				>
					{sortResults(rowVirtualizer.getVirtualItems().map((item) => state.matches[item.index])).map((item) => (
						<Row key={item} name={item} searchData={state.matches} onItemClick={onItemClick} />
					))}
				</div>
			) : (
				<Empty>No results found</Empty>
			)}
		</Popover>
	)
}

const sortResults = (results: string[]) => {
	const { pools, tokens } = results.reduce(
		(acc, curr) => {
			if (curr.startsWith('Show all')) {
				acc.pools.push(curr)
			} else acc.tokens.push(curr)
			return acc
		},
		{ tokens: [], pools: [] }
	)

	return [...pools, ...tokens]
}
