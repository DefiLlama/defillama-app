import React, { useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import { v4 as uuid } from 'uuid'
import Panel from 'components/Panel'
import { ArrowDown, ArrowUp } from 'react-feather'
import HeadHelp from 'components/HeadHelp'
import { CustomLink } from 'components/Link'
import TokenLogo from 'components/TokenLogo'
import Bookmark from 'components/Bookmark'
import { slug, tokenIconUrl } from 'utils'
import { useInfiniteScroll } from 'hooks'
import InfiniteScroll from 'react-infinite-scroll-component'

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

  & > div {
    display: flex;
  }

  svg {
    width: 14px;
    height: 14px;
    position: relative;
    top: 1px;
  }

  & > * {
    justify-content: var(--text-align);
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
`

function Table({ columns = [], data = [], align, gap }) {
  const [columnToSort, setColumnToSort] = useState<string | null>(null)
  const [sortDirection, setDirection] = useState<-1 | 0 | 1>(0)

  const id = useRef(uuid()).current

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
      return data.sort((a, b) => {
        if (sortDirection === 1) {
          return b[columnToSort] - a[columnToSort]
        } else return a[columnToSort] - b[columnToSort]
      })
    } else return data
  }, [data, sortDirection, columnToSort])

  const { LoadMoreButton, dataLength, hasMore, next } = useInfiniteScroll({ list: sortedData, filters: id })

  return (
    <Wrapper style={{ '--text-align': align || 'end', '--gap': gap || '24px' }}>
      <InfiniteScroll dataLength={dataLength} next={next} hasMore={hasMore} loader="...">
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
                      <div>
                        <HeaderButton onClick={() => handleClick(col.accessor)}>{text}</HeaderButton>{' '}
                        {sortingColumn && (sortDirection === -1 ? <ArrowUp /> : <ArrowDown />)}
                      </div>
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

export const chainHelperText = "Chains are ordered by protocol's highest TVL on each chain"

export default Table
