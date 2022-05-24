import React from 'react'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { transparentize } from 'polished'
import { ButtonLight } from 'components/ButtonStyled'
import CopyHelper from 'components/Copy'
import FormattedName from 'components/FormattedName'
import Link, { BasicLink } from 'components/Link'
import TokenLogo from 'components/TokenLogo'
import { useCalcSingleExtraTvl } from '../../hooks/data'
import { useScrollToTop, useProtocolColor } from 'hooks'
import { capitalizeFirstLetter, formattedNum, getBlockExplorer, toK } from 'utils'
import SEO from 'components/SEO'
import Search from 'components/Search/New'
import { useFetchProtocolsList } from 'utils/dataApi'
import Layout from 'layout'
import { Panel } from 'components'
import { ArrowUpRight, ChevronDown } from 'react-feather'
import { DropdownMenu } from '@radix-ui/react-dropdown-menu'
import { DefaultMenuButton, DefaultMenuItem, DropdownMenuContent } from 'components/DropdownMenu'
import HeadHelp from 'components/HeadHelp'

const ProtocolChart = dynamic(() => import('components/ProtocolChart'), { ssr: false })

const Stats = styled.section`
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  background: ${({ theme }) => theme.bg6};
  border: ${({ theme }) => "1px solid " + theme.divider};

  & > *:last-child {
    padding: 22px;
    display: flex;
    width: 100%;
  }

  @media screen and (min-width: 75.5rem) {
    flex-direction: row;
  }
`

const ProtocolDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 36px;
  padding: 24px;
  color: ${({ theme }) => theme.text1};
  border-radius: 12px;
  background: ${({ theme }) => theme.bg7};
  min-height: 360px;


  ${({ theme: { minLg } }) => minLg} {
    min-width: 380px;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }
`

const ProtocolName = styled.h1`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.25rem;
  margin: 0;
  padding: 0;
`

const Name = styled(FormattedName)`
  font-weight: 700;
`

const Symbol = styled.span`
  font-weight: 400;
`

const Table = styled.table`
  border-collapse: collapse;

  caption {
    font-weight: 400;
    font-size: 0.75rem;
    text-align: left;
    padding: 0 0 4px 0;
    color: ${({ isDark }) => isDark ? '#818585' : '#969b9b'}
  }

  th {
    font-weight: 600;
    font-size: 1rem;
    text-align: start;
    padding: 4px 0 0 0;
  }

  td {
    font-weight: 400;
    font-size: 0.875rem;
    text-align: right;
    padding: 4px 0 0 0;
    font-family: 'JetBrains Mono', monospace;

    button {
      margin-left: auto;
      font-family: 'Inter var', sans-serif;
    }
  }
`

const Tvl = styled.p`
  font-weight: 700;
  font-size: 2rem;
  padding: 0;
  margin: -28px 0 0;
`

const SectionHeader = styled.h2`
  font-weight: 700;
  font-size: 1.25rem;
  margin: 0 0 24px;
  border: 1px solid transparent;
`

const InfoWrapper = styled.div`
  padding: 24px;  
  background: ${({ theme }) => theme.bg7};
  border: ${({ theme }) => "1px solid " + theme.divider};
  border-radius: 12px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: repeat(3, auto);

  ${({ theme: { minLg } }) => minLg} {
    grid-template-rows: repeat(2, auto);
  }
`

const Section = styled.section`
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px 0;

  h3 {
    font-weight: 600;
    font-size: 1.125rem;
    margin: 0;
    padding: 0;
  }

  &:not(:first-of-type) {
    border-top: ${({ theme }) => "1px solid " + theme.text5};
  }

  &:first-of-type {
    padding-top: 0;
  }

  &:last-of-type {
    padding-bottom: 0;
  }

  p {
    margin: 0;
    line-height: 1.5rem;
  }

  ${({ theme: { minLg } }) => minLg} {
    h3:not(:first-of-type) {
      margin-top: 24px;
    }
    
    &:nth-child(1) {
      grid-column: 1 / 2;
    }

    &:nth-child(2) {
      grid-column: 1 / 2;
      padding-bottom: 0;
    }

    &:nth-child(3) {
      grid-row: 1 / -1;
      grid-column: 2 / 3;
      border-top: 0;
      border-left: ${({ theme }) => "1px solid " + theme.text5};
      padding: 0 0 0 24px;
      margin-left: 24px;
    }
  }
`

const LinksWrapper = styled.section`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
`

const Button = styled(ButtonLight)`
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 8px 12px;
  font-weight: 400;
  border: none;
  white-space: nowrap;
`

const Address = styled.p`
  display: flex;
  align-items: center;
  margin: 0;
  gap: 8px;
`

const Audits = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
`


function ToggleAlert({ chainTvls }) {
  const isLowerCase = (letter) => letter === letter.toLowerCase()
  const extraTvls = Object.keys(chainTvls).filter((section) => isLowerCase(section[0]))
  if (extraTvls.length === 0) {
    return null
  }
  return (
    <Panel background={true} style={{ textAlign: 'center' }}>
      <p style={{ margin: "0" }}>
        This protocol has some TVL that's classified as {extraTvls.join('/')}, enable the toggles to see it
      </p>
    </Panel>
  )
}

// TODO bookmakrt and percent change
function ProtocolContainer({ title, protocolData, protocol, denomination, selectedChain }) {
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

  const tvlByChain = Object.entries(chainTvls || {})

  const { data, loading } = useFetchProtocolsList()

  return (
    <Layout title={title} backgroundColor={transparentize(0.6, backgroundColor)} style={{ gap: "48px" }}>
      <SEO cardName={name} token={name} logo={logo} tvl={formattedNum(totalVolume, true)} />

      <Search data={data} loading={loading} step={{ category: 'Protocols', name }} />

      <ToggleAlert chainTvls={chainTvls} />

      <Stats>
        <ProtocolDetails>
          <ProtocolName>
            <TokenLogo address={address} logo={logo} size={24} />
            <Name text={name ? name + ' ' : ''} maxCharacters={16} />
            <Symbol>{symbol !== '-' ? `(${symbol})` : ''}</Symbol>
          </ProtocolName>

          <Tvl>
            {formattedNum(totalVolume || '0', true)}
          </Tvl>

          {tvlByChain.length > 0 && (
            <Table>
              <caption>Breakdown</caption>
              <tbody>
                {tvlByChain.map((chainTvl) =>
                  chainTvl[0].includes('-') ? null : (
                    <tr key={chainTvl[0]}>
                      <th>
                        {capitalizeFirstLetter(chainTvl[0])}
                      </th>
                      <td>${toK(chainTvl[1] || 0)}</td>
                    </tr>
                  )
                )}
              </tbody>
            </Table>
          )}

          <Table>
            <caption>{category && 'Category'}</caption>
            <tbody>
              <tr>
                <th>
                  {category &&
                    <BasicLink href={`/protocols/${category.toLowerCase()}`}>
                      <FormattedName text={category} maxCharacters={16} />
                    </BasicLink>
                  }
                </th>
                <td>
                  <Link color={backgroundColor} external href={`https://api.llama.fi/dataset/${protocol}.csv`} passHref>
                    <Button useTextColor={true} color={backgroundColor}>
                      <span>Download Dataset</span>
                      <ArrowUpRight size={14} />
                    </Button>
                  </Link>
                </td>
              </tr>
            </tbody>
          </Table>
        </ProtocolDetails>
        <div>
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
        </div>
      </Stats>

      <section>
        <SectionHeader>Information</SectionHeader>
        <InfoWrapper>
          <Section>
            <h3>Protocol Information</h3>
            <p>{description}</p>
            <Audits>
              <HeadHelp title="Audits" text="Audits are not a guarantee of security." />{" : "}
              <DropdownMenu>
                <DefaultMenuButton disabled={audits <= 0}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{audits > 0 ? "Yes" : "No"}</span>
                  <ChevronDown size={16} style={{ flexShrink: '0' }} />
                </DefaultMenuButton>
                <DropdownMenuContent sideOffset={5} style={{ maxWidth: "300px" }}>
                  {audit_links?.map((d) => (
                    <DefaultMenuItem key={d}>
                      <a href={d} target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>{d}</a>
                    </DefaultMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </Audits>
            <LinksWrapper>
              <Link external href={url} passHref>
                <Button useTextColor={true} color={backgroundColor}>
                  <span>Website</span> <ArrowUpRight size={14} />
                </Button>
              </Link>
              <Link external href={`https://twitter.com/${twitter}`} passHref>
                <Button useTextColor={true} color={backgroundColor}>
                  <span>Twitter</span> <ArrowUpRight size={14} />
                </Button>
              </Link>
            </LinksWrapper>
          </Section>
          <Section>
            <h3>Token Information</h3>
            <Address><span>Address: {address ? address.slice(0, 8) + '...' + address?.slice(36, 42) : "-"}</span> <CopyHelper toCopy={address} disabled={!address} /></Address>
            <LinksWrapper>
              {protocolData.gecko_id !== null && (
                <Link
                  external
                  href={`https://www.coingecko.com/en/coins/${protocolData.gecko_id}`}
                  passHref
                >
                  <Button useTextColor={true} color={backgroundColor}>
                    <span>View on CoinGecko</span> <ArrowUpRight size={14} />
                  </Button>
                </Link>
              )}
              {blockExplorerLink !== undefined && (
                <Link external href={blockExplorerLink} passHref>
                  <Button useTextColor={true} color={backgroundColor}>
                    <span>View on {blockExplorerName}</span> <ArrowUpRight size={14} />
                  </Button>
                </Link>
              )}
            </LinksWrapper>
          </Section>
          <Section>
            <h3>Methodology</h3>
            <p>{methodology}</p>
            <LinksWrapper>
              <Link
                external
                href={`https://github.com/DefiLlama/DefiLlama-Adapters/tree/main/projects/${codeModule}`}
              >
                <Button useTextColor={true} color={backgroundColor}>
                  <span>Check the code</span><ArrowUpRight size={14} />
                </Button>
              </Link>
            </LinksWrapper>
          </Section>
        </InfoWrapper>
      </section>
    </Layout>
  )
}

export default ProtocolContainer