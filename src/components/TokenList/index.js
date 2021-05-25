import React, { useState, useEffect, useMemo } from 'react'
import styled from 'styled-components'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

import { Box, Flex, Text } from 'rebass'
import TokenLogo from '../TokenLogo'
import { CustomLink } from '../Link'
import Row from '../Row'
import { Divider } from '..'

import { formattedNum, formattedPercent } from '../../utils'
import { useMedia } from 'react-use'
import { withRouter } from 'react-router-dom'
import { OVERVIEW_TOKEN_BLACKLIST } from '../../constants'
import FormattedName from '../FormattedName'
import { TYPE } from '../../Theme'

dayjs.extend(utc)

const PageButtons = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  margin-top: 2em;
  margin-bottom: 2em;
`

const Arrow = styled.div`
  color: ${({ theme }) => theme.primary1};
  opacity: ${props => (props.faded ? 0.3 : 1)};
  padding: 0 20px;
  user-select: none;
  :hover {
    cursor: pointer;
  }
`

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
    grid-template-columns: 1fr 0.6fr 1fr 0.8fr 0.6fr 0.6fr 0.6fr;
    grid-template-areas: 'name symbol chain 1dchange 7dchange tvl';
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
  CHANGE: 'priceChangeUSD'
}

// @TODO rework into virtualized list
function TopTokenList({ tokens, itemMax = 100 }) {
  // page state
  const [page, setPage] = useState(1)
  const [maxPage, setMaxPage] = useState(1)

  // sorting
  const [sortDirection, setSortDirection] = useState(true)
  const [sortedColumn, setSortedColumn] = useState(SORT_FIELD.TVL)

  const below1080 = useMedia('(max-width: 1080px)')
  const below680 = useMedia('(max-width: 680px)')
  const below600 = useMedia('(max-width: 600px)')

  useEffect(() => {
    setMaxPage(1) // edit this to do modular
    setPage(1)
  }, [tokens])

  const formattedTokens = useMemo(() => {
    return (
      tokens &&
      Object.keys(tokens)
        .filter(key => {
          return !OVERVIEW_TOKEN_BLACKLIST.includes(key)
        })
        .map(key => tokens[key])
    )
  }, [tokens])

  useEffect(() => {
    if (tokens && formattedTokens) {
      let extraPages = 1
      if (formattedTokens.length % itemMax === 0) {
        extraPages = 0
      }
      setMaxPage(Math.floor(formattedTokens.length / itemMax) + extraPages)
    }
  }, [tokens, formattedTokens, itemMax])

  const filteredList = useMemo(() => {
    return (
      formattedTokens &&
      formattedTokens
        .sort((a, b) => {
          if (sortedColumn === SORT_FIELD.SYMBOL || sortedColumn === SORT_FIELD.NAME) {
            return a[sortedColumn] > b[sortedColumn] ? (sortDirection ? -1 : 1) * 1 : (sortDirection ? -1 : 1) * -1
          }
          return parseFloat(a[sortedColumn]) > parseFloat(b[sortedColumn])
            ? (sortDirection ? -1 : 1) * 1
            : (sortDirection ? -1 : 1) * -1
        })
        .slice(itemMax * (page - 1), page * itemMax)
    )
  }, [formattedTokens, itemMax, page, sortDirection, sortedColumn])

  const ListItem = ({ item, index }) => {
    return (
      <DashGrid style={{ height: '48px' }} focus={true}>
        <DataText area="name" fontWeight="500">
          <Row>
            {!below680 && <div style={{ marginRight: '1rem', width: '10px' }}>{index}</div>}
            <TokenLogo address={item.address} logo={item.logo} />
            <CustomLink
              style={{ marginLeft: '16px', whiteSpace: 'nowrap', minWidth: '200px' }}
              to={'/protocol/' + item.name?.toLowerCase().split(' ').join('-')}
            >
              <FormattedName
                text={item.name}
                maxCharacters={below600 ? 8 : 16}
                adjustSize={true}
                link={true}
              />
            </CustomLink>
          </Row>
        </DataText>
        {!below680 && (
          <DataText area="symbol" color="text" fontWeight="500">
            <FormattedName text={item.symbol} maxCharacters={7} />
          </DataText>
        )}
        {!below1080 && (
          <DataText area="chain">{item.chain}</DataText>
        )}
        { !below1080 && (
          <DataText area="1hchange" color="text" fontWeight="500">
            {formattedPercent(item.change_1h, true)}
          </DataText>
        )}
        { !below1080 && (
          <DataText area="1dchange" color="text" fontWeight="500">
            {formattedPercent(item.change_1d, true)}
          </DataText>
        )}
        <DataText area="7dchange">{item.change_7d !== 0 ? formattedPercent(item.change_7d, true) : '-'}</DataText>
        <DataText area="tvl">{formattedNum(item.tvl, true)}</DataText>
      </DashGrid>
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
        {!below680 && (
          <Flex alignItems="center">
            <ClickableText
              area="symbol"
              onClick={e => {
                setSortedColumn(SORT_FIELD.SYMBOL)
                setSortDirection(sortedColumn !== SORT_FIELD.SYMBOL ? true : !sortDirection)
              }}
            >
              Symbol {sortedColumn === SORT_FIELD.SYMBOL ? (!sortDirection ? '↑' : '↓') : ''}
            </ClickableText>
          </Flex>
        )}

        {!below1080 && (
          <Flex alignItems="center">
            <ClickableText
              area="chain"
              onClick={e => {
                setSortedColumn(SORT_FIELD.PRICE)
                setSortDirection(sortedColumn !== SORT_FIELD.PRICE ? true : !sortDirection)
              }}
            >
              Chain {sortedColumn === SORT_FIELD.PRICE ? (!sortDirection ? '↑' : '↓') : ''}
            </ClickableText>
          </Flex>
        )}
        {!below1080 && (
          <Flex alignItems="center">
            <ClickableText
              area="1hchange"
              onClick={e => {
                setSortedColumn(SORT_FIELD.HOURONE)
                setSortDirection(sortedColumn !== SORT_FIELD.HOURONE ? true : !sortDirection)
              }}
            >
              1h Change {sortedColumn === SORT_FIELD.HOURONE ? (!sortDirection ? '↑' : '↓') : ''}
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
      </DashGrid>
      <Divider />
      <List p={0}>
        {filteredList &&
          filteredList.map((item, index) => {
            return (
              <div key={index}>
                <ListItem key={index} index={(page - 1) * itemMax + index + 1} item={item} />
                <Divider />
              </div>
            )
          })}
      </List>
      <PageButtons>
        <div onClick={() => setPage(page === 1 ? page : page - 1)}>
          <Arrow faded={page === 1 ? true : false}>←</Arrow>
        </div>
        <TYPE.body>{'Page ' + page + ' of ' + maxPage}</TYPE.body>
        <div onClick={() => setPage(page === maxPage ? page : page + 1)}>
          <Arrow faded={page === maxPage ? true : false}>→</Arrow>
        </div>
      </PageButtons>
    </ListWrapper>
  )
}

export default withRouter(TopTokenList)
