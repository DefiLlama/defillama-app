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
import { formattedNum, formattedPercent, tokenIconUrl, slug, getPercentChange } from 'utils'

const List = styled(Box)`
  -webkit-overflow-scrolling: touch;
`

const DashGrid = styled.div`
  display: grid;
  grid-gap: 1em;
  grid-template-columns: 16px 1fr 0.7fr 0.7fr;
  grid-template-areas: 'toggle name 7dchange tvl';

  > * {
    justify-content: flex-end;

    &:first-child {
      justify-content: flex-start;
    }
  }

  @media screen and (min-width: 680px) {
    display: grid;
    grid-gap: 1em;
    grid-template-columns: 16px 28px 180px 1fr 1fr 1fr;
    grid-template-areas: 'toggle index name 7dchange tvl mcaptvl';

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
    grid-template-columns: 16px 28px 1.2fr 1fr 0.4fr 0.4fr 0.4fr;
    grid-template-areas: 'toggle index name chain 7dchange tvl mcaptvl';
  }

  ${({ theme: { minXl } }) => minXl} {
    grid-template-columns: 16px 28px 1.2fr 1fr 0.4fr 0.4fr 0.4fr 0.4fr 0.4fr;
    grid-template-areas: 'toggle index name chain 1dchange 7dchange 1mchange tvl mcaptvl';
  }
`

const ListWrapper = styled.div``

export const ClickableText = styled(Text)`
  text-align: end;
  &:hover {
    cursor: pointer;
    opacity: 0.6;
  }
  user-select: none;
  color: ${({ theme }) => theme.text1};

  @media screen and (max-width: 680px) {
    font-size: 0.85rem;
  }
`

export const DataText = styled(Flex)`
  align-items: center;
  text-align: center;
  color: ${({ theme }) => theme.text1};

  & > * {
    font-size: 14px;
  }

  @media screen and (max-width: 680px) {
    font-size: 12px;
  }
`

const SORT_FIELD = {
  TVL: 'tvl',
  NAME: 'name',
  HOURONE: 'change_1h',
  DAYONE: 'change_1d',
  DAYSEVEN: 'change_7d',
  MONTHONE: 'change_1m',
  MCAPTVL: 'mcaptvl',
  CHAINS: 'chains',
}

const COLUMN_NAMES = {
  chains: 'Chains',
  protocols: 'Protocols',
  name: 'Name',
  change_1d: '1d Change',
  change_7d: '7d Change',
  change_1m: '1m Change',
  listedAt: 'Listed',
}

const COLUMN_HELP = {
  chains: "Chains are ordered by protocol's highest TVL on each chain",
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
const DataTextHideBelowXl = styled(DataText)`
  ${({ theme: { maxXl } }) => maxXl} {
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
const FlexHideBelowXl = styled(Flex)`
  ${({ theme: { maxXl } }) => maxXl} {
    display: none !important;
  }
`

const ToggleButton = styled(DataText)`
  margin-top: 4px;
  cursor: pointer;
  overflow: visible;

  & svg {
    width: 16px;
    height: 16px;
  }
`

const Index = styled(DataTextHideBelow680)`
  justify-content: center;
`

const ListHeaderName = styled(DataText)`
  margin-left: var(--ident-left) !important;
`

// @TODO rework into virtualized list
function TokenList({
  tokens,
  filters,
  iconUrl = tokenIconUrl,
  generateLink = (name) => `/protocol/${slug(name)}`,
  columns = [undefined, SORT_FIELD.CHAINS, SORT_FIELD.DAYONE, SORT_FIELD.DAYSEVEN, SORT_FIELD.MONTHONE],
  defaultSortingColumn = 'tvl',
  canBookmark = true,
}) {
  // sorting
  const [sortDirection, setSortDirection] = useState(true)
  const [sortedColumn, setSortedColumnRaw] = useState(defaultSortingColumn)
  const [alreadySorted, setAlreadySorted] = useState(true)
  const setSortedColumn = (newColumn) => {
    setAlreadySorted(false)
    setSortedColumnRaw(newColumn)
  }
  const filteredList = useMemo(() => {
    let sortedTokens = tokens
    if (!alreadySorted) {
      sortedTokens = tokens.sort((a, b) => {
        const aColumn = a[sortedColumn]
        const bColumn = b[sortedColumn]

        if (sortedColumn === SORT_FIELD.CHAINS) {
          return aColumn.length > bColumn.length ? (sortDirection ? -1 : 1) * 1 : (sortDirection ? -1 : 1) * -1
        }
        if (sortedColumn === SORT_FIELD.SYMBOL || sortedColumn === SORT_FIELD.NAME) {
          return aColumn > bColumn ? (sortDirection ? -1 : 1) * 1 : (sortDirection ? -1 : 1) * -1
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

        // move all invalid fields to the bottom unless TVL which gets displayed as 0
        if (SORT_FIELD.TVL !== sortedColumn) {
          if (!aColumn || aColumn === Infinity) {
            return 1
          }

          if (!bColumn || bColumn === Infinity) {
            return -1
          }
        }

        return parseFloat(aColumn || 0) > parseFloat(bColumn || 0)
          ? (sortDirection ? -1 : 1) * 1
          : (sortDirection ? -1 : 1) * -1
      })
    }
    return sortedTokens
  }, [tokens, sortDirection, sortedColumn, alreadySorted])

  const { LoadMoreButton, dataLength, hasMore, next } = useInfiniteScroll({ list: filteredList, filters })

  return (
    <ListWrapper>
      <DashGrid
        center={true}
        style={{ height: 'fit-content', padding: '0 0 1rem 0', marginLeft: !canBookmark ? '-28px' : 0 }}
      >
        <div area="toggle"></div>
        <Index area="index"></Index>
        <Flex alignItems="center" justifyContent="flex-start">
          <ClickableText
            area="name"
            fontWeight="500"
            style={{ textAlign: 'start' }}
            onClick={(e) => {
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
            onClick={(e) => {
              setSortedColumn(columns[1])
              setSortDirection(sortedColumn !== columns[1] ? true : !sortDirection)
            }}
          >
            {COLUMN_NAMES[columns[1]]}
            {COLUMN_NAMES[columns[1]] === COLUMN_NAMES.chains && <HeadHelp text={COLUMN_HELP.chains} />}
            {sortedColumn === columns[1] ? (!sortDirection ? '↑' : '↓') : ''}
          </ClickableText>
        </FlexHideBelowLg>
        <FlexHideBelowXl alignItems="center">
          <ClickableText
            area="1dchange"
            onClick={(e) => {
              setSortedColumn(SORT_FIELD.DAYONE)
              setSortDirection(sortedColumn !== SORT_FIELD.DAYONE ? true : !sortDirection)
            }}
          >
            1d Change {sortedColumn === SORT_FIELD.DAYONE ? (!sortDirection ? '↑' : '↓') : ''}
          </ClickableText>
        </FlexHideBelowXl>
        <Flex alignItems="center">
          <ClickableText
            area="7dchange"
            onClick={(e) => {
              setSortedColumn(columns[3])
              setSortDirection(sortedColumn !== columns[3] ? true : !sortDirection)
            }}
          >
            {COLUMN_NAMES[columns[3]]} {sortedColumn === columns[3] ? (!sortDirection ? '↑' : '↓') : ''}
          </ClickableText>
        </Flex>
        <FlexHideBelowXl alignItems="center">
          <ClickableText
            area="1dchange"
            onClick={(e) => {
              setSortedColumn(SORT_FIELD.MONTHONE)
              setSortDirection(sortedColumn !== SORT_FIELD.MONTHONE ? true : !sortDirection)
            }}
          >
            1m Change {sortedColumn === SORT_FIELD.MONTHONE ? (!sortDirection ? '↑' : '↓') : ''}
          </ClickableText>
        </FlexHideBelowXl>
        <Flex alignItems="center">
          <ClickableText
            area="tvl"
            onClick={(e) => {
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
            onClick={(e) => {
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
              <div key={item.name + index}>
                {item.childChains ? (
                  <ListHeaderItem
                    item={item}
                    index={index}
                    columns={columns}
                    iconUrl={iconUrl}
                    canBookmark={canBookmark}
                    generateLink={generateLink}
                  />
                ) : (
                  <ListItem
                    index={index}
                    item={item}
                    iconUrl={iconUrl}
                    columns={columns}
                    canBookmark={canBookmark}
                    generateLink={generateLink}
                  />
                )}
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

const ListItem = ({ item, index, canBookmark, iconUrl, columns, generateLink, isChildList }) => {
  return (
    <>
      <DashGrid style={{ height: '48px', marginLeft: !canBookmark ? '-28px' : 0 }} focus={true}>
        <ToggleButton area="toggle">{canBookmark && <Bookmark readableProtocolName={item.name} />}</ToggleButton>

        <Index area="index">{index !== null ? index + 1 : ''}</Index>
        <ListHeaderName area="name" fontWeight="500" style={{ '--ident-left': isChildList ? '30px' : 0 }}>
          {isChildList && <div style={{ marginRight: '1rem' }}>-</div>}
          <Row style={{ gap: '1rem', minWidth: '100%' }}>
            <TokenLogo logo={iconUrl(item.name)} />
            <CustomLink href={generateLink(item.name)} style={{ textAlign: 'start' }}>
              <ProtocolButton item={item} />
            </CustomLink>
          </Row>
        </ListHeaderName>
        <DataTextHideBelowLg area="chain">
          {columns[1] === SORT_FIELD.CHAINS ? (
            <ChainsRow chains={item.chains} />
          ) : (
            formattedNum(item[columns[1]], false)
          )}
        </DataTextHideBelowLg>
        <VolumeColumns item={item} columns={columns} />
      </DashGrid>
      <Divider />
    </>
  )
}

const ListHeaderItem = ({ item, index, columns, iconUrl, canBookmark, generateLink }) => {
  const children = item.childChains
  return (
    <>
      <DashGrid style={{ height: '48px', position: 'relative', marginLeft: !canBookmark ? '-28px' : 0 }} focus={true}>
        <div area="toggle"></div>
        <Index area="index">{index + 1}</Index>
        <DataText area="name" fontWeight="500">
          <Row style={{ gap: '1rem', minWidth: '100%' }}>
            <TokenLogo logo={iconUrl(item.name)} />
            <p>{item.name}</p>
          </Row>
        </DataText>
        <DataTextHideBelowLg area="chain">{item.protocols}</DataTextHideBelowLg>
        <VolumeColumns item={item} columns={columns} />
      </DashGrid>
      <Divider />
      {children &&
        children.map((child, index) => (
          <ListItem
            index={null}
            item={child}
            iconUrl={iconUrl}
            columns={columns}
            canBookmark={canBookmark}
            generateLink={generateLink}
            key={child.name + 'child' + index}
            isChildList={true}
          />
        ))}
    </>
  )
}

const VolumeColumns = ({ item, columns }) => {
  const { change1d, change7d, change1m, mcapTvl } = useMemo(() => {
    const change1d = formattedPercent(getPercentChange(item.tvl, item.tvlPrevDay))
    const change7d = formattedPercent(getPercentChange(item.tvl, item.tvlPrevWeek))
    const change1m = formattedPercent(getPercentChange(item.tvl, item.tvlPrevMonth))
    const mcapTvl = item.mcap && item.tvl && formattedNum(item.mcap / item.tvl)
    return { change1d, change7d, change1m, mcapTvl }
  }, [item])
  return (
    <>
      <DataTextHideBelowXl area="1dchange" fontWeight="500">
        {change1d}
      </DataTextHideBelowXl>
      <DataText area="7dchange">
        {columns[3] === SORT_FIELD.DAYSEVEN ? (item.change_7d !== 0 ? change7d : '') : `${item.listedAt} days ago`}
      </DataText>
      <DataTextHideBelowXl area="1mchange" fontWeight="500">
        {item.change_1m || item.change_1m === 0 ? change1m : ''}
      </DataTextHideBelowXl>
      <DataText area="tvl">{formattedNum(item.tvl, true)}</DataText>
      <DataTextHideBelow680 area="mcaptvl" fontWeight="500">
        {mcapTvl}
      </DataTextHideBelow680>
    </>
  )
}
