import React, { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { v4 as uuid } from 'uuid'
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, ChevronsUp } from 'react-feather'
import HeadHelp from 'components/HeadHelp'
import { CustomLink } from 'components/Link'
import TokenLogo from 'components/TokenLogo'
import Bookmark from 'components/Bookmark'
import { chainIconUrl, peggedAssetIconUrl, formattedNum, formattedPercent, slug, tokenIconUrl } from 'utils'
import InfiniteScroll from 'react-infinite-scroll-component'
import orderBy from 'lodash.orderby'
import IconsRow from 'components/IconsRow'
import QuestionHelper from 'components/QuestionHelper'
import { AutoRow } from 'components/Row'
export { TableFilters } from './Filters'

interface ColumnProps {
  header: string
  accessor: string
  disableSortBy?: boolean
  helperText?: string
  Cell?: any
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

  & > *:not(:first-child),
  & > *:not(:first-child) > * {
    margin-left: auto;
    text-align: right;
  }

  td:not(:first-child),
  td:not(:first-child) > * {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipses;
  }
`

const PinnedRow = styled(RowWrapper)`
  background: ${({ theme }) => theme.bg1};
`

const Cell = styled.td`
  font-size: 14px;
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

export const Index = styled.div`
  display: flex;
  gap: 1em;
  align-items: center;
  position: relative;

  svg {
    flex-shrink: 0;
  }

  & > a,
  & > #table-p-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`

const SaveButton = styled(Bookmark)`
  position: relative;
  top: 2px;
  cursor: pointer;
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
  display: flex;
  justify-content: flex-end;

  &:hover {
    opacity: 0.6;
  }

  :focus-visible {
    outline: ${({ theme }) => '1px solid ' + theme.text4};
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
    cursor: pointer;
  }

  @media (min-width: ${({ theme: { bpLg } }) => bpLg}) {
    left: 159px;
    bottom: 10px;
  }
`

const HeaderWithHelperText = styled.span`
  svg {
    color: ${({ theme }) => theme.text1};
  }
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
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

const handleScrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}

function Table({ columns = [], data = [], align, gap, pinnedRow, ...props }: TableProps) {
  const [lastIndex, setLastIndex] = useState(20)
  const [columnToSort, setColumnToSort] = useState<string | null>(null)
  const [sortDirection, setDirection] = useState<-1 | 0 | 1>(0)

  const [displayScrollToTopButton, setDisplayScrollToTopButton] = useState(false)

  useEffect(() => {
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

  const sortedData = useMemo(() => {
    if (sortDirection && columnToSort) {
      const values = splitArrayByFalsyValues(data, columnToSort)
      if (sortDirection === 1) {
        return orderBy(values[0], [columnToSort], ['desc']).concat(values[1])
      } else return orderBy(values[0], [columnToSort], ['asc']).concat(values[1])
    } else return data
  }, [data, sortDirection, columnToSort])

  const style = {
    '--text-align': align || 'end',
    '--gap': gap || '24px',
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
                    {header}
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

  const style = { '--text-align': align || 'end', '--gap': gap || '24px' } as React.CSSProperties

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

interface NameProps {
  type: 'chain' | 'protocol' | 'peggedAsset' | 'peggedAssetChain'
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
  symbol = '-',
  index,
  bookmark,
  rowType = 'default',
  showRows,
  ...props
}: NameProps) {
  const name =
    symbol === '-' ? (
      value
    ) : (
      <>
        <span>{value}</span>
        <span id="table-p-symbol">{` (${symbol})`}</span>
      </>
    )
  const { iconUrl, tokenUrl } = useMemo(() => {
    let iconUrl, tokenUrl
    if (type === 'chain') {
      tokenUrl = `/${type}/${value}`
      iconUrl = chainIconUrl(value)
    } else if (type === 'peggedAssetChain' && !value.includes('Bridged from')) {
      tokenUrl = `/peggedassets/stablecoins/${value}`
      iconUrl = chainIconUrl(value)
    } else if (type === 'peggedAsset') {
      tokenUrl = `/peggedasset/${slug(value)}`
      iconUrl = peggedAssetIconUrl(value)
    } else {
      tokenUrl = `/${type}/${slug(value)}`
      iconUrl = tokenIconUrl(value)
    }

    return { iconUrl, tokenUrl }
  }, [type, value])

  let leftSpace: number | string = 0

  if (rowType === 'accordion') {
    leftSpace = bookmark ? '0px' : '-30px'
  }

  if (rowType === 'child') {
    leftSpace = '30px'
  }

  if (value.includes('Bridged from')) {
    return (
      <Index {...props} style={{ left: leftSpace }}>
        <span>-</span>
        <span id="table-p-name">{value}</span>
      </Index>
    )
  }

  return (
    <Index {...props} style={{ left: leftSpace }}>
      {rowType !== 'accordion' && bookmark && (
        <SaveButton readableProtocolName={value} style={{ paddingRight: rowType === 'pinned' ? '1ch' : 0 }} />
      )}
      {rowType === 'accordion' && (showRows ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
      <span>{rowType !== 'pinned' && index}</span>
      <TokenLogo id="table-p-logo" logo={iconUrl} />
      {rowType === 'accordion' ? (
        <span id="table-p-name">{name}</span>
      ) : (
        <CustomLink href={tokenUrl} id="table-p-name">
          {name}
        </CustomLink>
      )}
    </Index>
  )
}

export function NameYield({ value, rowType, ...props }: NameProps) {
  const { iconUrl, tokenUrl } = useMemo(() => {
    return { iconUrl: tokenIconUrl(value['project']), tokenUrl: `/yields/project/${value['projectslug']}` }
  }, [value])

  return (
    <Index {...props}>
      <TokenLogo id="table-p-logo" logo={iconUrl} />
      {rowType === 'accordion' ? (
        <span id="table-p-name">{value['project']}</span>
      ) : (
        <CustomLink id="table-p-name" href={tokenUrl}>
          {value['project']}
        </CustomLink>
      )}
    </Index>
  )
}

interface NameYieldPoolProps {
  value: string
  poolId: string
  project: string
  index?: number
  bookmark?: boolean
  rowType?: 'pinned' | 'default'
}

export function NameYieldPool({
  value,
  poolId,
  project,
  index,
  bookmark,
  rowType = 'default',
  ...props
}: NameYieldPoolProps) {
  const tokenUrl = `/yields/pool/${poolId}`

  let leftSpace: number | string = 0

  return (
    <Index {...props} style={{ left: leftSpace }}>
      {bookmark && (
        <SaveButton readableProtocolName={poolId} style={{ paddingRight: rowType === 'pinned' ? '1ch' : 0 }} />
      )}
      <span>{rowType !== 'pinned' && index}</span>
      <CustomLink href={tokenUrl}>
        {project === 'Osmosis' ? `${value} ${poolId.split('-').slice(-1)}` : value}
      </CustomLink>
    </Index>
  )
}

type PeggedCategories = 'stablecoins' | 'peggedUSD'

export function isOfTypePeggedCategory(peggedCategory: string): peggedCategory is PeggedCategories {
  return ['stablecoins', 'peggedUSD'].includes(peggedCategory)
}

type Columns =
  | 'protocolName'
  | 'peggedAsset'
  | 'peggedAssetChain'
  | 'category'
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
  peggedAsset: {
    header: 'Name',
    accessor: 'name',
    disableSortBy: true,
    Cell: ({ value, rowValues, rowIndex = null, rowType }) => (
      <Name
        type="peggedAsset"
        value={value}
        symbol={rowValues.symbol}
        index={rowIndex !== null && rowIndex + 1}
        rowType={rowType}
      />
    ),
  },
  peggedAssetChain: {
    header: 'Name',
    accessor: 'name',
    disableSortBy: true,
    Cell: ({ value, rowValues, rowIndex = null, rowType }) => (
      <Name
        type="peggedAssetChain"
        value={value}
        symbol={rowValues.symbol}
        index={rowIndex !== null && rowIndex + 1}
        rowType={rowType}
      />
    ),
  },
  category: {
    header: 'Category',
    accessor: 'category',
    Cell: ({ value }) => <span>{value}</span>,
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
    Cell: ({ value }) => <IconsRow links={value} url="/chain" iconType="chain" />,
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
    Cell: ({ value, rowValues }) => {
      return (
        <AutoRow sx={{ width: '100%', justifyContent: 'flex-end', gap: '4px' }}>
          {rowValues.strikeTvl ? (
            <QuestionHelper text='This protocol deposits into another protocol and is subtracted from total TVL because "Double Count" toggle is off' />
          ) : null}
          <span
            style={{
              color: rowValues.strikeTvl ? 'gray' : 'inherit',
            }}
          >
            {'$' + formattedNum(value)}
          </span>
        </AutoRow>
      )
    },
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
