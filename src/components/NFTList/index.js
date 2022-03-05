import React, { useState, useMemo } from 'react'
import { useMedia } from 'react-use'
import { Box, Flex, Text } from 'rebass'
import styled from 'styled-components'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import InfiniteScroll from 'react-infinite-scroll-component'

import TokenLogo from '../TokenLogo'
import ChainsRow from '../ChainsRow'
import TokensRow from '../TokensRow'
import { BasicLink, CustomLink } from '../Link'
import Row from '../Row'
import { Divider } from '..'

import { formattedNum, tokenIconUrl } from '../../utils'
import { useInfiniteScroll } from '../../hooks'

import FormattedName from '../FormattedName'

dayjs.extend(utc)

const List = styled(Box)`
  -webkit-overflow-scrolling: touch;
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
    grid-template-columns: 1fr 1fr 0.8fr 0.6fr 0.6fr 0.6fr;
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
  NAME: 'displayName',
  COLLECTIONS: 'collections',
  VOL: 'dailyVolumeUSD',
  TOTAL_VOL: 'totalVolumeUSD',
}

// @TODO rework into virtualized list
// @TODO generalize to merge with NFTCollectionList
function NFTList({
  data,
  filters,
  iconUrl,
  generateLink = () => '',
  columns = [],
  defaultSortingColumn = 'totalVolume',
  type = 'chains',
}) {
  // sorting
  const [sortDirection, setSortDirection] = useState(true)
  const [sortedColumn, setSortedColumn] = useState('totalVolumeUSD')

  const below1080 = useMedia('(max-width: 1080px)')
  const below680 = useMedia('(max-width: 680px)')
  const below600 = useMedia('(max-width: 600px)')

  const filteredList = useMemo(() => {
    return (
      data &&
      data.sort((a, b) => {
        if (sortedColumn === SORT_FIELD.NAME) {
          return a[sortedColumn] > b[sortedColumn] ? (sortDirection ? -1 : 1) * 1 : (sortDirection ? -1 : 1) * -1
        }
        return parseFloat(a[sortedColumn] || 0) > parseFloat(b[sortedColumn] || 0)
          ? (sortDirection ? -1 : 1) * 1
          : (sortDirection ? -1 : 1) * -1
      })
    )
  }, [data, sortDirection, sortedColumn])

  const ListItem = ({ item, index }) => {
    const marketplaces = item.marketplaces?.length && item.marketplaces
    const chains = item.chains?.length && item.chains

    return (
      <DashGrid style={{ height: '48px' }} focus={true}>
        <DataText area="name" fontWeight="500">
          <Row>
            {!below680 && <div style={{ marginRight: '1rem', width: '10px' }}>{index + 1}</div>}
            <TokenLogo logo={iconUrl(type === 'chains' ? item.chain : item.marketplace)} />
            <CustomLink
              style={{ marginLeft: '16px', whiteSpace: 'nowrap', minWidth: '200px' }}
              href={type === 'chains' ? '/nfts/chain/' + item.chain : '/nfts/marketplace/' + item.marketplace}
            >
              <FormattedName text={item.displayName} maxCharacters={below600 ? 8 : 16} adjustSize={true} link={true} />
            </CustomLink>
          </Row>
        </DataText>
        {marketplaces && <TokensRow tokens={marketplaces} />}
        {chains && <ChainsRow chains={chains} />}
        {!below680 && <DataText area="collections">{item.collections}</DataText>}
        {!below1080 && <DataText area="dailyVolume">{formattedNum(item.dailyVolumeUSD, true)}</DataText>}
        <DataText area="totalVolume" color="text" fontWeight="500">
          {formattedNum(item.totalVolumeUSD, true)}
        </DataText>
      </DashGrid>
    )
  }

  const { LoadMoreButton, dataLength, hasMore, next } = useInfiniteScroll({ list: filteredList })

  return (
    <ListWrapper>
      <DashGrid center={true} style={{ height: 'fit-content', padding: '0 1.125rem 1rem 1.125rem' }}>
        <Flex alignItems="center" justifyContent="flexStart">
          <ClickableText
            color="text"
            area="chain"
            fontWeight="500"
            onClick={(e) => {
              setSortedColumn(SORT_FIELD.NAME)
              setSortDirection(sortedColumn !== SORT_FIELD.NAME ? true : !sortDirection)
            }}
          >
            Name {sortedColumn === SORT_FIELD.NAME ? (!sortDirection ? '↑' : '↓') : ''}
          </ClickableText>
        </Flex>
        {!below680 && (
          <Flex alignItems="center">
            <ClickableText area="collections">{type === 'chains' ? 'Marketplaces' : 'Chains'} </ClickableText>
          </Flex>
        )}
        {!below680 && (
          <Flex alignItems="center">
            <ClickableText
              area="collections"
              onClick={(e) => {
                setSortedColumn(SORT_FIELD.COLLECTIONS)
                setSortDirection(sortedColumn !== SORT_FIELD.COLLECTIONS ? true : !sortDirection)
              }}
            >
              Collections {sortedColumn === SORT_FIELD.COLLECTIONS ? (!sortDirection ? '↑' : '↓') : ''}
            </ClickableText>
          </Flex>
        )}
        {!below1080 && (
          <Flex alignItems="center">
            <ClickableText
              area="dailyVolume"
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
            area="totalVolume"
            onClick={(e) => {
              setSortedColumn(SORT_FIELD.TOTAL_VOL)
              setSortDirection(sortedColumn !== SORT_FIELD.TOTAL_VOL ? true : !sortDirection)
            }}
          >
            Total Volume {sortedColumn === SORT_FIELD.FLOOR ? (!sortDirection ? '↑' : '↓') : ''}
          </ClickableText>
        </Flex>
      </DashGrid>
      <Divider />
      <List p={0}>
        <InfiniteScroll dataLength={dataLength} next={next} hasMore={hasMore}>
          {filteredList &&
            filteredList.map((item, index) => {
              return (
                <div key={index}>
                  <ListItem key={index} index={index} item={item} />
                  <Divider />
                </div>
              )
            })}
        </InfiniteScroll>
      </List>
      {LoadMoreButton}
    </ListWrapper>
  )
}

export default NFTList
