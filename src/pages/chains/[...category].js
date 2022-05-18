import React from 'react'
import { GeneralLayout } from 'layout'
import { getChainsPageData, revalidate } from 'utils/dataApi'
import { CONFIG_API } from 'constants/index'
import ChainsContainer from 'containers/ChainsContainer'

export async function getStaticProps({
  params: {
    category: [category],
  },
}) {
  const data = await getChainsPageData(category)
  return {
    ...data,
    revalidate: revalidate(),
  }
}

export async function getStaticPaths() {
  const { chainCoingeckoIds = {} } = await fetch(CONFIG_API).then((res) => res.json())

  const categories = ['All', 'Non-EVM']
  for (const chain in chainCoingeckoIds) {
    chainCoingeckoIds[chain].categories?.forEach((category) => {
      if (!categories.includes(category)) {
        categories.push(category)
      }
    })
  }

  const paths = categories.map((category) => ({
    params: { category: [category] },
  }))

  return { paths, fallback: 'blocking' }
}

export default function Chains(props) {
  const { category } = props
  return (
    <GeneralLayout title={`${category} TVL - DefiLlama`} defaultSEO>
      <ChainsContainer {...props} />
    </GeneralLayout>
  )
}
