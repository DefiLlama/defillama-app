import { FixedSizeList } from 'react-window'
import { ComboboxPopover, ComboboxState } from 'ariakit/combobox'
import styled from 'styled-components'
import { DesktopRow } from './Row/Desktop'
import type { ISearchItem } from '../../types'

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
	onItemClick?: (item: ISearchItem) => void | null
}

export function DesktopResults({ state, data, loading, onItemClick, ...props }: IResultsProps) {
	return (
		<Popover state={state} {...props}>
			{loading || !state.mounted ? (
				<Empty>Loading...</Empty>
			) : state.matches.length ? (
				<FixedSizeList
					height={state.matches.length * 50 > 240 ? 240 : state.matches.length * 50}
					width="100%"
					itemCount={state.matches.length}
					itemSize={50}
					itemData={{
						searchData: data,
						options: state.value.length > 2 ? sortResults(state.matches) : state.matches,
						onItemClick: onItemClick
					}}
				>
					{DesktopRow}
				</FixedSizeList>
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
