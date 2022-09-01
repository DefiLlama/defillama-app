import * as React from 'react'
import styled from 'styled-components'
import { v4 as uuid } from 'uuid'
import InfiniteScroll from 'react-infinite-scroll-component'
import orderBy from 'lodash.orderby'
import { ArrowDown, ArrowUp, ChevronsUp } from 'react-feather'
import HeadHelp from '~/components/HeadHelp'
import QuestionHelper from '~/components/QuestionHelper'
import { Row } from './Row'
import { Cell, RowWrapper } from './shared'
import { splitArrayByFalsyValues } from './utils'
import type { ITableProps } from './types'

const Wrapper = styled.section`
	position: relative;
	background-color: ${({ theme }) => theme.advancedBG};
	display: flex;
	flex-direction: column;
	justify-content: flex-start;
	border-radius: 8px;
	border: 1px solid ${({ theme }) => theme.bg3};
	box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.05);
	padding: 6px 0;
	color: ${({ theme }) => theme.text1};
	overflow-x: auto;
`

const TableWrapper = styled.table`
	border-collapse: collapse;
	border-spacing: 0;
	width: 100%;
	position: relative;
`

const PinnedRow = styled(RowWrapper)`
	background: ${({ theme }) => theme.bg1};
`

const Header = styled.th`
	font-weight: 500;
	white-space: nowrap;

	& > * {
		justify-content: var(--text-align);
	}
`

const SortedHeader = styled.span`
	display: flex;
	gap: 4px;
	white-space: nowrap;

	& > svg {
		position: relative;
		top: 2px;
		width: 14px;
		height: 14px;
		flex-shrink: 0;
	}
`

const HeaderButton = styled.button`
	width: 100%;
	height: 100%;
	padding: 0;
	font-weight: 500;
	display: flex;
	justify-content: flex-end;

	svg {
		flex-shrink: 0;
	}

	&:hover {
		opacity: 0.6;
	}

	:focus-visible {
		outline-offset: 2px;
	}
`

const ScrollToTop = styled.button`
	background: ${({ theme }) => theme.bg2};
	border: 1px solid;
	border-color: ${({ theme }) => theme.divider};
	position: fixed;
	bottom: 20px;
	left: 0;
	right: 0;
	width: 36px;
	height: 36px;
	display: flex;
	justify-content: center;
	align-items: center;
	margin: auto;
	border-radius: 100%;
	opacity: 0.7;

	svg {
		color: ${({ theme }) => theme.text1};
	}

	:hover {
		opacity: 1;
	}

	@media (min-width: ${({ theme: { bpLg } }) => bpLg}) {
		left: 159px;
		bottom: 10px;
	}
`

const HeaderWithHelperText = styled.span`
	display: flex;
	gap: 4px;
	font-weight: 500 !important;

	svg {
		flex-shrink: 0;
		color: ${({ theme }) => theme.text1};
	}
`

const handleScrollToTop = () => {
	window.scrollTo({
		top: 0,
		behavior: 'smooth'
	})
}

function Table({ columns = [], data = [], align, gap, pinnedRow, ...props }: ITableProps) {
	const [lastIndex, setLastIndex] = React.useState(20)
	const [columnToSort, setColumnToSort] = React.useState<string | null>(null)
	const [sortDirection, setDirection] = React.useState<-1 | 0 | 1>(0)

	const [displayScrollToTopButton, setDisplayScrollToTopButton] = React.useState(false)

	React.useEffect(() => {
		function setScroll() {
			if (window.scrollY > 200) {
				setDisplayScrollToTopButton(true)
			} else {
				setDisplayScrollToTopButton(false)
			}
		}
		window.addEventListener('scroll', setScroll)

		return window.removeEventListener('scroll', setScroll)
	}, [])

	const handleClick = (name: string) => {
		if (sortDirection === 0 || name !== columnToSort) {
			setColumnToSort(name)
			setDirection(1)
		} else if (sortDirection === 1) {
			setDirection(-1)
		} else {
			setDirection(1)
		}
	}

	const sortedData = React.useMemo(() => {
		if (sortDirection && columnToSort) {
			const values = splitArrayByFalsyValues(data, columnToSort)
			if (sortDirection === 1) {
				return orderBy(values[0], [columnToSort], ['desc']).concat(values[1])
			} else return orderBy(values[0], [columnToSort], ['asc']).concat(values[1])
		} else return data
	}, [data, sortDirection, columnToSort])

	const style = {
		'--text-align': align || 'end',
		'--gap': gap || '24px'
	} as React.CSSProperties

	const initialData = sortedData.slice(0, lastIndex)

	return (
		<Wrapper style={style} {...props}>
			<InfiniteScroll
				dataLength={initialData.length}
				next={() => setLastIndex((prev) => prev + 10)}
				hasMore={initialData.length < sortedData.length}
				loader={<span style={{ marginLeft: '22px' }}>...</span>}
			>
				<TableWrapper>
					<thead>
						<RowWrapper>
							{columns.map((col) => {
								const disableSortBy = col.disableSortBy || false
								const sortingColumn = columnToSort === col.accessor && sortDirection !== 0

								const header = disableSortBy ? (
									col.header
								) : (
									<HeaderButton onClick={() => handleClick(col.accessor)}>{col.header}</HeaderButton>
								)
								const text = col.helperText ? (
									<HeaderWithHelperText>
										<span>{header}</span>
										<QuestionHelper text={col.helperText} />
									</HeaderWithHelperText>
								) : (
									header
								)

								return (
									<Header key={uuid()}>
										{!disableSortBy ? (
											<SortedHeader>
												{text} {sortingColumn && (sortDirection === -1 ? <ArrowUp /> : <ArrowDown />)}
											</SortedHeader>
										) : (
											text
										)}
									</Header>
								)
							})}
						</RowWrapper>
					</thead>
					<tbody>
						{pinnedRow && (
							<PinnedRow>
								{columns.map((col) => (
									<Cell key={uuid()}>
										{col.Cell ? (
											<col.Cell value={pinnedRow[col.accessor]} rowValues={pinnedRow} rowType="pinned" />
										) : (
											pinnedRow[col.accessor]
										)}
									</Cell>
								))}
							</PinnedRow>
						)}
						{initialData.map((item, index) => (
							<Row key={uuid()} item={item} index={index} columns={columns} />
						))}
					</tbody>
				</TableWrapper>
			</InfiniteScroll>
			{displayScrollToTopButton && (
				<ScrollToTop onClick={handleScrollToTop}>
					<ChevronsUp />
				</ScrollToTop>
			)}
		</Wrapper>
	)
}

export function FullTable({ columns = [], data = [], align, gap, pinnedRow, ...props }: ITableProps) {
	const [columnToSort, setColumnToSort] = React.useState<string | null>(props.columnToSort || null)
	const [sortDirection, setDirection] = React.useState<-1 | 0 | 1>(props.sortDirection || 0)

	const handleClick = (name: string) => {
		if (sortDirection === 0 || name !== columnToSort) {
			setColumnToSort(name)
			setDirection(1)
		} else if (sortDirection === 1) {
			setDirection(-1)
		} else {
			setDirection(1)
		}
	}

	const sortedData = React.useMemo(() => {
		if (sortDirection && columnToSort) {
			const values = splitArrayByFalsyValues(data, columnToSort)
			if (sortDirection === 1) {
				return orderBy(values[0], [columnToSort], ['desc']).concat(values[1])
			} else return orderBy(values[0], [columnToSort], ['asc']).concat(values[1])
		} else return data
	}, [data, sortDirection, columnToSort])

	const style = {
		'--text-align': align || 'end',
		'--gap': gap || '24px'
	} as React.CSSProperties

	return (
		<Wrapper style={style} {...props}>
			<TableWrapper>
				<thead>
					<RowWrapper>
						{columns.map((col) => {
							const text = col.helperText ? <HeadHelp title={col.header} text={col.helperText} /> : col.header
							const disableSortBy = col.disableSortBy || false
							const sortingColumn = columnToSort === col.accessor && sortDirection !== 0
							return (
								<Header key={uuid()}>
									{!disableSortBy ? (
										<SortedHeader>
											<HeaderButton onClick={() => handleClick(col.accessor)}>{text}</HeaderButton>{' '}
											{sortingColumn && (sortDirection === -1 ? <ArrowUp /> : <ArrowDown />)}
										</SortedHeader>
									) : (
										text
									)}
								</Header>
							)
						})}
					</RowWrapper>
				</thead>
				<tbody>
					{pinnedRow && (
						<PinnedRow>
							{columns.map((col) => (
								<Cell key={uuid()}>
									{col.Cell ? (
										<col.Cell value={pinnedRow[col.accessor]} rowValues={pinnedRow} rowType="pinned" />
									) : (
										pinnedRow[col.accessor]
									)}
								</Cell>
							))}
						</PinnedRow>
					)}
					{sortedData.map((item, index) => (
						<Row key={uuid()} item={item} index={index} columns={columns} />
					))}
				</tbody>
			</TableWrapper>
		</Wrapper>
	)
}

export * from './shared'
export * from './Name'
export * from './Columns'
export * from './utils'

export default Table
