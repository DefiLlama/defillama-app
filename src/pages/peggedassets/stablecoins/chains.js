import Layout from '~/layout'
import PeggedChainsOverview from '~/components/PeggedChainsOverview'
import { capitalizeFirstLetter } from '~/utils'
import { getPeggedChainsPageData, revalidate } from '~/utils/dataApi'

export async function getStaticProps() {
  const props = await getPeggedChainsPageData('stablecoins')

  if (!props.chainCirculatings || props.chainCirculatings?.length === 0) {
    return {
      notFound: true,
    }
  }
  return {
    props,
    revalidate: revalidate(),
  }
}

export default function PeggedAssets({
  peggedcategory,
  chainCirculatings,
  chartData,
  peggedAreaChainData,
  peggedAreaMcapData,
  stackedDataset,
  peggedChartType,
  chainList,
  chainsGroupbyParent,
}) {
  return (
    <Layout title={`${capitalizeFirstLetter(peggedcategory)} Circulating - DefiLlama`} defaultSEO>
      <PeggedChainsOverview
        category={peggedcategory}
        chainCirculatings={chainCirculatings}
        chartData={chartData}
        peggedAreaChainData={peggedAreaChainData}
        peggedAreaMcapData={peggedAreaMcapData}
        stackedDataset={stackedDataset}
        peggedChartType={peggedChartType}
        chainList={chainList}
        chainsGroupbyParent={chainsGroupbyParent}
      />
    </Layout>
  )
}
