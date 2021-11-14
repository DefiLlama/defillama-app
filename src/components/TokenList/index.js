import React, { useState, useMemo } from 'react'
import styled from 'styled-components'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import InfiniteScroll from 'react-infinite-scroll-component'

import { Box, Flex, Text } from 'rebass'
import TokenLogo from '../TokenLogo'
import { CustomLink, BasicLink } from '../Link'
import Row from '../Row'
import { Divider } from '..'

import { formattedNum, formattedPercent, chainIconUrl, tokenIconUrl } from '../../utils'
import { useInfiniteScroll } from '../../hooks'
import { useMedia } from 'react-use'
import { withRouter } from 'react-router-dom'
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
  TVL: 'tvl',
  VOL: 'oneDayVolumeUSD',
  SYMBOL: 'symbol',
  NAME: 'name',
  PRICE: 'priceUSD',
  HOURONE: 'change_1h',
  DAYONE: 'change_1d',
  DAYSEVEN: 'change_7d',
  CHANGE: 'priceChangeUSD',
  MCAPTVL: "mcaptvl",
  FDVTVL: "fdvtvl",
  CHAINS: 'chains'
}


// @TODO rework into virtualized list
function TokenList({ tokens, filters }) {

  const below1080 = useMedia('(max-width: 1080px)')
  const below680 = useMedia('(max-width: 680px)')
  const below600 = useMedia('(max-width: 600px)')

  // sorting
  const [sortDirection, setSortDirection] = useState(true)
  const [sortedColumn, setSortedColumn] = useState(SORT_FIELD.TVL)

  const filteredList = useMemo(() => {
    if (!tokens || !tokens.length) {
      return tokens
    }
    let sortedTokens = tokens
    if (sortedColumn !== SORT_FIELD.TVL || sortDirection !== true || tokens[0].tvl === 0) {
      sortedTokens = tokens
        .sort((a, b) => {
          if (sortedColumn === SORT_FIELD.CHAINS) {
            return a[sortedColumn].length > b[sortedColumn].length ? (sortDirection ? -1 : 1) * 1 : (sortDirection ? -1 : 1) * -1
          }
          if (sortedColumn === SORT_FIELD.SYMBOL || sortedColumn === SORT_FIELD.NAME) {
            return a[sortedColumn] > b[sortedColumn] ? (sortDirection ? -1 : 1) * 1 : (sortDirection ? -1 : 1) * -1
          }
          return parseFloat(a[sortedColumn] || 0) > parseFloat(b[sortedColumn] || 0)
            ? (sortDirection ? -1 : 1) * 1
            : (sortDirection ? -1 : 1) * -1
        })
    }
    return sortedTokens
  }, [tokens, sortDirection, sortedColumn])

  const { LoadMoreButton,
    dataLength,
    hasMore,
    next } = useInfiniteScroll({ list: filteredList, filters });


  const ListItem = ({ item, index }) => {
    return (
      <DashGrid style={{ height: '48px' }} focus={true}>
        <DataText area="name" fontWeight="500">
          <Row>
            {!below680 && <div style={{ marginRight: '1rem', width: '10px' }}>{index + 1}</div>}
            <TokenLogo logo={tokenIconUrl(item)} />
            <CustomLink
              style={{ marginLeft: '16px', whiteSpace: 'nowrap', minWidth: '200px' }}
              href={'/protocol/' + item.name?.toLowerCase().split(' ').join('-')}
            >
              <a><FormattedName
                text={`${item.name} (${item.symbol})`}
                maxCharacters={below600 ? 8 : 16}
                adjustSize={true}
                link={true}
              /></a>
            </CustomLink>
          </Row>
        </DataText>
        {!below1080 && (
          <DataText area="chain">{item.chains.map(chain => <BasicLink key={chain} href={`/chain/${chain}`}><a><TokenLogo address={chain} logo={chainIconUrl(chain)} /></a></BasicLink>)}</DataText>
        )}
        {
          !below1080 && (
            <DataText area="1dchange" color="text" fontWeight="500">
              {formattedPercent(item.change_1d, true)}
            </DataText>
          )
        }
        <DataText area="7dchange">{item.change_7d !== 0 ? formattedPercent(item.change_7d, true) : '-'}</DataText>
        <DataText area="tvl">{formattedNum(item.tvl, true)}</DataText>
        {
          !below680 && (
            <DataText area="mcaptvl" color="text" fontWeight="500">
              {item.mcaptvl === null || item.mcaptvl === undefined ? '-' : formattedNum(item.mcaptvl, false)}
            </DataText>
          )
        }
      </DashGrid >
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
            onClick={e => {
              setSortedColumn(SORT_FIELD.NAME)
              setSortDirection(sortedColumn !== SORT_FIELD.NAME ? true : !sortDirection)
            }}
          >
            {below680 ? 'Symbol' : 'Name'} {sortedColumn === SORT_FIELD.NAME ? (!sortDirection ? '↑' : '↓') : ''}
          </ClickableText>
        </Flex>
        {!below1080 && (
          <Flex alignItems="center">
            <ClickableText
              area="chain"
              onClick={e => {
                setSortedColumn(SORT_FIELD.CHAINS)
                setSortDirection(sortedColumn !== SORT_FIELD.CHAINS ? true : !sortDirection)
              }}
            >
              Chain {sortedColumn === SORT_FIELD.CHAINS ? (!sortDirection ? '↑' : '↓') : ''}
            </ClickableText>
          </Flex>
        )}
        {!below1080 && (
          <Flex alignItems="center">
            <ClickableText
              area="1dchange"
              onClick={e => {
                setSortedColumn(SORT_FIELD.DAYONE)
                setSortDirection(sortedColumn !== SORT_FIELD.DAYONE ? true : !sortDirection)
              }}
            >
              1d Change {sortedColumn === SORT_FIELD.DAYONE ? (!sortDirection ? '↑' : '↓') : ''}
            </ClickableText>
          </Flex>
        )}
        <Flex alignItems="center">
          <ClickableText
            area="7dchange"
            onClick={e => {
              setSortedColumn(SORT_FIELD.DAYSEVEN)
              setSortDirection(sortedColumn !== SORT_FIELD.DAYSEVEN ? true : !sortDirection)
            }}
          >
            7d Change {sortedColumn === SORT_FIELD.DAYSEVEN ? (!sortDirection ? '↑' : '↓') : ''}
          </ClickableText>
        </Flex>

        <Flex alignItems="center">
          <ClickableText
            area="tvl"
            onClick={e => {
              setSortedColumn(SORT_FIELD.TVL)
              setSortDirection(sortedColumn !== SORT_FIELD.TVL ? true : !sortDirection)
            }}
          >
            TVL {sortedColumn === SORT_FIELD.TVL ? (!sortDirection ? '↑' : '↓') : ''}
          </ClickableText>
        </Flex>
        {!below680 && (
          <Flex alignItems="center">
            <ClickableText
              area="mcaptvl"
              onClick={e => {
                setSortedColumn(SORT_FIELD.MCAPTVL)
                setSortDirection(sortedColumn !== SORT_FIELD.MCAPTVL ? true : !sortDirection)
              }}
            >
              Mcap/TVL {sortedColumn === SORT_FIELD.MCAPTVL ? (!sortDirection ? '↑' : '↓') : ''}
            </ClickableText>
          </Flex>
        )}
      </DashGrid>
      <Divider />
      <List p={0} >
        <InfiniteScroll
          dataLength={dataLength}
          next={next}
          hasMore={hasMore}
        >
          {filteredList &&
            filteredList.slice(0, dataLength).map((item, index) => {
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

export default TokenList
