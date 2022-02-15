import React, { useMemo } from 'react'
import { getRandomColor, toK } from 'utils'

import { Box } from 'rebass'
import styled from 'styled-components'

import { PageWrapper, FullWrapper } from 'components'
import Search from 'components/Search'
import { ChainPieChart, ChainDominanceChart } from 'components/Charts'
import Filters from 'components/Filters'
import Panel from 'components/Panel'
import { CustomLink } from 'components/Link'
import { Header } from 'Theme'
import { AllTvlOptions } from 'components/SettingsModal'
import { useCalcGroupExtraTvlsByDay } from 'hooks/data'
import HeadHelp from 'components/HeadHelp'

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

export default function GroupedTokens({
  tokens,
  tokenLinks,
  chartData,
  tokensProtocols,
  tokenUrlPrefix,
  header,
  columnHeaders = [],
}) {
  const tokenColors = useMemo(
    () => Object.fromEntries([...tokens, 'Others'].map((token) => [token, getRandomColor()])),
    [tokens]
  )

  const { data: stackedData, daySum } = useCalcGroupExtraTvlsByDay(chartData)

  const { tokenTvls, tokensList } = useMemo(() => {
    const tvls = Object.entries(stackedData[stackedData.length - 1])
      .filter((item) => item[0] !== 'date')
      .map((token) => ({ name: token[0], value: token[1] }))
      .sort((a, b) => b.value - a.value)

    const otherTvl = tvls.slice(5).reduce((total, entry) => {
      return (total += entry.value)
    }, 0)

    const tokenTvls = tvls.slice(0, 5).concat({ name: 'Others', value: otherTvl })

    const tokensList = tvls.map(({ name, value }) => {
      return { name, protocolsSecured: tokensProtocols[name], tvlSecured: value }
    })

    return { tokenTvls, tokensList }
  }, [stackedData, tokensProtocols])

  return (
    <PageWrapper>
      <FullWrapper>
        <Search />
        <AllTvlOptions style={{ display: 'flex', justifyContent: 'center' }} />
        <Header>{header}</Header>
        <ChartsWrapper>
          <ChainPieChart data={tokenTvls} chainColor={tokenColors} />
          <ChainDominanceChart
            stackOffset="expand"
            formatPercent={true}
            stackedDataset={stackedData}
            chainsUnique={tokens}
            chainColor={tokenColors}
            daySum={daySum}
          />
        </ChartsWrapper>
        <Filters filterOptions={tokenLinks} activeLabel="All" />
        <Panel style={{ overflowX: 'auto', padding: ' 12px 20px' }}>
          <Table>
            <thead>
              <TableRow>
                <Index></Index>
                {columnHeaders.map((header) => (
                  typeof header==="string"? <TableHeader key={header}>{header}</TableHeader>:
                    <TableHeader key={header.header}> <HeadHelp title={header.header} text={header.help} /></TableHeader>
                ))}
              </TableRow>
            </thead>
            <tbody>
              {tokensList.map((token, index) => (
                <TableRow key={token.name}>
                  <Index>{index + 1}</Index>
                  <TableHeader>
                    <CustomLink href={`/${tokenUrlPrefix}/${token.name}`}>{token.name}</CustomLink>
                  </TableHeader>
                  <TableDesc>{token.protocolsSecured}</TableDesc>
                  <TableDesc>{'$' + toK(token.tvlSecured)}</TableDesc>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </Panel>
      </FullWrapper>
    </PageWrapper>
  )
}
