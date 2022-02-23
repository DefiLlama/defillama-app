import React, { useState, useMemo, useEffect } from 'react'
import styled from 'styled-components'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { List as VirtualizedList, AutoSizer, InfiniteLoader, WindowScroller } from 'react-virtualized'

import { Box, Flex, Text } from 'rebass'
import TokenLogo from '../TokenLogo'
import { CustomLink } from '../Link'
import Row from '../Row'
import { Divider } from '..'

import { formattedNum, filterCollectionsByCurrency, chainIconUrl } from '../../utils'
import { useFetchInfiniteScroll } from '../../hooks'
import { useMedia } from 'react-use'

import FormattedName from '../FormattedName'
import ChainsRow from 'components/ChainsRow'
import TokensRow from 'components/TokensRow'

dayjs.extend(utc)

const List = styled(Box)`
  -webkit-overflow-scrolling: touch;
  min-height: 1000px;
`

const DashGrid = styled.div`
  display: grid;
  grid-gap: 1em;
  grid-template-columns: 100px 1fr 1fr;
  grid-template-areas: 'symbol 7dchange vol';
  padding: 0 1.125rem;

  > * {
    justify-content: flex-end;

    &:first-child {
      justify-content: flex-start;
      text-align: left;
      width: 100px;
    }
  }

  @media screen and (min-width: 680px) {
    display: grid;
    grid-gap: 1em;
    grid-template-columns: 180px 1fr 1fr 1fr;
    grid-template-areas: 'name symbol 7dchange vol';

    > * {
      justify-content: flex-end;
      width: 100%;

      &:first-child {
        justify-content: flex-start;
      }
    }
  }

  @media screen and (min-width: 1080px) {
    display: grid;
    grid-gap: 0.5em;
    grid-template-columns: 1fr 1fr 1fr 0.8fr 0.6fr 0.6fr 0.6fr;
    grid-template-areas: 'name chain mcaptvl 1dchange 7dchange tvl';
  }
`

const ListWrapper = styled.div``

const ClickableText = styled(Text)`
  text-align: end;
  &:hover {
    cursor: pointer;
    opacity: 0.6;
  }
  user-select: none;
  color: ${({ theme }) => theme.text1};

  @media screen and (max-width: 640px) {
    font-size: 0.85rem;
  }
`

const DataText = styled(Flex)`
  align-items: center;
  text-align: center;
  color: ${({ theme }) => theme.text1};

  & > * {
    font-size: 14px;
  }

  @media screen and (max-width: 600px) {
    font-size: 12px;
  }
`

const SORT_FIELD = {
  NAME: 'name',
  TOTAL_VOL: 'totalVolume',
  FLOOR: 'floor',
  VOL: 'dailyVolume',
  OWNERS: 'owners',
}

function NFTCollectionList({ collections, itemMax = 100, displayUsd = false }) {
  // sorting
  const [collectionsList, setCollectionsList] = useState([])
  const [cursor, setCursor] = useState(null)
  const [sortDirection, setSortDirection] = useState(true)
  const [sortedColumn, setSortedColumn] = useState('totalVolume')

  const below1080 = useMedia('(max-width: 1080px)')
  const below680 = useMedia('(max-width: 680px)')
  const below600 = useMedia('(max-width: 600px)')

  const displayCurrency = displayUsd ? '$' : '' // TODO show non-USD currency symbols

  useEffect(() => {
    setCollectionsList(collections)
  }, [collections])

  const filteredListByCurrency = useMemo(
    () => filterCollectionsByCurrency(collectionsList, displayUsd),
    [collectionsList, displayUsd]
  )

  const filteredList = useMemo(() => {
    return (
      filteredListByCurrency &&
      filteredListByCurrency.sort((a, b) => {
        if (sortedColumn === SORT_FIELD.NAME) {
          return a[sortedColumn] > b[sortedColumn] ? (sortDirection ? -1 : 1) * 1 : (sortDirection ? -1 : 1) * -1
        }
        return parseFloat(a[sortedColumn] || 0) > parseFloat(b[sortedColumn] || 0)
          ? (sortDirection ? -1 : 1) * 1
          : (sortDirection ? -1 : 1) * -1
      })
    )
  }, [filteredListByCurrency, sortDirection, sortedColumn])

  const ListItem = ({ item, index }) => {
    const marketplaces = item.marketplaces?.length ? item.marketplaces : []
    const chains = item.chains?.length ? item.chains : []

    return (
      <DashGrid style={{ height: '48px' }} focus={true}>
        <DataText area="name" fontWeight="500">
          <Row>
            {!below680 && <div style={{ marginRight: '3rem', width: '10px' }}>{index + 1}</div>}
            <TokenLogo address={item.address} logo={item.logo} external />
            <CustomLink
              style={{ marginLeft: '16px', whiteSpace: 'nowrap', minWidth: '200px' }}
              href={'/nfts/collection/' + item.slug}
            >
              <FormattedName text={`${item.name}`} maxCharacters={below600 ? 8 : 16} adjustSize={true} link={true} />
            </CustomLink>
          </Row>
        </DataText>
        <DataText area="chains">
          <ChainsRow chains={chains} />
        </DataText>
        {!below1080 && (
          <DataText area="marketplaces">
            <TokensRow tokens={marketplaces} />
          </DataText>
        )}
        {!below1080 && (
          <DataText area="dailyVolume">
            {item.dailyVolume <= 0 ? '--' : formattedNum(item.dailyVolume, displayCurrency)}
          </DataText>
        )}
        <DataText area="totalVolume" color="text" fontWeight="500">
          {item.totalVolume <= 0 ? '--' : formattedNum(item.totalVolume, displayCurrency)}
        </DataText>
        {!below1080 && (
          <DataText area="floor">{item.floor === 0 ? '--' : formattedNum(item.floor, displayCurrency)}</DataText>
        )}
        {!below1080 && (
          <DataText area="owners" color="text" fontWeight="500">
            {item.owners === 0 ? '--' : formattedNum(item.owners, false)}
          </DataText>
        )}
      </DashGrid>
    )
  }

  const { LoadMoreButton, dataLength, hasMore, isLoading, next } = useFetchInfiniteScroll({
    list: filteredList,
    cursor: cursor || collections.slice(-1)[0],
    setCursor,
    setFetchedData: setCollectionsList,
  })

  const isRowLoaded = ({ index }) => {
    return !hasMore
  }

  const loadMoreRows = () => {
    if (!isLoading) {
      next()
    }
  }

  const renderRow = ({ index, key, style }) => {
    if (!filteredList[index]) {
      return <></>
    }

    return (
      <div key={key} style={style}>
        <ListItem key={key} index={index} item={filteredList[index]} />
        <Divider />
      </div>
    )
  }

  return (
    <ListWrapper>
      <DashGrid center={true} style={{ height: 'fit-content', padding: '0 1.125rem 1rem 1.125rem' }}>
        <Flex alignItems="center" justifyContent="flexStart">
          <ClickableText
            color="text"
            area="name"
            fontWeight="500"
            onClick={(e) => {
              setSortedColumn(SORT_FIELD.NAME)
              setSortDirection(sortedColumn !== SORT_FIELD.NAME ? true : !sortDirection)
            }}
          >
            Name {sortedColumn === SORT_FIELD.NAME ? (!sortDirection ? '↑' : '↓') : ''}
          </ClickableText>
        </Flex>

        <Flex alignItems="center">
          <ClickableText area="chains" onClick={(e) => {}}>
            Chains
          </ClickableText>
        </Flex>

        {!below1080 && (
          <Flex alignItems="center">
            <ClickableText area="marketplaces" onClick={(e) => {}}>
              Marketplaces
            </ClickableText>
          </Flex>
        )}

        {!below1080 && (
          <Flex alignItems="center">
            <ClickableText
              area="dailyVol"
              onClick={(e) => {
                setSortedColumn(SORT_FIELD.VOL)
                setSortDirection(sortedColumn !== SORT_FIELD.VOL ? true : !sortDirection)
              }}
            >
              Daily Volume {sortedColumn === SORT_FIELD.VOL ? (!sortDirection ? '↑' : '↓') : ''}
            </ClickableText>
          </Flex>
        )}

        <Flex alignItems="center">
          <ClickableText
            area="totalVol"
            onClick={(e) => {
              setSortedColumn(SORT_FIELD.TOTAL_VOL)
              setSortDirection(sortedColumn !== SORT_FIELD.TOTAL_VOL ? true : !sortDirection)
            }}
          >
            Total Volume {sortedColumn === SORT_FIELD.TOTAL_VOL ? (!sortDirection ? '↑' : '↓') : ''}
          </ClickableText>
        </Flex>

        {!below1080 && (
          <Flex alignItems="center">
            <ClickableText
              area="floor"
              onClick={(e) => {
                setSortedColumn(SORT_FIELD.FLOOR)
                setSortDirection(sortedColumn !== SORT_FIELD.FLOOR ? true : !sortDirection)
              }}
            >
              Floor {sortedColumn === SORT_FIELD.FLOOR ? (!sortDirection ? '↑' : '↓') : ''}
            </ClickableText>
          </Flex>
        )}

        {!below1080 && (
          <Flex alignItems="center">
            <ClickableText
              area="owners"
              onClick={(e) => {
                setSortedColumn(SORT_FIELD.OWNERS)
                setSortDirection(sortedColumn !== SORT_FIELD.OWNERS ? true : !sortDirection)
              }}
            >
              Owners {sortedColumn === SORT_FIELD.OWNERS ? (!sortDirection ? '↑' : '↓') : ''}
            </ClickableText>
          </Flex>
        )}
      </DashGrid>
      <Divider />
      <List p={0}>
        <InfiniteLoader
          isRowLoaded={isRowLoaded}
          loadMoreRows={loadMoreRows}
          rowCount={dataLength}
          minimumBatchSize={100}
          threshold={50}
        >
          {({ onRowsRendered, registerChild }) => (
            <WindowScroller>
              {({ height, scrollTop }) => (
                <AutoSizer disableHeight>
                  {({ width }) => (
                    <VirtualizedList
                      onRowsRendered={onRowsRendered}
                      ref={registerChild}
                      width={width}
                      height={height}
                      autoHeight
                      rowHeight={50}
                      rowRenderer={renderRow}
                      rowCount={dataLength}
                      overscanRowCount={25}
                      scrollTop={scrollTop}
                    />
                  )}
                </AutoSizer>
              )}
            </WindowScroller>
          )}
        </InfiniteLoader>
      </List>
      {LoadMoreButton}
    </ListWrapper>
  )
}

export default NFTCollectionList
