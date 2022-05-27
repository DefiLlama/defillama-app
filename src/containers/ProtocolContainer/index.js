import React, { useRef } from 'react'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { transparentize } from 'polished'
import { ButtonLight } from 'components/ButtonStyled'
import CopyHelper from 'components/Copy'
import FormattedName from 'components/FormattedName'
import TokenLogo from 'components/TokenLogo'
import { useCalcSingleExtraTvl } from '../../hooks/data'
import { useScrollToTop } from 'hooks'
import { capitalizeFirstLetter, formattedNum, getBlockExplorer, toK, toNiceDate, toNiceMonthlyDate } from 'utils'
import SEO from 'components/SEO'
import Search from 'components/Search/New'
import Layout from 'layout'
import { Panel } from 'components'
import { ArrowUpRight } from 'react-feather'
import AuditInfo from 'components/AuditInfo'
import Link from 'next/link'

const AreaChart = dynamic(() => import('components/TokenChart/AreaChart'), { ssr: false })

const Stats = styled.section`
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  background: ${({ theme }) => theme.bg6};
  border: ${({ theme }) => '1px solid ' + theme.divider};
  box-shadow: ${({ theme }) => theme.shadowSm};

  @media (min-width: 80rem) {
    flex-direction: row;
  }
`

const ProtocolDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 36px;
  padding: 24px;
  padding-bottom: calc(24px + 0.4375rem);
  color: ${({ theme }) => theme.text1};
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  background: ${({ theme }) => theme.bg7};
  overflow: auto;

  @media (min-width: 80rem) {
    min-width: 380px;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    border-bottom-left-radius: 12px;
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
    color: ${({ isDark }) => (isDark ? '#818585' : '#969b9b')};
  }

  th {
    font-weight: 600;
    font-size: 1rem;
    text-align: start;
    padding: 4px 4px 0 0;
  }

  td {
    font-weight: 400;
    font-size: 0.875rem;
    text-align: right;
    padding: 4px 0 0 4px;
    font-family: var(--font-jetbrains);
  }

  a {
    color: inherit;

    :focus-visible {
      outline: ${({ theme }) => '1px solid ' + theme.text4};
    }
  }
`

const Tvl = styled.p`
  font-weight: 700;
  font-size: 2rem;
  padding: 0;
  margin: -28px 0 0;
`

const Category = styled.section`
  display: flex;
  flex-wrap: wrap;
  gap: calc(36px - 0.4375rem);
  align-items: flex-end;
  justify-content: space-between;
`

const SectionHeader = styled.h2`
  font-weight: 700;
  font-size: 1.25rem;
  margin: 0 0 24px;
  border-left: 1px solid transparent;
`

const InfoWrapper = styled.div`
  padding: 24px;
  background: ${({ theme }) => theme.bg7};
  border: ${({ theme }) => '1px solid ' + theme.divider};
  border-radius: 12px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: repeat(3, auto);
  box-shadow: ${({ theme }) => theme.shadowSm};

  @media (min-width: 80rem) {
    grid-template-rows: repeat(2, auto);
  }
`

const Section = styled.section`
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px 0;
  border-bottom: 1px solid transparent;

  h3 {
    font-weight: 600;
    font-size: 1.125rem;
    margin: 0;
    padding: 0;
  }

  &:not(:first-of-type) {
    border-top: ${({ theme }) => '1px solid ' + theme.text5};
  }

  &:first-of-type {
    padding-top: 0;
  }

  &:last-of-type {
    padding-bottom: 0;
    border-bottom: none;
  }

  p {
    margin: 0;
    line-height: 1.5rem;
  }

  @media (min-width: 80rem) {
    h3:not(:first-of-type) {
      margin-top: 24px;
    }

    &:nth-child(1) {
      grid-column: 1 / 2;
      border-right: 1px solid transparent;
    }

    &:nth-child(2) {
      grid-column: 1 / 2;
      padding-bottom: 0;
      border-right: 1px solid transparent;
      border-bottom: none;
    }

    &:nth-child(3) {
      grid-row: 1 / -1;
      grid-column: 2 / 3;
      border-top: 0;
      border-left: ${({ theme }) => '1px solid ' + theme.text5};
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
  font-size: 0.875rem;
  font-weight: 400;
  border: none;
  white-space: nowrap;
  font-family: var(--font-inter);

  :focus-visible {
    outline: ${({ theme }) => '1px solid ' + theme.text4};
  }
`

const DownloadButton = styled(Button)`
  position: relative;
  top: 0.4375rem;
`

const Address = styled.p`
  display: flex;
  align-items: center;
  margin: 0;
  gap: 8px;
`

function ToggleAlert({ tvlBreakdowns }) {
  const isLowerCase = (letter) => letter === letter.toLowerCase()
  const extraTvls = Object.keys(tvlBreakdowns).filter((section) => isLowerCase(section[0]))
  if (extraTvls.length === 0) {
    return null
  }
  return (
    <Panel style={{ margin: '-22px 1px' }}>
      <p style={{ margin: '0', textAlign: 'center' }}>
        This protocol has some TVL that's classified as {extraTvls.join('/')}, enable the toggles to see it
      </p>
    </Panel>
  )
}

// TODO bookmark and percent change
function ProtocolContainer({ title, protocolData, protocol, backgroundColor }) {
  useScrollToTop()

  let {
    address = '',
    name,
    symbol,
    url,
    description,
    tvl,
    logo,
    audits,
    category,
    twitter,
    tvlBreakdowns = {},
    tvlChartData,
    audit_links,
    methodology,
    module: codeModule,
  } = protocolData

  const { blockExplorerLink, blockExplorerName } = getBlockExplorer(address)

  const totalVolume = useCalcSingleExtraTvl(tvlBreakdowns, tvl)

  const tvlByChain = Object.entries(tvlBreakdowns || {})

  const formatDate = (date) => (tvlChartData?.length > 120 ? toNiceMonthlyDate(date) : toNiceDate(date))

  return (
    <Layout title={title} backgroundColor={transparentize(0.6, backgroundColor)} style={{ gap: '48px' }}>
      <SEO cardName={name} token={name} logo={logo} tvl={formattedNum(totalVolume, true)} />

      <Search step={{ category: 'Protocols', name }} />

      <ToggleAlert tvlBreakdowns={tvlBreakdowns} />

      <Stats>
        <ProtocolDetails>
          <ProtocolName>
            <TokenLogo address={address} logo={logo} size={24} />
            <Name text={name ? name + ' ' : ''} maxCharacters={16} />
            <Symbol>{symbol !== '-' ? `(${symbol})` : ''}</Symbol>
          </ProtocolName>

          <Tvl>{formattedNum(totalVolume || '0', true)}</Tvl>

          {tvlByChain.length > 0 && (
            <Table>
              <caption>Breakdown</caption>
              <tbody>
                {tvlByChain.map((chainTvl) =>
                  chainTvl[0].includes('-') ? null : (
                    <tr key={chainTvl[0]}>
                      <th>{capitalizeFirstLetter(chainTvl[0])}</th>
                      <td>${toK(chainTvl[1] || 0)}</td>
                    </tr>
                  )
                )}
              </tbody>
            </Table>
          )}

          <Category>
            {category && (
              <Table>
                <caption>Category</caption>
                <tbody>
                  <tr>
                    <th>
                      <Link href={`/protocols/${category.toLowerCase()}`}>{category}</Link>
                    </th>
                  </tr>
                </tbody>
              </Table>
            )}

            <Link external href={`https://api.llama.fi/dataset/${protocol}.csv`} passHref>
              <DownloadButton as="a" useTextColor={true} color={backgroundColor}>
                <span>Download Dataset</span>
                <ArrowUpRight size={14} />
              </DownloadButton>
            </Link>
          </Category>
        </ProtocolDetails>

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '24px 0',
            minHeight: '448px',
          }}
        >
          <AreaChart
            finalChartData={tvlChartData}
            formatDate={formatDate}
            color={backgroundColor}
            tokensUnique={[]}
            title=""
          />
        </div>
      </Stats>

      <section>
        <SectionHeader>Information</SectionHeader>
        <InfoWrapper>
          <Section>
            <h3>Protocol Information</h3>
            <p>{description}</p>
            <AuditInfo audits={audits} auditLinks={audit_links} color={backgroundColor} />
            <LinksWrapper>
              <Link external href={url} passHref>
                <Button as="a" useTextColor={true} color={backgroundColor}>
                  <span>Website</span> <ArrowUpRight size={14} />
                </Button>
              </Link>
              <Link external href={`https://twitter.com/${twitter}`} passHref>
                <Button as="a" useTextColor={true} color={backgroundColor}>
                  <span>Twitter</span> <ArrowUpRight size={14} />
                </Button>
              </Link>
            </LinksWrapper>
          </Section>
          <Section>
            <h3>Token Information</h3>
            <Address>
              {address ? (
                <>
                  <span>Address</span>
                  <span>:</span>
                  <span>{address.slice(0, 8) + '...' + address?.slice(36, 42)}</span>
                  <CopyHelper toCopy={address} disabled={!address} />
                </>
              ) : (
                'No Token'
              )}
            </Address>
            <LinksWrapper>
              {protocolData.gecko_id !== null && (
                <Link external href={`https://www.coingecko.com/en/coins/${protocolData.gecko_id}`} passHref>
                  <Button as="a" useTextColor={true} color={backgroundColor}>
                    <span>View on CoinGecko</span> <ArrowUpRight size={14} />
                  </Button>
                </Link>
              )}
              {blockExplorerLink !== undefined && (
                <Link external href={blockExplorerLink} passHref>
                  <Button as="a" useTextColor={true} color={backgroundColor}>
                    <span>View on {blockExplorerName}</span> <ArrowUpRight size={14} />
                  </Button>
                </Link>
              )}
            </LinksWrapper>
          </Section>
          <Section>
            <h3>Methodology</h3>
            {methodology && <p>{methodology}</p>}
            <LinksWrapper>
              <Link
                external
                href={`https://github.com/DefiLlama/DefiLlama-Adapters/tree/main/projects/${codeModule}`}
                passHref
              >
                <Button as="a" useTextColor={true} color={backgroundColor}>
                  <span>Check the code</span>
                  <ArrowUpRight size={14} />
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
