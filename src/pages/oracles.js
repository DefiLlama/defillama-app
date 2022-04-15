import React from 'react'
import { GeneralLayout } from 'layout'
import { getPeggedChainsPageData, revalidate } from 'utils/peggedDataApi'
import PeggedContainer from 'containers/PeggedContainer'

export async function getStaticProps() {
  const data = await getPeggedChainsPageData('All')
  return {
    ...data,
    revalidate: revalidate(),
  }
}

export default function Chains(props) {
  return (
    <GeneralLayout title={`All Chains Pegged Asset - DefiLlama`} defaultSEO>
      <PeggedContainer {...props} />
    </GeneralLayout>
  )
}
