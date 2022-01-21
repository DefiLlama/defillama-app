import React from 'react'
import { GeneralLayout } from 'layout'
import ChainsPageView from 'components/ChainsPageView'

import { getChainsPageData, revalidate } from 'utils/dataApi'

export async function getStaticProps() {
  const data = await getChainsPageData('All')
  return {
    ...data,
    revalidate: revalidate(),
  }
}

export default function Chains(props) {
  return (
    <GeneralLayout title={`Chain TVL - DefiLlama`} defaultSEO>
      <ChainsPageView {...props} />
    </GeneralLayout>
  )
}
