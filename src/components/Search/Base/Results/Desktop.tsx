import { useState } from 'react'
import { ComboboxPopover, ComboboxState } from 'ariakit/combobox'
import styled from 'styled-components'
import { DesktopRow } from './Row/Desktop'
import type { ISearchItem } from '../../types'

export const Popover = styled(ComboboxPopover)`
	height: 100%;
	max-height: 320px;
	overflow-y: auto;
	background: ${({ theme }) => theme.bg6};
	border-radius: 12px;
	outline: ${({ theme }) => '1px solid ' + theme.text5};
	box-shadow: ${({ theme }) => theme.shadowLg};
	z-index: 10;
`

export const Empty = styled.div`
	padding: 24px 12px;
	color: ${({ theme }) => theme.text1};
	text-align: center;
`

interface IResultsProps {
	state: ComboboxState
	data: Array<ISearchItem>
	loading: boolean
	onItemClick?: (item: ISearchItem) => void | null
}

export function DesktopResults({ state, data, loading, onItemClick, ...props }: IResultsProps) {
	const [resultsLength, setResultsLength] = useState(10)

	const showMoreResults = () => {
		setResultsLength((prev) => prev + 10)
	}

	const sortedList = state.value.length > 2 ? sortResults(state.matches) : state.matches

	const options = sortedList.map((o) => data.find((x) => x.name === o) ?? o)

	return (
		<Popover state={state} {...props}>
			{loading || !state.mounted ? (
				<Empty>Loading...</Empty>
			) : state.matches.length ? (
				<>
					{options.slice(0, resultsLength + 1).map((token) => (
						<DesktopRow key={token.name} onItemClick={onItemClick} data={token} state={state} />
					))}

					{resultsLength < sortedList.length && <MoreResults onClick={showMoreResults}>See more...</MoreResults>}
				</>
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

export const MoreResults = styled.button`
	text-align: left;
	width: 100%;
	padding: 12px 16px 28px;
	color: ${({ theme }) => theme.link};
	background: ${({ theme }) => theme.bg6};
`
