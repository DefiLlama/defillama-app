import React, { useMemo, useState } from 'react'
import styled from 'styled-components'
import { v4 as uuid } from 'uuid'
import Panel from 'components/Panel'
import { ArrowDown, ArrowUp } from 'react-feather'
import HeadHelp from 'components/HeadHelp'
import { CustomLink } from 'components/Link'
import TokenLogo from 'components/TokenLogo'
import Bookmark from 'components/Bookmark'
import { formattedNum, formattedPercent, slug, toK, tokenIconUrl } from 'utils'
import { useInfiniteScroll } from 'hooks'
import InfiniteScroll from 'react-infinite-scroll-component'
import orderBy from 'lodash.orderby'
import ChainsRow from 'components/ChainsRow'

const Wrapper = styled(Panel)`
  padding-top: 6px;
  color: ${({ theme }) => theme.text1};
  overflow-x: auto;
`

const TableWrapper = styled.table`
  border-collapse: collapse;
  border-spacing: 0;
  width: 100%;
  position: relative;
`

const Row = styled.tr`
  border-bottom: 1px solid;
  border-color: ${({ theme }) => theme.divider};

  & > * {
    padding: 12px 0;
    padding-left: var(--gap);
    text-align: var(--text-align);
  }

  & > :first-child {
    white-space: nowrap;
    text-align: start;
    padding-left: 6px;
  }
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

function splitArrayByFalsyValues(data, column) {
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

function Table({ columns = [], data = [], align, gap, ...props }) {
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
        loader={hasMore && <span style={{ marginLeft: '8px' }}>...</span>}
      >
        <TableWrapper>
          <thead>
            <Row>
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
            </Row>
          </thead>
          <tbody>
            {sortedData.slice(0, dataLength).map((item, index) => (
              <Row key={uuid()}>
                {columns.map((col) => (
                  <Cell key={uuid()}>
                    {col.Cell ? (
                      <col.Cell value={item[col.accessor]} rowValues={item} rowIndex={index} />
                    ) : (
                      item[col.accessor]
                    )}
                  </Cell>
                ))}
              </Row>
            ))}
          </tbody>
        </TableWrapper>
      </InfiniteScroll>
      {LoadMoreButton}
    </Wrapper>
  )
}

interface ProtocolNameProps {
  value: string
  symbol?: string
  index?: number
  bookmark?: boolean
}

export function ProtocolName({ value, symbol = '', index, bookmark }: ProtocolNameProps) {
  const name = symbol === '-' ? value : `${value} (${symbol})`
  return (
    <Index>
      {bookmark && <SaveButton readableProtocolName={value} />}
      {index && <span>{index}</span>}
      <TokenLogo logo={tokenIconUrl(value)} />
      <CustomLink href={`/protocol/${slug(value)}`}>{name}</CustomLink>
    </Index>
  )
}

// TODO update to better type defs
interface IColumns {
  protocolName: {}
  chains: {}
  '1dChange': {}
  '7dChange': {}
  '1mChange': {}
  tvl: {}
  mcaptvl: {}
  listedAt: {}
  msizetvl: {}
}

const allColumns: IColumns = {
  protocolName: {
    header: 'Name',
    accessor: 'name',
    disableSortBy: true,
    Cell: ({ value, rowValues, rowIndex }) => (
      <ProtocolName value={value} symbol={rowValues.symbol} index={rowIndex + 1} bookmark />
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
}

type columnsName = keyof IColumns

export function columnsToShow(...names: columnsName[]) {
  return names.map((item) => allColumns[item])
}

export default Table
