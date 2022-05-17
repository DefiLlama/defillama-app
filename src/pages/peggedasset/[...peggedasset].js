import React from 'react'
import { GeneralLayout } from 'layout'
import { getPeggedChainsPageData, revalidate, getPeggedAssets } from 'utils/dataApi'
import PeggedContainer from 'containers/PeggedContainer'
import { standardizeProtocolName } from 'utils'

export async function getStaticProps({
  params: {
    peggedasset: [peggedasset, cat = 'All'],
  },
}) {
  const data = await getPeggedChainsPageData(cat, peggedasset)
  const {
    chainsUnique,
    chainCirculatings,
    category,
    categories,
    stackedDataset,
    peggedSymbol,
    pegType,
    chainsGroupbyParent,
  } = data.props
  return {
    props: {
      chainsUnique,
      chainCirculatings,
      category,
      categories,
      stackedDataset,
      peggedSymbol,
      pegType,
      chainsGroupbyParent,
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
