import React, { useEffect } from 'react'
import { useMedia } from 'react-use'
import { PlusCircle, Bookmark } from 'react-feather'
import { Text } from 'rebass'
import styled from 'styled-components'

import { Hover, PageWrapper, ContentWrapper, StyledIcon } from 'components'
import AuditInfo from 'components/AuditInfo'
import { ButtonLight } from 'components/ButtonStyled'
import Column, { AutoColumn } from 'components/Column'
import CopyHelper from 'components/Copy'
import FormattedName from 'components/FormattedName'
import HeadHelp from 'components/HeadHelp'
import Link, { BasicLink } from 'components/Link'
import Loader from 'components/LocalLoader'
import Panel from 'components/Panel'
import ProtocolChart from 'components/ProtocolChart'
import { AutoRow, RowBetween, RowFixed } from 'components/Row'
import Search from 'components/Search'
import { CheckMarks } from 'components/SettingsModal'
import TokenLogo from 'components/TokenLogo'

import { useSavedTokens, useStakingManager, usePool2Manager } from 'contexts/LocalStorage'
import { useScrollToTop, useProtocolColor } from 'hooks'
import { TYPE, ThemedBackground } from 'Theme'
import { formattedNum, formattedPercent, getBlockExplorer } from 'utils'

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
      display: table-row;
      > * {
        margin-bottom: 1rem;
      }
    }

    &:last-child {
      align-items: start;
      justify-items: start;
    }
  }
`
function ProtocolContainer({ protocolData, protocol, denomination, selectedChain }) {
  useScrollToTop()
  console.log(protocolData, 'protocolData')
  let {
    address = '',
    name,
    symbol,
    url,
    description,
    tvl,
    priceUSD,
    priceChangeUSD,
    misrepresentedTokens,
    logo,
    audits,
    category,
    tvlList: chartData,
    tokensInUsd,
    tokens,
    twitter,
    chains,
    chainTvls,
    historicalChainTvls,
    audit_links,
    methodology,
    module: codeModule
  } = protocolData
  const backgroundColor = useProtocolColor({ protocol, logo })
  const { blockExplorerLink, blockExplorerName } = getBlockExplorer(address)

  const [stakingEnabled] = useStakingManager()
  const [pool2Enabled] = usePool2Manager()
  if (chainTvls.staking && stakingEnabled) {
    tvl += chainTvls.staking
  }
  if (chainTvls.pool2 && pool2Enabled) {
    tvl += chainTvls.pool2
  }

  // price
  const price = priceUSD ? formattedNum(priceUSD, true) : ''
  const priceChange = priceChangeUSD ? formattedPercent(priceChangeUSD) : ''

  const below1600 = useMedia('(max-width: 1650px)')
  const below1024 = useMedia('(max-width: 1024px)')
  const below800 = useMedia('(max-width: 800px)')
  const below600 = useMedia('(max-width: 600px)')
  const below500 = useMedia('(max-width: 500px)')
  const below900 = useMedia('(max-width: 900px)')

  // TODO check if we still need to format long symbols?

  const [savedTokens, addToken] = useSavedTokens()

  return (
    <PageWrapper>
      <ThemedBackground backgroundColor={backgroundColor} />
      <ContentWrapper>
        <RowBetween style={{ flexWrap: 'wrap', alingItems: 'start' }}>
          <AutoRow align="flex-end" style={{ width: 'fit-content' }}>
            <TYPE.body>
              <BasicLink href="/protocols">{'Protocols '}</BasicLink>→{' '}
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
                    {symbol}
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
                {!savedTokens[address] && !below800 ? (
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
            {/* <PanelWrapper style={{ marginTop: below1024 ? '0' : '1rem', gridTemplateRows: 'auto' }}>
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
                  <CheckMarks />
                  <RowBetween align="flex-end">
                    <TYPE.main fontSize={'1.5rem'} lineHeight={1} fontWeight={500}>
                      {formattedNum(tvl || '0', true)}
                    </TYPE.main>
                    <TYPE.main>
                      <div>
                        {Object.entries(chainTvls).map(chainTvl =>
                          chainTvl[0].includes('-') ? null : (
                            <div key={chainTvl[0]} style={{ justifyContent: 'space-between', display: 'flex' }}>
                              <span>{chainTvl[0]}:&nbsp;</span> <span>{formattedNum(chainTvl[1] || '0', true)}</span>
                            </div>
                          )
                        )}
                      </div>
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
                    denomination={denomination}
                    small={below900 || (!below1024 && below1600)}
                    chartData={chartData}
                    misrepresentedTokens={misrepresentedTokens}
                    protocol={name}
                    address={address}
                    color={backgroundColor}
                    tokens={tokens}
                    tokensInUsd={tokensInUsd}
                    base={priceUSD}
                    selectedChain={selectedChain}
                    chainTvls={historicalChainTvls}
                    chains={chains}
                    protocolData={protocolData}
                  />
                )}
                {!chartData && <Loader />}
              </Panel>
            </PanelWrapper> */}
          </>
          <>
            {/* <RowBetween style={{ marginTop: '3rem' }}>
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
                {typeof category === 'string' ? (
                  <Column>
                    <TYPE.main>Category</TYPE.main>
                    <TYPE.main style={{ marginTop: '.5rem' }} fontSize={24} fontWeight="500">
                      <BasicLink to={`/protocols/${category.toLowerCase()}`}>
                        <FormattedName text={category} maxCharacters={16} />
                      </BasicLink>
                    </TYPE.main>
                  </Column>
                ) : (
                  <></>
                )}
                <Column>
                  <TYPE.main>
                    <HeadHelp title="Audits" text="Audits are not a guarantee of security." />
                  </TYPE.main>
                  <TYPE.main style={{ marginTop: '.5rem' }} fontSize={24} fontWeight="500">
                    <AuditInfo audits={audits} auditLinks={audit_links} />
                  </TYPE.main>
                </Column>
                <div></div>
                <RowFixed>
                  <Link color={backgroundColor} external href={`https://twitter.com/${twitter}`}>
                    <ButtonLight color={backgroundColor} style={{ marginRight: '1rem' }}>
                      Twitter ↗
                    </ButtonLight>
                  </Link>
                  <Link color={backgroundColor} external href={`http://api.llama.fi/dataset/${protocol}.csv`}>
                    <ButtonLight color={backgroundColor} style={{ marginRight: '1rem' }}>
                      Download dataset ↗
                    </ButtonLight>
                  </Link>
                </RowFixed>
              </TokenDetailsLayout>
            </Panel> */}

            {/* <RowBetween style={{ marginTop: '3rem' }}>
              <TYPE.main fontSize={'1.125rem'}>Methodology</TYPE.main>{' '}
            </RowBetween>
            <Panel
              rounded
              style={{
                marginTop: '1.5rem'
              }}
              p={20}
            >
              {methodology && (
                <TokenDetailsLayout style={{ marginBottom: '1em' }}>
                  <TYPE.main style={{ textAlign: 'justify', wordBreak: 'break-word' }} fontSize={15} fontWeight="500">
                    {methodology}
                  </TYPE.main>
                </TokenDetailsLayout>
              )}
              <RowFixed>
                <Link
                  color={backgroundColor}
                  external
                  href={`https://github.com/DefiLlama/DefiLlama-Adapters/tree/main/projects/${codeModule}`}
                >
                  <ButtonLight color={backgroundColor}>Check the code ↗</ButtonLight>
                </Link>
              </RowFixed>
            </Panel> */}

            {/* {address && (
              <RowBetween style={{ marginTop: '3rem' }}>
                <TYPE.main fontSize={'1.125rem'}>Token Information</TYPE.main>{' '}
              </RowBetween>
            )} */}
            {/* {address && (
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
                  <RowFixed>
                    <Link
                      color={backgroundColor}
                      style={{ marginRight: '.5rem' }}
                      external
                      href={`https://www.coingecko.com/en/coins/${protocolData.gecko_id}`}
                    >
                      <ButtonLight color={backgroundColor}>View on CoinGecko ↗</ButtonLight>
                    </Link>
                    <Link color={backgroundColor} external href={blockExplorerLink}>
                      <ButtonLight color={backgroundColor}>View on {blockExplorerName} ↗</ButtonLight>
                    </Link>
                  </RowFixed>
                </TokenDetailsLayout>
              </Panel>
            )} */}
          </>
        </DashboardWrapper>
      </ContentWrapper>
    </PageWrapper>
  )
}

export default ProtocolContainer
