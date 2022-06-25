import Layout from '~/layout'
import PeggedList from '~/components/PeggedList'
import { capitalizeFirstLetter } from '~/utils'
import { getPeggedOverviewPageData, revalidate } from '~/utils/dataApi'
import { PEGGEDS_API } from '~/constants/index'

export async function getStaticProps({
  params: {
    peggedcategory: [peggedcategory, chain],
  },
}) {
  const props = await getPeggedOverviewPageData(peggedcategory, chain)

  if (!props.filteredPeggedAssets || props.filteredPeggedAssets?.length === 0) {
    return {
      notFound: true,
    }
  }
  return {
    props,
    revalidate: revalidate(),
  }
}

export async function getStaticPaths() {
  const res = await fetch(PEGGEDS_API)

  const paths = (await res.json()).peggedCategories.slice(0, 20).map((category) => ({
    params: { peggedcategory: [category.toLowerCase()] },
  }))

  return { paths, fallback: 'blocking' }
}

export default function PeggedAssets({
  peggedcategory,
  chains,
  filteredPeggedAssets,
  chartData,
  peggedAreaChartData,
  peggedAreaMcapData,
  stackedDataset,
  peggedChartType,
  chain,
}) {
  return (
    <Layout title={`${capitalizeFirstLetter(peggedcategory)} Circulating - DefiLlama`} defaultSEO>
      <PeggedList
        category={peggedcategory}
        chains={chains}
        selectedChain={chain}
        filteredPeggedAssets={filteredPeggedAssets}
        chartData={chartData}
        peggedAreaChartData={peggedAreaChartData}
        peggedAreaMcapData={peggedAreaMcapData}
        stackedDataset={stackedDataset}
        peggedChartType={peggedChartType}
      />
    </Layout>
  )
}
