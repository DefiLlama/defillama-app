import React, { useMemo } from 'react'
import { getOraclePageData, revalidate } from '../utils/dataApi'
import { getRandomColor, toK } from 'utils'

import { Box } from 'rebass'
import styled from 'styled-components'

import { GeneralLayout } from '../layout'
import { PageWrapper, FullWrapper } from 'components'
import Search from 'components/Search'
import { ChainPieChart, ChainDominanceChart } from 'components/Charts'
import Filters from 'components/Filters'
import Panel from 'components/Panel'
import { CustomLink } from 'components/Link'
import { Header } from 'Theme'

const ChartsWrapper = styled(Box)`
  display: flex;
  flex-wrap: nowrap;
  width: 100%;
  padding: 0;
  align-items: center;
  z-index: 1;
  @media (max-width: 800px) {
    display: grid;
    grid-auto-rows: auto;
  }
`
const Table = styled.table`
  border-collapse: collapse;
`
const TableRow = styled.tr`
  border-bottom: 1px solid;
  border-color: ${({ theme }) => theme.divider};

  & > * {
    padding: 14px 0;
  }
`

const TableHeader = styled.th`
  text-align: end;
  color: ${({ theme }) => theme.text1};
  font-size: 14px;
  font-weight: 500;

  &:nth-child(2) {
    text-align: start;
  }
`
const TableDesc = styled.td`
  text-align: end;
  color: ${({ theme }) => theme.text1};
  font-size: 14px;
  padding-left: 16px;
`

const Index = styled.td`
  text-align: start;
  color: ${({ theme }) => theme.text1};

  @media screen and (max-width: 600px) {
    padding-right: 12px;
  }
`

export async function getStaticProps() {
  const data = await getOraclePageData()

  return {
    ...data,
    revalidate: revalidate(),
  }
}

export default function Oracles({ daySum, oracles, chartData = [], oracleLinks, oraclesProtocols }) {
  const oracleColors = useMemo(
    () => Object.fromEntries([...oracles, 'Others'].map((oracle) => [oracle, getRandomColor()])),
    [oracles]
  )
  const { oracleTvls, oraclesList } = useMemo(() => {
    const tvls = Object.entries(chartData[chartData.length - 1])
      .filter((oracle) => oracle[0] !== 'date')
      .map((oracle) => ({ name: oracle[0], value: oracle[1] }))
      .sort((a, b) => b.value - a.value)

    const otherTvl = tvls.slice(10).reduce((total, entry) => {
      return (total += entry.value)
    }, 0)

    const oracleTvls = tvls.slice(0, 10).concat({ name: 'Others', value: otherTvl })

    const oraclesList = tvls.map(({ name, value }) => {
      return { name, protocolsSecured: oraclesProtocols[name], tvlSecured: value }
    })

    return { oracleTvls, oraclesList }
  }, [chartData, oraclesProtocols])

  return (
    <GeneralLayout title={`Oracles - DefiLlama`} defaultSEO>
      <PageWrapper>
        <FullWrapper>
          <Search />
          {/* <AllTvlOptions style={{ display: 'flex', justifyContent: 'center' }} /> */}
          <Header>Total Volume Secured All Oracles</Header>
          <ChartsWrapper>
            <ChainPieChart data={oracleTvls} chainColor={oracleColors} />
            <ChainDominanceChart
              stackOffset="expand"
              formatPercent={true}
              stackedDataset={chartData}
              chainsUnique={oracles}
              chainColor={oracleColors}
              daySum={daySum}
            />
          </ChartsWrapper>
          <Filters filterOptions={oracleLinks} activeLabel="All" />
          <Panel style={{ overflowX: 'auto', padding: ' 12px 20px' }}>
            <Table>
              <thead>
                <TableRow>
                  <Index></Index>
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Protocols Secured</TableHeader>
                  <TableHeader>Total Volume Secured</TableHeader>
                </TableRow>
              </thead>
              <tbody>
                {oraclesList.map((oracle, index) => (
                  <TableRow key={oracle.name}>
                    <Index>{index}</Index>
                    <TableHeader>
                      <CustomLink href={`/oracles/${oracle.name}`}>{oracle.name}</CustomLink>
                    </TableHeader>
                    <TableDesc>{oracle.protocolsSecured}</TableDesc>
                    <TableDesc>{'$' + toK(oracle.tvlSecured)}</TableDesc>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </Panel>
        </FullWrapper>
      </PageWrapper>
    </GeneralLayout>
  )
}
