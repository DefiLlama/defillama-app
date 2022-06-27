import Layout from 'layout'
import PageHeader from 'components/PageHeader'
import { YieldsSearch } from 'components/Search'
import { getAggregatedData, revalidate } from 'utils/dataApi'
import dynamic from 'next/dynamic'
import React from 'react'

interface IChartProps {
  chartData: any
}

const ScatterChart = dynamic(() => import('components/TokenChart/ScatterChart'), {
  ssr: false,
}) as React.FC<IChartProps>

export async function getStaticProps() {
  const data = await getAggregatedData()

  return {
    props: {
      pools: data,
    },
    revalidate: revalidate(),
  }
}

export default function Protocols({ pools }) {
  return (
    <Layout title={`Plots - DefiLlama Yield`} defaultSEO>
      <YieldsSearch step={{ category: 'Yields', name: 'All projects' }} />
      <PageHeader title="Plots" />
      <ScatterChart chartData={pools}></ScatterChart>
    </Layout>
  )
}
