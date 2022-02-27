import React, { useMemo, useState } from 'react'
import styled from 'styled-components'
import { v4 as uuid } from 'uuid'
import Panel from 'components/Panel'
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight } from 'react-feather'
import HeadHelp from 'components/HeadHelp'
import { CustomLink } from 'components/Link'
import TokenLogo from 'components/TokenLogo'
import Bookmark from 'components/Bookmark'
import { chainIconUrl, formattedNum, formattedPercent, slug, toK, tokenIconUrl } from 'utils'
import { useInfiniteScroll } from 'hooks'
import InfiniteScroll from 'react-infinite-scroll-component'
import orderBy from 'lodash.orderby'
import ChainsRow from 'components/ChainsRow'

interface ColumnProps {
  header: string
  accessor: string
  disableSortBy?: boolean
  helperText?: string
  Cell?: React.ElementType
}

interface RowProps {
  columns: ColumnProps[]
  item: { [key: string]: any }
  index?: number
  subRow?: boolean
}

interface TableProps {
  columns: ColumnProps[]
  data: unknown
  align?: string
  gap?: string
  pinnedRow?: unknown
}

const Wrapper = styled(Panel)`
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

const RowWrapper = styled.tr`
  border-bottom: 1px solid;
  border-color: ${({ theme }) => theme.divider};
  --padding-left: 20px;

  & > * {
    padding: 12px 0;
    padding-left: var(--gap);
    text-align: var(--text-align);
  }

  & > :first-child {
    white-space: nowrap;
    text-align: start;
    padding-left: var(--padding-left);
  }

  & > :last-child {
    padding-right: 20px;
  }
`

const PinnedRow = styled(RowWrapper)`
  background: ${({ theme }) => theme.bg1};
`

const Cell = styled.td`
  font-size: 14px;
`

const Header = styled.th`
  font-weight: 400;
  white-space: nowrap;

  svg {
    width: 14px;
    height: 14px;
  }

  & > * {
    justify-content: var(--text-align);
  }
`

const SortedHeader = styled.div`
  display: flex;
  gap: 4px;
  white-space: nowrap;

  & > svg {
    position: relative;
    top: 1px;
  }
`

export const Index = styled.div`
  display: flex;
  gap: 1em;
  align-items: center;
  min-width: 280px;
  position: relative;
`

const SaveButton = styled(Bookmark)`
  position: relative;
  top: 2px;
  cursor: pointer;
  width: 16px;
  height: 16px;
`

const HeaderButton = styled.button`
  cursor: pointer;
  width: 100%;
  height: 100%;
  color: inherit;
  background: none;
  border: none;
  text-align: inherit;
  padding: 0;
  font-size: inherit;
  font-weight: 500;

  &:hover {
    opacity: 0.6;
  }
`

export function splitArrayByFalsyValues(data, column) {
  return data.reduce(
    (acc, curr) => {
      if (!curr[column] && curr[column] !== 0) {
        acc[1].push(curr)
      } else acc[0].push(curr)
      return acc
    },
    [[], []]
  )
}

function Row(props: RowProps) {
  const { columns, item, index } = props

  return (
    <>
      {item.subRows ? (
        <RowWithExtras {...props} />
      ) : (
        <RowWrapper>
          {columns.map((col) => (
            <Cell key={uuid()}>
              {col.Cell ? (
                <col.Cell value={item[col.accessor]} rowValues={item} rowIndex={index} />
              ) : (
                item[col.accessor]
              )}
            </Cell>
          ))}
        </RowWrapper>
      )}
    </>
  )
}

function RowWithExtras({ columns, item, index }: RowProps) {
  const [displayRows, setDisplay] = useState(false)

  return (
    <>
      <RowWrapper style={{ cursor: 'pointer' }} onClick={() => setDisplay(!displayRows)}>
        {columns.map((col) => (
          <Cell key={uuid()}>
            {col.Cell ? (
              <col.Cell
                value={item[col.accessor]}
                rowValues={item}
                rowIndex={index}
                rowType="accordion"
                showRows={displayRows}
              />
            ) : (
              item[col.accessor]
            )}
          </Cell>
        ))}
      </RowWrapper>
      {displayRows &&
        item.subRows.map((subRow) => (
          <RowWrapper key={uuid()}>
            {columns.map((col) => (
              <Cell key={uuid()}>
                {col.Cell ? (
                  <col.Cell value={subRow[col.accessor]} rowValues={subRow} rowType="child" />
                ) : (
                  subRow[col.accessor]
                )}
              </Cell>
            ))}
          </RowWrapper>
        ))}
    </>
  )
}

function Table({ columns = [], data = [], align, gap, pinnedRow, ...props }: TableProps) {
  const [columnToSort, setColumnToSort] = useState<string | null>(null)
  const [sortDirection, setDirection] = useState<-1 | 0 | 1>(0)

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

  const sortedData = useMemo(() => {
    if (sortDirection && columnToSort) {
      const values = splitArrayByFalsyValues(data, columnToSort)
      if (sortDirection === 1) {
        return orderBy(values[0], [columnToSort], ['desc']).concat(values[1])
      } else return orderBy(values[0], [columnToSort], ['asc']).concat(values[1])
    } else return data
  }, [data, sortDirection, columnToSort])

  const { LoadMoreButton, dataLength, hasMore, next } = useInfiniteScroll({ list: sortedData })

  return (
    <Wrapper style={{ '--text-align': align || 'end', '--gap': gap || '24px' }} {...props}>
      <InfiniteScroll
        dataLength={dataLength}
        next={next}
        hasMore={hasMore}
        loader={hasMore && <span style={{ marginLeft: '22px' }}>...</span>}
      >
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
            {sortedData.slice(0, dataLength).map((item, index) => (
              <Row key={uuid()} item={item} index={index} columns={columns} />
            ))}
          </tbody>
        </TableWrapper>
      </InfiniteScroll>
      {LoadMoreButton}
    </Wrapper>
  )
}

export function FullTable({ columns = [], data = [], align, gap, pinnedRow, ...props }: TableProps) {
  const [columnToSort, setColumnToSort] = useState<string | null>(null)
  const [sortDirection, setDirection] = useState<-1 | 0 | 1>(0)

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

  const sortedData = useMemo(() => {
    if (sortDirection && columnToSort) {
      const values = splitArrayByFalsyValues(data, columnToSort)
      if (sortDirection === 1) {
        return orderBy(values[0], [columnToSort], ['desc']).concat(values[1])
      } else return orderBy(values[0], [columnToSort], ['asc']).concat(values[1])
    } else return data
  }, [data, sortDirection, columnToSort])

  return (
    <Wrapper style={{ '--text-align': align || 'end', '--gap': gap || '24px' }} {...props}>
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

interface NameProps {
  type: 'chain' | 'protocol'
  value: string
  symbol?: string
  index?: number
  bookmark?: boolean
  rowType?: 'pinned' | 'accordion' | 'child' | 'default'
  showRows?: boolean
}

export function Name({
  type,
  value,
  symbol = '',
  index,
  bookmark,
  rowType = 'default',
  showRows,
  ...props
}: NameProps) {
  const name = symbol === '-' ? value : `${value} (${symbol})`

  const { iconUrl, tokenUrl } = useMemo(() => {
    let iconUrl, tokenUrl
    if (type === 'chain') {
      tokenUrl = `/${type}/${value}`
      iconUrl = chainIconUrl(value)
    } else {
      tokenUrl = `/${type}/${slug(value)}`
      iconUrl = tokenIconUrl(value)
    }
    return { iconUrl, tokenUrl }
  }, [type, value])

  let leftSpace: number | string = 0

  if (rowType === 'accordion') {
    leftSpace = '-30px'
  }

  if (rowType === 'child') {
    leftSpace = '30px'
  }

  return (
    <Index {...props} style={{ left: leftSpace }}>
      {bookmark && (
        <SaveButton readableProtocolName={value} style={{ paddingRight: rowType === 'pinned' ? '22px' : 0 }} />
      )}
      {rowType === 'accordion' && (showRows ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
      {rowType !== 'pinned' && index && <span>{index}</span>}
      <TokenLogo logo={iconUrl} />
      {rowType === 'accordion' ? <span>{name}</span> : <CustomLink href={tokenUrl}>{name}</CustomLink>}
    </Index>
  )
}

type Columns =
  | 'protocolName'
  | 'chainName'
  | 'chains'
  | '1dChange'
  | '7dChange'
  | '1mChange'
  | 'tvl'
  | 'mcaptvl'
  | 'listedAt'
  | 'msizetvl'
  | 'protocols'

type AllColumns = Record<Columns, ColumnProps>

const allColumns: AllColumns = {
  protocolName: {
    header: 'Name',
    accessor: 'name',
    disableSortBy: true,
    Cell: ({ value, rowValues, rowIndex = null, rowType }) => (
      <Name
        type="protocol"
        value={value}
        symbol={rowValues.symbol}
        index={rowIndex !== null && rowIndex + 1}
        bookmark
        rowType={rowType}
      />
    ),
  },
  chainName: {
    header: 'Name',
    accessor: 'name',
    disableSortBy: true,
    Cell: ({ value, rowValues, rowIndex = null, rowType, showRows }) => (
      <Name
        type="chain"
        value={value}
        symbol={rowValues.symbol}
        index={rowType === 'child' ? '-' : rowIndex !== null && rowIndex + 1}
        rowType={rowType}
        showRows={showRows}
      />
    ),
  },
  chains: {
    header: 'Chains',
    accessor: 'chains',
    disableSortBy: true,
    helperText: "Chains are ordered by protocol's highest TVL on each chain",
    Cell: ({ value }) => <ChainsRow chains={value} />,
  },
  '1dChange': {
    header: '1d Change',
    accessor: 'change_1d',
    Cell: ({ value }) => <>{formattedPercent(value)}</>,
  },
  '7dChange': {
    header: '7d Change',
    accessor: 'change_7d',
    Cell: ({ value }) => <>{formattedPercent(value)}</>,
  },
  '1mChange': {
    header: '1m Change',
    accessor: 'change_1m',
    Cell: ({ value }) => <>{formattedPercent(value)}</>,
  },
  tvl: {
    header: 'TVL',
    accessor: 'tvl',
    Cell: ({ value }) => <span>{'$' + toK(value)}</span>,
  },
  mcaptvl: {
    header: 'Mcap/TVL',
    accessor: 'mcaptvl',
    Cell: ({ value }) => <>{value && formattedNum(value)}</>,
  },
  msizetvl: {
    header: 'Msize/TVL',
    accessor: 'msizetvl',
    Cell: ({ value }) => <>{value && formattedNum(value)}</>,
  },
  listedAt: {
    header: 'Listed',
    accessor: 'listedAt',
    Cell: ({ value }) => <span style={{ whiteSpace: 'nowrap' }}>{value} days ago</span>,
  },
  protocols: {
    header: 'Protocols',
    accessor: 'protocols',
  },
}

export function columnsToShow(...names: Columns[]) {
  return names.map((item) => allColumns[item])
}

export default Table
