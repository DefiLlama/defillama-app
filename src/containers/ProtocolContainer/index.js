import React from 'react'
import dynamic from 'next/dynamic'
import { Text, Box } from 'rebass'
import styled from 'styled-components'
import { transparentize } from 'polished'

import { PageWrapper, ContentWrapper } from 'components'
import AuditInfo from 'components/AuditInfo'
import Bookmark from 'components/Bookmark'
import { ButtonLight } from 'components/ButtonStyled'
import Column, { AutoColumn } from 'components/Column'
import CopyHelper from 'components/Copy'
import FormattedName from 'components/FormattedName'
import HeadHelp from 'components/HeadHelp'
import Link, { BasicLink } from 'components/Link'
import Panel from 'components/Panel'
import { AutoRow, RowBetween, RowFixed } from 'components/Row'
import Search from 'components/Search'
import { CheckMarks } from 'components/SettingsModal'
import TokenLogo from 'components/TokenLogo'

import { useStakingManager, usePool2Manager } from 'contexts/LocalStorage'
import { useScrollToTop, useProtocolColor } from 'hooks'
import { TYPE, ThemedBackground } from 'Theme'
import { formattedNum, getBlockExplorer, toK } from 'utils'

const ProtocolChart = dynamic(() => import('components/ProtocolChart'), { ssr: false })

const DashboardWrapper = styled(Box)`
  width: 100%;
`

const HiddenSearch = styled.span`
  @media screen and (max-width: ${({ theme }) => theme.bpSm}) {
    display: none;
  }
`

const HiddenBookmark = styled.span`
  @media screen and (max-width: ${({ theme }) => theme.bpLg}) {
    display: none;
  }
`

const PanelWrapper = styled(Box)`
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

const TotalValueLockedWrap = styled(RowBetween)`
  @media only screen and (max-width: ${({ theme: { bpXl } }) => bpXl}) and (min-width: ${({ theme: { bpLg } }) =>
      bpLg}) {
    flex-direction: column-reverse;
  }
`

function ProtocolContainer({ protocolData, protocol, denomination, selectedChain }) {
  useScrollToTop()

  let {
    address = '',
    name,
    symbol,
    url,
    description,
    tvl,
    priceUSD,
    misrepresentedTokens,
    logo,
    audits,
    category,
    tvlList: chartData,
    tokensInUsd,
    tokens,
    twitter,
    chains,
    chainTvls = {},
    historicalChainTvls,
    audit_links,
    methodology,
    module: codeModule
  } = protocolData
  const backgroundColor = useProtocolColor({ protocol, logo, transparent: false })
  const { blockExplorerLink, blockExplorerName } = getBlockExplorer(address)

  const [stakingEnabled] = useStakingManager()
  const [pool2Enabled] = usePool2Manager()
  if (chainTvls.staking && stakingEnabled) {
    tvl += chainTvls.staking
  }
  if (chainTvls.pool2 && pool2Enabled) {
    tvl += chainTvls.pool2
  }

  // TODO check if we still need to format long symbols?

  const hasToken = address !== null && address !== '-'

  return (
    <PageWrapper>
      <ThemedBackground backgroundColor={transparentize(0.6, backgroundColor)} />
      <ContentWrapper>
        <RowBetween flexWrap="wrap">
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
          <HiddenSearch>
            <Search small={true} />
          </HiddenSearch>
        </RowBetween>

        <DashboardWrapper mt={[0, 0, '1rem']}>
          <RowBetween style={{ flexWrap: 'wrap', marginBottom: '2rem', alignItems: 'flex-start' }}>
            <RowFixed style={{ flexWrap: 'wrap' }}>
              <RowFixed style={{ alignItems: 'baseline' }}>
                <TokenLogo address={address} logo={logo} size={32} style={{ alignSelf: 'center' }} />
                <TYPE.main fontSize={['1.5rem', '1.5rem', '2rem']} fontWeight={500} style={{ margin: '0 1rem' }}>
                  <RowFixed gap="6px">
                    <FormattedName text={name ? name + ' ' : ''} maxCharacters={16} style={{ marginRight: '6px' }} />{' '}
                    {symbol}
                  </RowFixed>
                </TYPE.main>{' '}
              </RowFixed>
            </RowFixed>
            <HiddenBookmark>
              <RowFixed ml={[0, '2.5rem']} mt={['1rem', '0']}>
                <Bookmark readableProtocolName={name} />
              </RowFixed>
            </HiddenBookmark>
          </RowBetween>
          <>
            <PanelWrapper mt={[0, 0, '1rem']} style={{ gridTemplateRows: 'auto' }}>
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
                  <TotalValueLockedWrap align="flex-end">
                    <TYPE.main fontSize={'1.5rem'} lineHeight={1} fontWeight={500}>
                      {formattedNum(tvl || '0', true)}
                    </TYPE.main>
                    <TYPE.main>
                      <div>
                        {Object.entries(chainTvls).map(chainTvl =>
                          chainTvl[0].includes('-') ? null : (
                            <div key={chainTvl[0]} style={{ justifyContent: 'space-between', display: 'flex' }}>
                              <span>{chainTvl[0]}:&nbsp;</span> <span>{toK(chainTvl[1] || 0)}</span>
                            </div>
                          )
                        )}
                      </div>
                    </TYPE.main>
                  </TotalValueLockedWrap>
                </AutoColumn>
              </Panel>
              <Panel>
                <AutoColumn gap="20px">
                  <RowBetween>
                    <TYPE.main>Links</TYPE.main>
                  </RowBetween>
                  <RowBetween align="flex-end">
                    <AutoColumn style={{ width: '100%' }}>
                      <Link color={backgroundColor} external href={`http://api.llama.fi/dataset/${protocol}.csv`}>
                        <ButtonLight color={backgroundColor} style={{ marginRight: '1rem' }}>
                          Download dataset ↗
                        </ButtonLight>
                      </Link>
                    </AutoColumn>
                  </RowBetween>
                </AutoColumn>
              </Panel>
              <Panel
                sx={{
                  gridColumn: ['1', '1', '1', '2/4'],
                  gridRow: ['', '', '', '1/4']
                }}
              >
                <ProtocolChart
                  denomination={denomination}
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
                {typeof category === 'string' && (
                  <Column>
                    <TYPE.main>Category</TYPE.main>
                    <TYPE.main style={{ marginTop: '.5rem' }} fontSize={24} fontWeight="500">
                      <BasicLink href={`/protocols/${category.toLowerCase()}`}>
                        <FormattedName text={category} maxCharacters={16} />
                      </BasicLink>
                    </TYPE.main>
                  </Column>
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
                  <Link color={backgroundColor} external href={url}>
                    <ButtonLight color={backgroundColor} style={{ marginRight: '1rem' }}>
                      Website ↗
                    </ButtonLight>
                  </Link>
                </RowFixed>
              </TokenDetailsLayout>
            </Panel>

            <RowBetween style={{ marginTop: '3rem' }}>
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
            </Panel>

            {hasToken && (
              <RowBetween style={{ marginTop: '3rem' }}>
                <TYPE.main fontSize={'1.125rem'}>Token Information</TYPE.main>{' '}
              </RowBetween>
            )}
            {hasToken && (
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
            )}
          </>
        </DashboardWrapper>
      </ContentWrapper>
    </PageWrapper>
  )
}

export default ProtocolContainer
