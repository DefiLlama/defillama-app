import React, { useState } from 'react'
import styled from 'styled-components'
import { transparentize } from 'polished'
import { ButtonLight } from 'components/ButtonStyled'
import CopyHelper from 'components/Copy'
import FormattedName from 'components/FormattedName'
import TokenLogo from 'components/TokenLogo'
import { useCalcSingleExtraTvl } from '../../hooks/data'
import { useScrollToTop } from 'hooks'
import { capitalizeFirstLetter, formattedNum, getBlockExplorer, toK } from 'utils'
import SEO from 'components/SEO'
import Search from 'components/Search/New'
import Layout from 'layout'
import { ArrowUpRight, DownloadCloud } from 'react-feather'
import AuditInfo from 'components/AuditInfo'
import Link from 'next/link'
import ProtocolChart from 'components/TokenChart/ProtocolChart'
import boboLogo from '../../assets/boboSmug.png'
import Image from 'next/image'
import QuestionHelper from 'components/QuestionHelper'
import { useGetExtraTvlEnabled, useTvlToggles } from 'contexts/LocalStorage'

const Stats = styled.section`
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  background: ${({ theme }) => theme.bg6};
  border: ${({ theme }) => '1px solid ' + theme.divider};
  box-shadow: ${({ theme }) => theme.shadowSm};
  position: relative;
  isolation: isolate;

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

const Symbol = styled.span`
  font-weight: 400;
`

const Table = styled.table`
  border-collapse: collapse;

  caption,
  thead th {
    font-weight: 400;
    font-size: 0.75rem;
    text-align: left;
    padding: 0 0 4px 0;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#969b9b' : '#545757')};
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

  thead td {
    padding: 0 0 4px 0;
    > * {
      width: min-content;
      background: none;
      margin-left: auto;
      color: ${({ theme }) => theme.text1};
    }
  }
`

const Tvl = styled.p`
  font-weight: 700;
  font-size: 2rem;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;

  & > *:first-child {
    font-weight: 400;
    font-size: 0.75rem;
    text-align: left;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#969b9b' : '#545757')};
  }
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

  a {
    color: inherit;

    :focus-visible {
      outline: ${({ theme }) => '1px solid ' + theme.text4};
    }
  }

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

const FlexRow = styled.p`
  display: flex;
  align-items: center;
  margin: 0;
  gap: 8px;
`

const Bobo = styled.button`
  cursor: pointer;
  background: none;
  border: none;
  position: absolute;
  bottom: -36px;
  left: 0;

  :focus-visible {
    outline: ${({ theme }) => '1px solid ' + theme.text4};
  }

  @media (min-width: 80rem) {
    top: 0;
    right: 0;
    bottom: initial;
    left: initial;
    z-index: 1;
  }
`

const DownloadButton = styled(Button)`
  display: flex;
  align-items: center;
  color: inherit;
  padding: 8px 12px;
  border-radius: 10px;
  :focus-visible {
    outline: ${({ theme }) => '1px solid ' + theme.text4};
  }
`

const TvlWrapper = styled.section`
  display: flex;
  gap: 20px;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
`

const ExtraTvlOption = styled.label`
  display: flex;
  align-items: center;
  gap: 4px;

  input {
    margin: 0;
    padding: 0;
  }
`

interface IProtocolContainerProps {
  title: string
  protocol: string
  protocolData: any
  backgroundColor: string
}

const isLowerCase = (letter) => letter === letter.toLowerCase()

function ProtocolContainer({ title, protocolData, protocol, backgroundColor }: IProtocolContainerProps) {
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
    tvlBreakdowns = [],
    tvlByChain,
    tvlChartData,
    audit_links,
    methodology,
    module: codeModule,
    historicalChainTvls,
    chains = [],
  } = protocolData

  const { blockExplorerLink, blockExplorerName } = getBlockExplorer(address)

  const totalVolume = useCalcSingleExtraTvl(tvlBreakdowns, tvl)

  const [bobo, setBobo] = useState(false)

  const extraTvls = []
  const tvls = []

  tvlByChain.forEach((t) => {
    if (isLowerCase(t[0][0])) {
      extraTvls.push(t)
    } else !t[0].includes('-') && tvls.push(t)
  })

  const tvlToggles = useTvlToggles()
  const extraTvlsEnabled = useGetExtraTvlEnabled()

  return (
    <Layout title={title} backgroundColor={transparentize(0.6, backgroundColor)} style={{ gap: '48px' }}>
      <SEO cardName={name} token={name} logo={logo} tvl={formattedNum(totalVolume, true)?.toString()} />

      <Search step={{ category: 'Protocols', name, hideOptions: true }} />

      <Stats>
        <ProtocolDetails>
          <ProtocolName>
            <TokenLogo logo={logo} size={24} />
            <FormattedName text={name ? name + ' ' : ''} maxCharacters={16} fontWeight={700} />
            <Symbol>{symbol !== '-' ? `(${symbol})` : ''}</Symbol>
          </ProtocolName>

          <TvlWrapper>
            <Tvl>
              <span>Total Value Locked</span>
              <span>{formattedNum(totalVolume || '0', true)}</span>
            </Tvl>

            <Link href={`https://api.llama.fi/dataset/${protocol}.csv`} passHref>
              <DownloadButton as="a" color={backgroundColor}>
                <DownloadCloud size={14} />
                <span>&nbsp;&nbsp;.csv</span>
              </DownloadButton>
            </Link>
          </TvlWrapper>

          {tvls.length > 1 && (
            <Table>
              <caption>Breakdown</caption>
              <tbody>
                {tvls.map((chainTvl) => (
                  <tr key={chainTvl[0]}>
                    <th>{capitalizeFirstLetter(chainTvl[0])}</th>
                    <td>${toK(chainTvl[1] || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}

          {extraTvls.length > 0 && (
            <Table>
              <thead>
                <tr>
                  <th>Optional TVL Counts</th>
                  <td>
                    <QuestionHelper text='People define TVL differently. Instead of being opinionated, we give you the option to choose what you would include in a "real" TVL calculation' />
                  </td>
                </tr>
              </thead>
              <tbody>
                {extraTvls.map(([option, value]) => (
                  <tr key={option}>
                    <th>
                      <ExtraTvlOption>
                        <input
                          type="checkbox"
                          value={option}
                          checked={extraTvlsEnabled[option]}
                          onChange={tvlToggles(option)}
                        />
                        <span>{capitalizeFirstLetter(option)}</span>
                      </ExtraTvlOption>
                    </th>
                    <td>${toK(value)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </ProtocolDetails>

        <ProtocolChart
          protocol={protocol}
          tvlChartData={tvlChartData}
          color={backgroundColor}
          historicalChainTvls={historicalChainTvls}
          chains={chains}
          bobo={bobo}
        />

        <Bobo onClick={() => setBobo(!bobo)}>
          <Image src={boboLogo} width={34} height={34} alt="" />
        </Bobo>
      </Stats>

      <section>
        <SectionHeader>Information</SectionHeader>
        <InfoWrapper>
          <Section>
            <h3>Protocol Information</h3>
            <p>{description}</p>

            <FlexRow>
              {category && (
                <>
                  <span>Category</span>
                  <span>:</span>
                  <Link href={`/protocols/${category.toLowerCase()}`}>{category}</Link>
                </>
              )}
            </FlexRow>

            <AuditInfo audits={audits} auditLinks={audit_links} color={backgroundColor} />

            <LinksWrapper>
              <Link href={url} passHref>
                <Button as="a" useTextColor={true} color={backgroundColor}>
                  <span>Website</span> <ArrowUpRight size={14} />
                </Button>
              </Link>
              <Link href={`https://twitter.com/${twitter}`} passHref>
                <Button as="a" useTextColor={true} color={backgroundColor}>
                  <span>Twitter</span> <ArrowUpRight size={14} />
                </Button>
              </Link>
            </LinksWrapper>
          </Section>
          <Section>
            <h3>Token Information</h3>

            <FlexRow>
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
            </FlexRow>

            <LinksWrapper>
              {protocolData.gecko_id !== null && (
                <Link href={`https://www.coingecko.com/en/coins/${protocolData.gecko_id}`} passHref>
                  <Button as="a" useTextColor={true} color={backgroundColor}>
                    <span>View on CoinGecko</span> <ArrowUpRight size={14} />
                  </Button>
                </Link>
              )}
              {blockExplorerLink !== undefined && (
                <Link href={blockExplorerLink} passHref>
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
              <Link href={`https://github.com/DefiLlama/DefiLlama-Adapters/tree/main/projects/${codeModule}`} passHref>
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
