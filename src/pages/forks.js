import React, { useMemo } from 'react'
import { getForkPageData, revalidate } from '../utils/dataApi'
import Layout from '../layout'
import Table, { Index } from 'components/Table'
import { useCalcGroupExtraTvlsByDay, useCalcStakePool2Tvl } from 'hooks/data'
import { getRandomColor, toK } from 'utils'
import { CustomLink } from 'components/Link'
import styled from 'styled-components'
import Search from 'components/Search'
import { AllTvlOptions } from 'components/SettingsModal'
import { Header } from 'Theme'
import { ChainDominanceChart, ChainPieChart } from 'components/Charts'
import Filters, { FiltersWrapper } from 'components/Filters'
import { Box } from 'rebass'

export async function getStaticProps() {
  const data = await getForkPageData()

  return {
    ...data,
    revalidate: revalidate(),
  }
}

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

const PageView = ({ chartData, tokensProtocols, tokens, tokenLinks, parentTokens }) => {
  const tokenColors = useMemo(
    () => Object.fromEntries([...tokens, 'Others'].map((token) => [token, getRandomColor()])),
    [tokens]
  )

  const forkedTokensData = useCalcStakePool2Tvl(parentTokens)

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
      const tokenTvl = forkedTokensData.find((p) => p.name.toLowerCase() === name.toLowerCase())?.tvl ?? null
      const ftot = tokenTvl ? (value / tokenTvl) * 100 : null

      return { name, forkedProtocols: tokensProtocols[name], tvl: value, ftot: ftot }
    })

    return { tokenTvls, tokensList }
  }, [stackedData, tokensProtocols, forkedTokensData])

  const columns = useMemo(
    () => [
      {
        header: 'Name',
        accessor: 'name',
        disableSortBy: true,
        Cell: ({ value, rowIndex }) => {
          return (
            <Index>
              <span>{rowIndex + 1}</span>
              <CustomLink href={`/forks/${value}`}>{value}</CustomLink>
            </Index>
          )
        },
      },
      {
        header: 'Forked Protocols',
        accessor: 'forkedProtocols',
      },
      {
        header: 'TVL',
        accessor: 'tvl',
        Cell: ({ value }) => <>{'$' + toK(value)}</>,
      },
      {
        header: 'Forks TVL / Original TVL',
        accessor: 'ftot',
        Cell: ({ value }) => <>{value && value.toFixed(2) + '%'}</>,
      },
    ],
    []
  )

  return (
    <>
      <Search />
      <AllTvlOptions style={{ display: 'flex', justifyContent: 'center' }} />
      <Header>Total Value Locked All Forks</Header>
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

      <FiltersWrapper>
        <Filters filterOptions={tokenLinks} activeLabel="All" />
      </FiltersWrapper>

      <Table columns={columns} data={tokensList} />
    </>
  )
}

export default function Forks(props) {
  return (
    <Layout title={`Forks - DefiLlama`} defaultSEO>
      <PageView {...props} />
    </Layout>
  )
}
