import React, { useEffect } from 'react'
import { useMedia } from 'react-use'
import { PlusCircle, Bookmark } from 'react-feather'

import 'feather-icons'
import { withRouter } from 'react-router-dom'
import { Text } from 'rebass'
import styled from 'styled-components'
import { shade } from 'polished'
import Vibrant from 'node-vibrant'
import { hex } from 'wcag-contrast'

import Link from '../components/Link'
import Panel from '../components/Panel'
import TokenLogo from '../components/TokenLogo'
import Loader from '../components/LocalLoader'
import ProtocolChart from '../components/ProtocolChart'
import { AutoRow, RowBetween, RowFixed } from '../components/Row'
import Column, { AutoColumn } from '../components/Column'
import { ButtonLight } from '../components/ButtonStyled'
import { BasicLink } from '../components/Link'
import Search from '../components/Search'
import { formattedNum, formattedPercent, getTokenAddressFromName, getTokenIdFromName } from '../utils'
import { useTokenData } from '../contexts/TokenData'
import { TYPE, ThemedBackground } from '../Theme'
import { transparentize } from 'polished'
import { isAddress } from '../utils'
import CopyHelper from '../components/Copy'

import { useAllTokenData } from '../contexts/TokenData'
import { useSavedTokens } from '../contexts/LocalStorage'
import { Hover, PageWrapper, ContentWrapper, StyledIcon } from '../components'
import FormattedName from '../components/FormattedName'
import AuditInfo from '../components/AuditInfo'
import HeadHelp from '../components/HeadHelp'

const DashboardWrapper = styled.div`
  width: 100%;
`

const PanelWrapper = styled.div`
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: max-content;
  gap: 6px;
  display: inline-grid;
  width: 100%;
  align-items: start;
  @media screen and (max-width: 1024px) {
    grid-template-columns: 1fr;
    align-items: stretch;
    > * {
      grid-column: 1 / 4;
    }

    > * {
      &:first-child {
        width: 100%;
      }
    }
  }
`

const TokenDetailsLayout = styled.div`
  display: inline-grid;
  width: 100%;
  grid-template-columns: auto auto auto 1fr;
  column-gap: 30px;
  align-items: start;

  &:last-child {
    align-items: center;
    justify-items: end;
  }
  @media screen and (max-width: 1024px) {
    grid-template-columns: 1fr;
    align-items: stretch;
    > * {
      grid-column: 1 / 4;
      margin-bottom: 1rem;
    }

    &:last-child {
      align-items: start;
      justify-items: start;
    }
  }
`
let backgroundColor = '#2172E5'

function TokenPage({ protocol, history }) {
  const allTokens = useAllTokenData()
  let address = getTokenAddressFromName(allTokens, protocol)
  const id = getTokenIdFromName(allTokens, protocol)
  const tokenData = useTokenData(id, protocol)
  const { name, symbol, url, description, tvl, priceUSD, priceChangeUSD, logo, audits, category, tvlList: chartData, tokensInUsd } = tokenData
  let blockExplorerLink;
  let blockExplorerName;
  if (address.startsWith('bsc:')) {
    address = address.slice('bsc:'.length)
    blockExplorerLink = 'https://bscscan.com/address/' + address;
    blockExplorerName = 'Bscscan'
  } else if (address.startsWith('xdai:')) {
    address = address.slice('xdai:'.length)
    blockExplorerLink = 'https://blockscout.com/xdai/mainnet/address/' + address;
    blockExplorerName = 'BlockScout'
  } else if (address.startsWith('avax:')) {
    address = address.slice('avax:'.length)
    blockExplorerLink = 'https://cchain.explorer.avax.network/address/' + address;
    blockExplorerName = 'CChain Explorer'
  } else if (address.startsWith('wan:')) {
    address = address.slice('wan:'.length)
    blockExplorerLink = 'https://wanscan.org/token/' + address;
    blockExplorerName = 'Wanscan'
  } else {
    blockExplorerLink = 'https://etherscan.io/address/' + address;
    blockExplorerName = 'Etherscan'
  }

  // price
  const price = priceUSD ? formattedNum(priceUSD, true) : ''
  const priceChange = priceChangeUSD ? formattedPercent(priceChangeUSD) : ''

  const below1024 = useMedia('(max-width: 1024px)')
  const below800 = useMedia('(max-width: 800px)')
  const below600 = useMedia('(max-width: 600px)')
  const below500 = useMedia('(max-width: 500px)')

  // format for long symbol
  const LENGTH = below1024 ? 10 : 16
  const formattedSymbol = symbol?.length > LENGTH ? symbol.slice(0, LENGTH) + '...' : symbol

  const [savedTokens, addToken] = useSavedTokens()

  const fetchColor = (tokenAddress) => {

    if (name) {
      var path = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${isAddress(
        tokenAddress
      )}/logo.png`

      if (logo) {
        //replace twt image by actual logo
        path = logo
      }

      if (path) {
        Vibrant.from(path).getPalette((err, palette) => {
          if (palette && palette.Vibrant) {
            let detectedHex = palette.Vibrant.hex
            let AAscore = hex(detectedHex, '#FFF')
            while (AAscore < 3) {
              detectedHex = shade(0.005, detectedHex)
              AAscore = hex(detectedHex, '#FFF')
            }
            backgroundColor = detectedHex
          }
        })
      }
    }
  }

  useEffect(() => {
    if (window) {
      window.scrollTo({
        behavior: 'smooth',
        top: 0
      })
    }
  }, [])

  useEffect(() => {
    fetchColor(address)
  }, [address])

  document.title = `${name} Protocol: TVL and stats - DefiLlama`

  return (
    <PageWrapper>
      <ThemedBackground backgroundColor={transparentize(0.6, backgroundColor)} />

      <ContentWrapper>
        <RowBetween style={{ flexWrap: 'wrap', alingItems: 'start' }}>
          <AutoRow align="flex-end" style={{ width: 'fit-content' }}>
            <TYPE.body>
              <BasicLink to="/protocols">{'Protocols '}</BasicLink>→{' '}
            </TYPE.body>
            <Link
              style={{ width: 'fit-content' }}
              color={backgroundColor}
              external
              href={'https://etherscan.io/address/' + address}
            >
              <Text style={{ marginLeft: '.15rem' }} fontSize={'14px'} fontWeight={400}>
                {name}
              </Text>
            </Link>
          </AutoRow>
          {!below600 && <Search small={true} />}
        </RowBetween>

        <DashboardWrapper style={{ marginTop: below1024 ? '0' : '1rem' }}>
          <RowBetween style={{ flexWrap: 'wrap', marginBottom: '2rem', alignItems: 'flex-start' }}>
            <RowFixed style={{ flexWrap: 'wrap' }}>
              <RowFixed style={{ alignItems: 'baseline' }}>
                <TokenLogo address={address} logo={logo} size="32px" style={{ alignSelf: 'center' }} />
                <TYPE.main fontSize={below1024 ? '1.5rem' : '2rem'} fontWeight={500} style={{ margin: '0 1rem' }}>
                  <RowFixed gap="6px">
                    <FormattedName text={name ? name + ' ' : ''} maxCharacters={16} style={{ marginRight: '6px' }} />{' '}
                    {formattedSymbol ? `(${formattedSymbol})` : ''}
                  </RowFixed>
                </TYPE.main>{' '}
                {!below1024 && (
                  <>
                    <TYPE.main fontSize={'1.5rem'} fontWeight={500} style={{ marginRight: '1rem' }}>
                      {price}
                    </TYPE.main>
                    {priceChange}
                  </>
                )}
              </RowFixed>
            </RowFixed>
            <span>
              <RowFixed ml={below500 ? '0' : '2.5rem'} mt={below500 ? '1rem' : '0'}>
                {!!!savedTokens[address] && !below800 ? (
                  <Hover onClick={() => addToken(address, name)}>
                    <StyledIcon>
                      <PlusCircle style={{ marginRight: '0.5rem' }} />
                    </StyledIcon>
                  </Hover>
                ) : !below1024 ? (
                  <StyledIcon>
                    <Bookmark style={{ marginRight: '0.5rem', opacity: 0.4 }} />
                  </StyledIcon>
                ) : (
                  <></>
                )}
              </RowFixed>
            </span>
          </RowBetween>

          <>
            <PanelWrapper style={{ marginTop: below1024 ? '0' : '1rem', gridTemplateRows: 'auto' }}>
              {below1024 && price && (
                <Panel>
                  <AutoColumn gap="20px">
                    <RowBetween>
                      <TYPE.main>Price</TYPE.main>
                      <div />
                    </RowBetween>
                    <RowBetween align="flex-end">
                      {' '}
                      <TYPE.main fontSize={'1.5rem'} lineHeight={1} fontWeight={500}>
                        {price}
                      </TYPE.main>
                      <TYPE.main>{priceChange}</TYPE.main>
                    </RowBetween>
                  </AutoColumn>
                </Panel>
              )}
              <Panel>
                <AutoColumn gap="20px">
                  <RowBetween>
                    <TYPE.main>Description</TYPE.main>
                  </RowBetween>
                  <RowBetween align="flex-end">
                    <TYPE.main fontSize={'13px'} lineHeight={1} fontWeight={500}>
                      {description}
                    </TYPE.main>
                  </RowBetween>
                </AutoColumn>
              </Panel>
              <Panel>
                <AutoColumn gap="20px">
                  <RowBetween>
                    <TYPE.main>Total Value Locked </TYPE.main>
                  </RowBetween>
                  <RowBetween align="flex-end">
                    <TYPE.main fontSize={'1.5rem'} lineHeight={1} fontWeight={500}>
                      {formattedNum(tvl || '0', true)}
                    </TYPE.main>
                  </RowBetween>
                </AutoColumn>
              </Panel>
              <Panel>
                <AutoColumn gap="20px">
                  <RowBetween>
                    <TYPE.main>Links</TYPE.main>
                  </RowBetween>
                  <RowBetween align="flex-end">
                    <AutoColumn style={{ width: '100%' }}>
                      <Link style={{ width: '100%' }} color={backgroundColor} external href={url}>
                        <Text
                          style={{ fontSize: '1rem', textOverflow: 'ellipsis', overflow: 'hidden' }}
                          fontSize={'14px'}
                          fontWeight={400}
                        >
                          {url}
                        </Text>
                      </Link>
                    </AutoColumn>
                  </RowBetween>
                </AutoColumn>
              </Panel>
              <Panel style={{ gridColumn: below1024 ? '1' : '2/4', gridRow: below1024 ? '' : '1/4' }}>
                {chartData && (
                  <ProtocolChart
                    chartData={chartData}
                    protocol={name}
                    address={address}
                    color={backgroundColor}
                    tokensInUsd={tokensInUsd}
                    base={priceUSD}
                  />
                )}
                {!chartData && <Loader />}
              </Panel>
            </PanelWrapper>
          </>
          <>
            <RowBetween style={{ marginTop: '3rem' }}>
              <TYPE.main fontSize={'1.125rem'}>Protocol Information</TYPE.main>{' '}
            </RowBetween>
            <Panel
              rounded
              style={{
                marginTop: '1.5rem'
              }}
              p={20}
            >
              <TokenDetailsLayout>
                {typeof category === 'string' ?
                  <Column>
                    <TYPE.main>Category</TYPE.main>
                    <TYPE.main style={{ marginTop: '.5rem' }} fontSize={24} fontWeight="500">
                      <BasicLink to={`/protocols/${category.toLowerCase()}`}><FormattedName text={category} maxCharacters={16} /></BasicLink>
                    </TYPE.main>
                  </Column> :
                  <></>}
                <Column>
                  <TYPE.main>
                    <HeadHelp title="Audits" text="Audits are not a guarantee of security." />
                  </TYPE.main>
                  <TYPE.main style={{ marginTop: '.5rem' }} fontSize={24} fontWeight="500">
                    <AuditInfo audits={audits} />
                  </TYPE.main>
                </Column>


              </TokenDetailsLayout>
            </Panel>

            {address && (
              <RowBetween style={{ marginTop: '3rem' }}>
                <TYPE.main fontSize={'1.125rem'}>Token Information</TYPE.main>{' '}
              </RowBetween>
            )}
            {address && (
              <Panel
                rounded
                style={{
                  marginTop: '1.5rem'
                }}
                p={20}
              >
                <TokenDetailsLayout>
                  <Column>
                    <TYPE.main>Symbol</TYPE.main>
                    <Text style={{ marginTop: '.5rem' }} fontSize={24} fontWeight="500">
                      <FormattedName text={symbol} maxCharacters={12} />
                    </Text>
                  </Column>
                  <Column>
                    <TYPE.main>Name</TYPE.main>
                    <TYPE.main style={{ marginTop: '.5rem' }} fontSize={24} fontWeight="500">
                      <FormattedName text={name} maxCharacters={16} />
                    </TYPE.main>
                  </Column>
                  <Column>
                    <TYPE.main>Address</TYPE.main>
                    <AutoRow align="flex-end">
                      <TYPE.main style={{ marginTop: '.5rem' }} fontSize={24} fontWeight="500">
                        {address && address.slice(0, 8) + '...' + address?.slice(36, 42)}
                      </TYPE.main>
                      <CopyHelper toCopy={address} />
                    </AutoRow>
                  </Column>
                  <ButtonLight color={backgroundColor}>
                    <Link color={backgroundColor} external href={blockExplorerLink}>
                      View on {blockExplorerName} ↗
                    </Link>
                  </ButtonLight>
                </TokenDetailsLayout>
              </Panel>
            )}
          </>
        </DashboardWrapper>
      </ContentWrapper>
    </PageWrapper>
  )
}

export default withRouter(TokenPage)
