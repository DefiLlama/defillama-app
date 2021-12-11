import React, { useEffect, useState } from 'react'
import { useMedia } from 'react-use'
import { Repeat } from 'react-feather'
import { transparentize } from 'polished'
import styled from 'styled-components'

import { PageWrapper, ContentWrapper } from 'components'
import Column from 'components/Column'
import { BasicLink } from 'components/Link'
import Loader from 'components/LocalLoader'
import Panel from 'components/Panel'
import { AutoRow, RowBetween, RowFixed } from 'components/Row'
import Search from 'components/Search'
import { Wrapper, CloseIcon } from 'components/Search/shared'
import TokenLogo from 'components/TokenLogo'

import { TYPE, ThemedBackground } from 'Theme'

import { formattedNum, standardizeProtocolName } from 'utils'
import { useFetchProtocol, useGeckoProtocol } from 'utils/dataApi'

const ComparisonDetailsLayout = styled.div`
  display: inline-grid;
  width: 100%;
  grid-template-columns: 33% 10% 33%;
  column-gap: 30px;
  align-items: center;
  justify-content: center;

  @media screen and (max-width: 1024px) {
    grid-template-columns: 1fr;
    align-items: center;
    justify-items: center;
    > * {
      grid-column: 1 / 4;
      margin-bottom: 1rem;
      display: table-row;
      > * {
        margin-bottom: 1rem;
      }
    }
  }
`

const ProtocolTitle = styled(TYPE.main)`
  text-align: center;
`

const TokenColoredText = styled.span`
  color: ${({ color }) => (color ? color : 'inherit')};
`

const PriceChange = styled.span`
  color: ${({ priceChange, theme }) => (priceChange === 1 ? 'inherit' : priceChange > 1 ? theme.green1 : theme.red1)};
`

const SwapProtocolsIcon = styled(Repeat)`
  color: white;
  cursor: pointer;

  &:hover {
    transform: scale(1.15);
  }

  @media screen and (max-width: 1024px) {
    margin: 0;
  }
`

const PriceResultPanel = styled(Panel)`
  text-align: center;
  width: auto;
`

const protocolAColor = '#4f8fea'
const protocolBColor = '#fd3c99'
const backgroundColor = '#2172E5'

// assuming price is 0 is not valid
const validTokenData = tokenData => !!tokenData?.price && !!tokenData?.name

const TokenInfoHook = (protocol, protocolsMcapTvl) => {
  // 0 price for unable to query gecko properly
  const [tokenPrice, setTokenPrice] = useState(0)
  // Ability to change currency in future?
  const [defaultCurrency] = useState('usd')
  const { data: tokenData, loading: protocolLoading } = useFetchProtocol(protocol)
  const geckoId = (tokenData && tokenData?.gecko_id) || undefined
  const { data: geckoData, loading: geckoLoading } = useGeckoProtocol(geckoId)
  const geckoPrice = (geckoData || {})?.[geckoId]?.[defaultCurrency]

  useEffect(() => {
    setTokenPrice(geckoPrice)
  }, [geckoPrice])

  return {
    ...tokenData,
    tvl: protocolsMcapTvl[protocol]?.tvl,
    mcap: protocolsMcapTvl[protocol]?.mcap,
    price: tokenPrice,
    loading: protocolLoading || geckoLoading
  }
}

const DisplayToken = ({ tokenSymbol, logo, address, price, resetDisplay }) => (
  <Wrapper style={{ justifyContent: 'space-between' }}>
    <RowFixed style={{ display: 'flex', gap: '7.5px', justifyContent: 'flex-start' }}>
      <TokenLogo address={address} logo={logo} size={32} style={{ alignSelf: 'center' }} />
      <TYPE.main>{tokenSymbol}</TYPE.main>
      <TYPE.main>{formattedNum(price, true)}</TYPE.main>
    </RowFixed>
    <CloseIcon onClick={resetDisplay} />
  </Wrapper>
)

const TokenComparisonSearch = ({
  protocolAorB,
  tokenValid,
  tokenSymbol,
  logo,
  address,
  price,
  handleLinkPath,
  customOnLinkClick
}) => (
  <Column>
    <ProtocolTitle mb="1rem">
      <TokenColoredText color={protocolAorB === 'A' ? protocolAColor : protocolBColor}>
        Protocol {protocolAorB}
      </TokenColoredText>
    </ProtocolTitle>
    {tokenValid ? (
      <DisplayToken
        tokenSymbol={tokenSymbol}
        logo={logo}
        address={address}
        price={price}
        resetDisplay={customOnLinkClick(protocolAorB)}
      />
    ) : (
      <Search
        linkPath={handleLinkPath(protocolAorB)}
        customOnLinkClick={customOnLinkClick(protocolAorB)}
        includeChains={false}
      />
    )}
  </Column>
)

function ComparisonPage({ protocolA: protocolARouteParam, protocolB: protocolBRouteParam, protocolsMcapTvl }) {
  const [protocolA, setProtocolA] = useState(protocolARouteParam)
  const [protocolB, setProtocolB] = useState(protocolBRouteParam)

  const tokenAData = TokenInfoHook(protocolA, protocolsMcapTvl)
  const {
    address: tokenAAddress,
    logo: tokenALogo,
    symbol: tokenASymbol,
    price: tokenAPrice,
    mcap: tokenAMcap,
    tvl: tokenATvl,
    loading: loadingA
  } = tokenAData
  const tokenBData = TokenInfoHook(protocolB, protocolsMcapTvl)
  const {
    address: tokenBAddress,
    logo: tokenBLogo,
    symbol: tokenBSymbol,
    price: tokenBPrice,
    mcap: tokenBMcap,
    tvl: tokenBTvl,
    loading: loadingB
  } = tokenBData

  const tokenBMcapTvl = tokenBMcap / tokenBTvl
  const tokenACirculating = tokenAMcap / tokenAPrice
  const tokenAPriceWithTokenBMcapTvl = (tokenBMcapTvl * tokenATvl) / tokenACirculating
  const tokenAPriceChange = tokenAPriceWithTokenBMcapTvl / tokenAPrice

  const below400 = useMedia('(max-width: 400px)')
  const below1024 = useMedia('(max-width: 1024px)')
  const LENGTH = below1024 ? 10 : 16
  // format for long symbol
  const tokenAFormattedSymbol = tokenASymbol?.length > LENGTH ? tokenASymbol.slice(0, LENGTH) + '...' : tokenASymbol
  const tokenBFormattedSymbol = tokenBSymbol?.length > LENGTH ? tokenBSymbol.slice(0, LENGTH) + '...' : tokenBSymbol

  const tokenAValid = validTokenData(tokenAData)
  const tokenBValid = validTokenData(tokenBData)

  const handleLinkPath = protocolAorB => clickedProtocol => {
    const comparisonRoute = '/comparison'
    // If doesn't have two protocols stay on same page
    if ((protocolAorB === 'A' && !tokenBValid) || (protocolAorB === 'B' && !tokenAValid)) return '/comparison/curve'

    const protocolName = standardizeProtocolName(clickedProtocol.name)
    if (protocolAorB === 'A') return `${comparisonRoute}/${protocolName}/${protocolB}`
    return `${comparisonRoute}/${protocolA}/${protocolName}`
  }

  const handleSwapLinkPath = () => {
    const comparisonRoute = '/comparison'
    // If doesn't have two protocols stay on same page
    if (!tokenAValid || !tokenBValid) return ''
    return `${comparisonRoute}/${protocolB}/${protocolA}`
  }

  // Update protocol to correct order based off of pathname from user clicking switch button
  useEffect(() => {
    if (protocolA !== protocolARouteParam && tokenAValid && tokenBValid) {
      setProtocolA(protocolARouteParam)
    }
    if (protocolB !== protocolBRouteParam && tokenAValid && tokenBValid) {
      setProtocolB(protocolBRouteParam)
    }
  }, [protocolA, protocolARouteParam, protocolB, protocolBRouteParam, tokenAValid, tokenBValid])

  const customOnLinkClick = protocolAorB => token => {
    if (protocolAorB === 'A') return setProtocolA(standardizeProtocolName(token?.name))
    return setProtocolB(standardizeProtocolName(token?.name))
  }

  return (
    <PageWrapper>
      <ThemedBackground backgroundColor={transparentize(0.6, backgroundColor)} />
      <ContentWrapper>
        <RowBetween>
          <TYPE.largeHeader fontSize={below400 ? 16 : 24} style={{ width: '100%', textAlign: 'center' }}>
            Calculate the price of <TokenColoredText color={protocolAColor}>Protocol A</TokenColoredText>
            <br />
            with the Mcap/TVL of <TokenColoredText color={protocolBColor}>Protocol B</TokenColoredText>
          </TYPE.largeHeader>
        </RowBetween>
        <RowBetween style={{ flexWrap: 'wrap', alingItems: 'start' }}>
          <ComparisonDetailsLayout>
            <TokenComparisonSearch
              protocolAorB="A"
              tokenValid={tokenAValid}
              tokenSymbol={tokenAFormattedSymbol}
              logo={tokenALogo}
              address={tokenAAddress}
              price={tokenAPrice}
              handleLinkPath={handleLinkPath}
              customOnLinkClick={customOnLinkClick}
            />
            <Column>
              <BasicLink style={{ margin: '2rem auto 0' }} href={handleSwapLinkPath()}>
                <SwapProtocolsIcon onClick={handleSwapLinkPath} />
              </BasicLink>
            </Column>
            <TokenComparisonSearch
              protocolAorB="B"
              tokenValid={tokenBValid}
              tokenSymbol={tokenBFormattedSymbol}
              logo={tokenBLogo}
              address={tokenBAddress}
              price={tokenBPrice}
              handleLinkPath={handleLinkPath}
              customOnLinkClick={customOnLinkClick}
            />
          </ComparisonDetailsLayout>
        </RowBetween>
        {(loadingA || loadingB) && (
          <AutoRow style={{ gap: '1rem', justifyContent: 'center' }}>
            <Loader style={{ width: 'fit-content' }} />{' '}
          </AutoRow>
        )}
        {tokenAValid && tokenBValid && (
          <PriceResultPanel margin="auto" rounded p={20}>
            <Column style={{ gap: '1rem' }}>
              <TYPE.main>
                {tokenAFormattedSymbol} price with the Mcap/TVL of {tokenBFormattedSymbol}
              </TYPE.main>
              <AutoRow style={{ justifyContent: 'center', gap: '7.5px' }}>
                <TokenLogo address={tokenAAddress} logo={tokenALogo} size={32} style={{ alignSelf: 'center' }} />
                <TYPE.largeHeader fontSize={32}>{formattedNum(tokenAPriceWithTokenBMcapTvl, true)}</TYPE.largeHeader>
                <TYPE.main style={{ marginTop: '7.5px' }}>
                  <PriceChange priceChange={tokenAPriceChange}>({formattedNum(tokenAPriceChange)}x)</PriceChange>
                </TYPE.main>
              </AutoRow>
            </Column>
          </PriceResultPanel>
        )}
      </ContentWrapper>
    </PageWrapper>
  )
}

export default ComparisonPage
