import { useState, useMemo } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import { Box, Flex, Text } from 'rebass'
import styled from 'styled-components'

import { Divider } from 'components'
import Bookmark from 'components/Bookmark'
import ChainsRow from 'components/ChainsRow'
import FormattedName from 'components/FormattedName'
import HeadHelp from 'components/HeadHelp'
import { CustomLink } from 'components/Link'
import Row from 'components/Row'
import TokenLogo from 'components/TokenLogo'

import { useInfiniteScroll } from 'hooks'
import { formattedNum, formattedPercent, tokenIconUrl, slug } from 'utils'

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

  ${({ theme: { minLg } }) => minLg} {
    display: grid;
    grid-gap: 0.5em;
    grid-template-columns: 1.2fr 1fr 0.4fr 0.4fr 0.4fr 0.4fr;
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
  MCAPTVL: 'mcaptvl',
  CHAINS: 'chains'
}

const COLUMN_NAMES = {
  chains: 'Chains',
  protocols: 'Protocols',
  name: 'Name',
  change_7d: '7d Change',
  change_1d: '1d Change',
  listedAt: 'Listed'
}

const COLUMN_HELP = {
  chains: "Chains are ordered by protocol's highest TVL on each chain"
}

const ProtocolButtonElement = styled(FormattedName)`
  overflow: hidden;
  text-overflow: ellipsis;

  ${({ theme: { maxSm } }) => maxSm} {
    max-width: 70px;
  }
`

const ProtocolButton = ({ item }) => {
  return (
    <ProtocolButtonElement
      text={item.symbol === '-' ? item.name : `${item.name} (${item.symbol})`}
      adjustSize={true}
      link={true}
    />
  )
}

const Index = styled.div`
  @media (max-width: 680px) {
    display: none;
  }
`

const DataTextHideBelow680 = styled(DataText)`
  @media (max-width: 680px) {
    display: none !important;
  }
`

const DataTextHideBelowLg = styled(DataText)`
  ${({ theme: { maxLg } }) => maxLg} {
    display: none !important;
  }
`

const FlexHideBelow680 = styled(Flex)`
  @media (max-width: 680px) {
    display: none !important;
  }
`

const FlexHideBelowLg = styled(Flex)`
  ${({ theme: { maxLg } }) => maxLg} {
    display: none !important;
  }
`

// @TODO rework into virtualized list
function TokenList({
  tokens,
  filters,
  iconUrl = tokenIconUrl,
  generateLink = name => `/protocol/${slug(name)}`,
  columns = [undefined, SORT_FIELD.CHAINS, SORT_FIELD.DAYONE, SORT_FIELD.DAYSEVEN],
  defaultSortingColumn = 'tvl',
  canBookmark = true
}) {
  // sorting
  const [sortDirection, setSortDirection] = useState(true)
  const [sortedColumn, setSortedColumnRaw] = useState(defaultSortingColumn)
  const [alreadySorted, setAlreadySorted] = useState(true)
  const setSortedColumn = newColumn => {
    setAlreadySorted(false)
    setSortedColumnRaw(newColumn)
  }
  const filteredList = useMemo(() => {
    let sortedTokens = tokens
    if (!alreadySorted) {
      sortedTokens = tokens.sort((a, b) => {
        if (sortedColumn === SORT_FIELD.CHAINS) {
          return a[sortedColumn].length > b[sortedColumn].length
            ? (sortDirection ? -1 : 1) * 1
            : (sortDirection ? -1 : 1) * -1
        }
        if (sortedColumn === SORT_FIELD.SYMBOL || sortedColumn === SORT_FIELD.NAME) {
          return a[sortedColumn] > b[sortedColumn] ? (sortDirection ? -1 : 1) * 1 : (sortDirection ? -1 : 1) * -1
        }
        if (sortedColumn === SORT_FIELD.MCAPTVL && !a.mcaptvl && !b.mcaptvl) {
          const aMcapTvl = a.mcap / a.tvl
          if (!aMcapTvl || aMcapTvl === Infinity) {
            return 1
          }
          const bMcapTvl = b.mcap / b.tvl

          if (!bMcapTvl || bMcapTvl === Infinity) {
            return -1
          }

          return parseFloat(aMcapTvl) > parseFloat(bMcapTvl)
            ? (sortDirection ? -1 : 1) * 1
            : (sortDirection ? -1 : 1) * -1
        }
        return parseFloat(a[sortedColumn] || 0) > parseFloat(b[sortedColumn] || 0)
          ? (sortDirection ? -1 : 1) * 1
          : (sortDirection ? -1 : 1) * -1
      })
    }
    return sortedTokens
  }, [tokens, sortDirection, sortedColumn, alreadySorted])

  const { LoadMoreButton, dataLength, hasMore, next } = useInfiniteScroll({ list: filteredList, filters })

  const ListItem = ({ item, index }) => {
    return (
      <DashGrid style={{ height: '48px' }} focus={true}>
        <DataText area="name" fontWeight="500">
          <Row style={{ gap: '1rem', minWidth: '100%' }}>
            {canBookmark && (
              <Bookmark
                readableProtocolName={item.name}
                style={{ width: '16px', height: '16px', cursor: 'pointer', overflow: 'visible', marginTop: '4px' }}
              />
            )}
            <Index>{index + 1}</Index>
            <TokenLogo logo={iconUrl(item.name)} />
            <CustomLink href={generateLink(item.name)}>
              <ProtocolButton item={item} />
            </CustomLink>
          </Row>
        </DataText>
        <DataTextHideBelowLg area="chain">
          {columns[1] === SORT_FIELD.CHAINS ? (
            <ChainsRow chains={item.chains} />
          ) : (
            formattedNum(item[columns[1]], false)
          )}
        </DataTextHideBelowLg>
        <DataTextHideBelowLg area="1dchange" fontWeight="500">
          {formattedPercent(item.change_1d, true)}
        </DataTextHideBelowLg>
        <DataText area="7dchange">
          {columns[3] === SORT_FIELD.DAYSEVEN
            ? item.change_7d !== 0
              ? formattedPercent(item.change_7d, true)
              : '-'
            : `${item.listedAt} days ago`}
        </DataText>
        <DataText area="tvl">{formattedNum(item.tvl, true)}</DataText>
        <DataTextHideBelow680 area="mcaptvl" fontWeight="500">
          {item.mcaptvl === null || item.mcaptvl === undefined
            ? item.mcap && item.tvl
              ? formattedNum(item.mcap / item.tvl)
              : '-'
            : formattedNum(item.mcaptvl, false)}
        </DataTextHideBelow680>
      </DashGrid>
    )
  }

  return (
    <ListWrapper>
      <DashGrid center={true} style={{ height: 'fit-content', padding: '0 1.125rem 1rem 1.125rem' }}>
        <Flex alignItems="center" justifyContent="flexStart">
          <ClickableText
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
        <FlexHideBelowLg alignItems="center">
          <ClickableText
            area="chain"
            onClick={e => {
              setSortedColumn(columns[1])
              setSortDirection(sortedColumn !== columns[1] ? true : !sortDirection)
            }}
          >
            {COLUMN_NAMES[columns[1]]}
            {COLUMN_NAMES[columns[1]] === COLUMN_NAMES.chains && <HeadHelp text={COLUMN_HELP.chains} />}
            {sortedColumn === columns[1] ? (!sortDirection ? '↑' : '↓') : ''}
          </ClickableText>
        </FlexHideBelowLg>
        <FlexHideBelowLg alignItems="center">
          <ClickableText
            area="1dchange"
            onClick={e => {
              setSortedColumn(SORT_FIELD.DAYONE)
              setSortDirection(sortedColumn !== SORT_FIELD.DAYONE ? true : !sortDirection)
            }}
          >
            1d Change {sortedColumn === SORT_FIELD.DAYONE ? (!sortDirection ? '↑' : '↓') : ''}
          </ClickableText>
        </FlexHideBelowLg>
        <Flex alignItems="center">
          <ClickableText
            area="7dchange"
            onClick={e => {
              setSortedColumn(columns[3])
              setSortDirection(sortedColumn !== columns[3] ? true : !sortDirection)
            }}
          >
            {COLUMN_NAMES[columns[3]]} {sortedColumn === columns[3] ? (!sortDirection ? '↑' : '↓') : ''}
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
      <List p={0}>
        <InfiniteScroll dataLength={dataLength} next={next} hasMore={hasMore}>
          {filteredList.slice(0, dataLength).map((item, index) => {
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
