import React from 'react'
import dynamic from 'next/dynamic'
import { Text, Box } from 'rebass'
import styled, { css } from 'styled-components'
import { transparentize } from 'polished'
import AuditInfo from 'components/AuditInfo'
import Bookmark from 'components/Bookmark'
import { ButtonLight } from 'components/ButtonStyled'
import Column, { AutoColumn } from 'components/Column'
import CopyHelper from 'components/Copy'
import FormattedName from 'components/FormattedName'
import HeadHelp from 'components/HeadHelp'
import Link, { BasicLink } from 'components/Link'
import { AutoRow, RowBetween, RowFixed } from 'components/Row'
import Search from 'components/Search'
import { AllTvlOptions } from 'components/SettingsModal'
import TokenLogo from 'components/TokenLogo'

import { useCalcSingleExtraTvl } from '../../hooks/data'
import { useScrollToTop, useProtocolColor } from 'hooks'
import { TYPE, ThemedBackground } from 'Theme'
import { formattedNum, getBlockExplorer, toK } from 'utils'
import SEO from 'components/SEO'
import { Box as RebassBox } from 'rebass'

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

const panelPseudo = css`
  :after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    height: 10px;
  }
  @media only screen and (min-width: 40em) {
    :after {
      content: unset;
    }
  }
`

const Panel = styled(RebassBox)`
  position: relative;
  background-color: ${({ theme }) => theme.advancedBG};
  padding: 1.25rem;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.bg3};
  box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.05);  /* box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.01), 0px 4px 8px rgba(0, 0, 0, 0.01), 0px 16px 24px rgba(0, 0, 0, 0.01), 0px 24px 32px rgba(0, 0, 0, 0.01); */
  :hover {
      cursor: ${({ hover }) => hover && 'pointer'};
      border: ${({ hover, theme }) => hover && '1px solid' + theme.bg5};
    }
  ${props => props.background && `background-color: ${props.theme.advancedBG};`}
  ${props => (props.area ? `grid-area: ${props.area};` : null)}
  ${props =>
    props.grouped &&
    css`
      @media only screen and (min-width: 40em) {
        &:first-of-type {
          border-radius: 20px 20px 0 0;
        }
        &:last-of-type {
          border-radius: 0 0 20px 20px;
        }
      }
    `}
  ${props =>
    props.rounded &&
    css`
      border-radius: 8px;
      @media only screen and (min-width: 40em) {
        border-radius: 10px;
      }
    `};
  ${props => !props.last && panelPseudo}
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

const TableHead = styled.th`
  text-align: start;
  font-weight: 400;
  display: flex;
  justify-content: space-between;
  & > span:last-child {
    margin: 0 4px;
  }
`

function ToggleAlert({ chainTvls }) {
  const isLowerCase = (letter) => letter === letter.toLowerCase()
  const extraTvls = Object.keys(chainTvls).filter((section) => isLowerCase(section[0]))
  if (extraTvls.length === 0) {
    return null
  }
  return (
    <Panel background={true} style={{ textAlign: 'center', marginBottom: '1rem', marginTop: '-1rem' }}>
      <TYPE.main fontWeight={400}>
        This protocol has some TVL that's classified as {extraTvls.join('/')}, enable the toggles to see it
      </TYPE.main>
    </Panel>
  )
}

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
    module: codeModule,
    isHourlyChart,
  } = protocolData
  const backgroundColor = useProtocolColor({ protocol, logo, transparent: false })
  const { blockExplorerLink, blockExplorerName } = getBlockExplorer(address)

  const totalVolume = useCalcSingleExtraTvl(chainTvls, tvl)

  // TODO check if we still need to format long symbols?

  const hasToken = address !== null && address !== '-'

  const tvlByChain = Object.entries(chainTvls || {})

  return (
    <>
      <SEO cardName={name} token={name} logo={logo} tvl={formattedNum(totalVolume, true)} />
      <ThemedBackground backgroundColor={transparentize(0.6, backgroundColor)} />

      <RowBetween flexWrap="wrap">
        <AutoRow align="flex-end" style={{ width: 'fit-content' }}>
          <TYPE.body>
            <BasicLink href="/protocols">{'Protocols '}</BasicLink>→{' '}
          </TYPE.body>
          <Text style={{ marginLeft: '.15rem' }} fontSize={'14px'} fontWeight={400} color={backgroundColor}>
            {name}
          </Text>
        </AutoRow>
        <HiddenSearch>
          <Search small={true} />
        </HiddenSearch>
      </RowBetween>

      <DashboardWrapper mt={[0, 0, '1rem']}>
        <ToggleAlert chainTvls={chainTvls} />
        <RowBetween style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <RowFixed style={{ flexWrap: 'wrap' }}>
            <RowFixed style={{ alignItems: 'baseline' }}>
              <TokenLogo address={address} logo={logo} size={32} style={{ alignSelf: 'center' }} />
              <TYPE.main fontSize={['1.5rem', '1.5rem', '2rem']} fontWeight={500} style={{ margin: '0 1rem' }}>
                <RowFixed gap="6px">
                  <FormattedName text={name ? name + ' ' : ''} maxCharacters={16} style={{ marginRight: '6px' }} />{' '}
                  {symbol !== '-' ? '$' + symbol : ''}
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
        <AllTvlOptions style={{ display: 'flex', justifyContent: 'center' }} />
        <>
          <PanelWrapper style={{ gridTemplateRows: 'auto', margin: '0 0 3rem 0' }}>
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
              <AutoColumn gap="md">
                <TYPE.main>Total Value Locked </TYPE.main>
                <TYPE.main fontSize={'1.5rem'} lineHeight={1} fontWeight={500}>
                  {formattedNum(totalVolume || '0', true)}
                </TYPE.main>
              </AutoColumn>
              {tvlByChain.length > 0 && (
                <TYPE.main>
                  <table style={{ margin: '1.25rem 0 0' }}>
                    <tbody>
                      {tvlByChain.map((chainTvl) =>
                        chainTvl[0].includes('-') ? null : (
                          <tr key={chainTvl[0]}>
                            <TableHead>
                              <span>{chainTvl[0]}</span>
                              <span>:</span>
                            </TableHead>
                            <td>${toK(chainTvl[1] || 0)}</td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </TYPE.main>
              )}
            </Panel>
            <Panel>
              <AutoColumn gap="20px">
                <RowBetween>
                  <TYPE.main>Links</TYPE.main>
                </RowBetween>
                <RowBetween align="flex-end">
                  <AutoColumn style={{ width: '100%' }}>
                    <Link color={backgroundColor} external href={`https://api.llama.fi/dataset/${protocol}.csv`}>
                      <ButtonLight useTextColor={true} color={backgroundColor} style={{ marginRight: '1rem' }}>
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
                gridRow: ['', '', '', '1/4'],
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
                isHourlyChart={isHourlyChart}
              />
            </Panel>
          </PanelWrapper>
        </>

        <>
          <RowBetween>
            <TYPE.main fontSize={'1.125rem'}>Protocol Information</TYPE.main>{' '}
          </RowBetween>
          <Panel
            rounded
            style={{
              marginTop: '1.5rem',
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
                  <ButtonLight useTextColor={true} color={backgroundColor} style={{ marginRight: '1rem' }}>
                    Twitter ↗
                  </ButtonLight>
                </Link>
                <Link color={backgroundColor} external href={url}>
                  <ButtonLight useTextColor={true} color={backgroundColor} style={{ marginRight: '1rem' }}>
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
              marginTop: '1.5rem',
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
                <ButtonLight useTextColor={true} color={backgroundColor}>
                  Check the code ↗
                </ButtonLight>
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
                marginTop: '1.5rem',
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
                  {protocolData.gecko_id !== null && (
                    <Link
                      color={backgroundColor}
                      style={{ marginRight: '.5rem' }}
                      external
                      href={`https://www.coingecko.com/en/coins/${protocolData.gecko_id}`}
                    >
                      <ButtonLight useTextColor={true} color={backgroundColor}>
                        View on CoinGecko ↗
                      </ButtonLight>
                    </Link>
                  )}
                  {blockExplorerLink !== undefined && (
                    <Link color={backgroundColor} external href={blockExplorerLink}>
                      <ButtonLight useTextColor={true} color={backgroundColor}>
                        View on {blockExplorerName} ↗
                      </ButtonLight>
                    </Link>
                  )}
                </RowFixed>
              </TokenDetailsLayout>
            </Panel>
          )}
        </>
      </DashboardWrapper>

    </>
  )
}

export default ProtocolContainer