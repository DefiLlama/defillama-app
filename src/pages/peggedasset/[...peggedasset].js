import React from 'react'
import { GeneralLayout } from 'layout'
import { getPeggedChainsPageData, revalidate, getPeggedAssets } from 'utils/peggedDataApi'
import PeggedContainer from 'containers/PeggedContainer'
import { standardizeProtocolName } from 'utils'

export async function getStaticProps({
  params: {
    peggedasset: [peggedasset, cat = 'All'],
  },
}) {

  const data = await getPeggedChainsPageData(cat, peggedasset)
  const {chainsUnique, chainTvls, category, categories, stackedDataset, pegType} = data.props
  return {
    props: {
    chainsUnique,
    chainTvls,
    category,
    categories,
    stackedDataset,
    peggedasset,
    pegType,
    },
    revalidate: revalidate(),
    
  }
}

export async function getStaticPaths() {
  const res = await getPeggedAssets()

  const paths = res.peggedAssets.map(({ name }) => ({
    params: { peggedasset: [standardizeProtocolName(name)] },
  }))

  return { paths, fallback: 'blocking' }
}

export default function PeggedAsset(props) {
  return (
    <GeneralLayout title={`All Chains Pegged Asset - DefiLlama`} defaultSEO>
      <PeggedContainer {...props} />
    </GeneralLayout>
  )
}
