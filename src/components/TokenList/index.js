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

import { formattedNum, formattedPercent, chainIconUrl, tokenIconUrl, slug } from '../../utils'
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
  NAME: 'name',
  HOURONE: 'change_1h',
  DAYONE: 'change_1d',
  DAYSEVEN: 'change_7d',
  MCAPTVL: "mcaptvl",
  CHAINS: 'chains'
}

const ProtocolButtonElement = styled(FormattedName)`
  margin-left: 16px;
  white-space: nowrap;
`

const ProtocolButton = ({ item, below600 }) => {
  return (
    <ProtocolButtonElement
      text={item.symbol === "-" ? item.name : `${item.name} (${item.symbol})`}
      maxCharacters={below600 ? 8 : 16}
      adjustSize={true}
      link={true}
    />
  )
}

const Index = styled.div`
  margin-right: 1rem;
  width: 10px;
  @media (max-width: 680px) {
    display: none;
  }
`

const DataTextHideBelow680 = styled(DataText)`
  @media (max-width: 680px) {
    display: none !important;
  }
`

const DataTextHideBelow1080 = styled(DataText)`
  @media (max-width: 1080px) {
    display: none !important;
  }
`

const FlexHideBelow680 = styled(Flex)`
  @media (max-width: 680px) {
    display: none !important;
  }
`

const FlexHideBelow1080 = styled(Flex)`
  @media (max-width: 1080px) {
    display: none !important;
  }
`


// @TODO rework into virtualized list
function TokenList({ tokens, filters, iconUrl = tokenIconUrl, generateLink = name => `/protocol/${slug(name)}`, columns = [undefined, SORT_FIELD.CHAINS] }) {

  const below600 = useMedia('(max-width: 600px)')

  // sorting
  const [sortDirection, setSortDirection] = useState(true)
  const [sortedColumn, setSortedColumn] = useState(undefined)

  const filteredList = useMemo(() => {
    let sortedTokens = tokens
    if (sortedColumn !== undefined) {
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
            <Index>{index + 1}</Index>
            <TokenLogo logo={iconUrl(item.name)} />
            <CustomLink
              href={generateLink(item.name)}
            >
              <ProtocolButton item={item} below600={below600} />
            </CustomLink>
          </Row>
        </DataText>
        <DataTextHideBelow1080 area="chain">{item.chains.map(chain => <BasicLink key={chain} href={`/chain/${chain}`}><a><TokenLogo address={chain} logo={chainIconUrl(chain)} /></a></BasicLink>)}</DataTextHideBelow1080>
        <DataTextHideBelow1080 area="1dchange" color="text" fontWeight="500">
          {formattedPercent(item.change_1d, true)}
        </DataTextHideBelow1080>
        <DataText area="7dchange">{item.change_7d !== 0 ? formattedPercent(item.change_7d, true) : '-'}</DataText>
        <DataText area="tvl">{formattedNum(item.tvl, true)}</DataText>
        <DataTextHideBelow680 area="mcaptvl" color="text" fontWeight="500">
          {item.mcaptvl === null || item.mcaptvl === undefined ? '-' : formattedNum(item.mcaptvl, false)}
        </DataTextHideBelow680>
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
            Name {sortedColumn === SORT_FIELD.NAME ? (!sortDirection ? '↑' : '↓') : ''}
          </ClickableText>
        </Flex>
        <FlexHideBelow1080 alignItems="center">
          <ClickableText
            area="chain"
            onClick={e => {
              setSortedColumn(SORT_FIELD.CHAINS)
              setSortDirection(sortedColumn !== SORT_FIELD.CHAINS ? true : !sortDirection)
            }}
          >
            Chain {sortedColumn === SORT_FIELD.CHAINS ? (!sortDirection ? '↑' : '↓') : ''}
          </ClickableText>
        </FlexHideBelow1080>
        <FlexHideBelow1080 alignItems="center">
          <ClickableText
            area="1dchange"
            onClick={e => {
              setSortedColumn(SORT_FIELD.DAYONE)
              setSortDirection(sortedColumn !== SORT_FIELD.DAYONE ? true : !sortDirection)
            }}
          >
            1d Change {sortedColumn === SORT_FIELD.DAYONE ? (!sortDirection ? '↑' : '↓') : ''}
          </ClickableText>
        </FlexHideBelow1080>
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
              setSortDirection(sortedColumn === undefined ? false : sortedColumn !== SORT_FIELD.TVL ? true : !sortDirection)
            }}
          >
            TVL {sortedColumn === SORT_FIELD.TVL || sortedColumn === undefined ? (!sortDirection ? '↑' : '↓') : ''}
          </ClickableText>
        </Flex>
        <FlexHideBelow680 alignItems="center">
          <ClickableText
            area="mcaptvl"
            onClick={e => {
              setSortedColumn(SORT_FIELD.MCAPTVL)
              setSortDirection(sortedColumn !== SORT_FIELD.MCAPTVL ? true : !sortDirection)
            }}
          >
            Mcap/TVL {sortedColumn === SORT_FIELD.MCAPTVL ? (!sortDirection ? '↑' : '↓') : ''}
          </ClickableText>
        </FlexHideBelow680>
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
