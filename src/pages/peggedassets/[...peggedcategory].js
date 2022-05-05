import PeggedsList from 'components/PeggedList'
import { PEGGEDS_API } from 'constants/index'
import { GeneralLayout } from 'layout'
import { getPeggedsPageData, revalidate } from 'utils/dataApi'
import { capitalizeFirstLetter } from 'utils'

export async function getStaticProps({
  params: {
    peggedcategory: [peggedcategory, chain]
  }
}) {
  const props = await getPeggedsPageData(peggedcategory, chain)

  if (props.filteredProtocols.length === 0) {
    return {
      notFound: true
    }
  }
  return {
    props,
    revalidate: revalidate()
  }
}

export async function getStaticPaths() {
  const res = await fetch(PEGGEDS_API)

  const paths = (await res.json()).peggedCategories.map(category => ({
    params: { peggedcategory: [category.toLowerCase()] }
  }))

  return { paths, fallback: 'blocking' }
}

export default function PeggedAssets({ peggedcategory, chains, filteredProtocols, chartData, stackedDataset, chain }) {
  return (
    <GeneralLayout title={`${capitalizeFirstLetter(peggedcategory)} Circulating - DefiLlama`} defaultSEO>
      <PeggedsList
        category={peggedcategory}
        chains={chains}
        selectedChain={chain}
        filteredProtocols={filteredProtocols}
        chartData={chartData}
        stackedDataset={stackedDataset}
      />
    </GeneralLayout>
  )
}
