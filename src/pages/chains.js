import React from 'react'
import { GeneralLayout } from 'layout'
import { getChainsPageData, revalidate } from 'utils/dataApi'
import ChainsPageView from 'components/ChainsPageView'

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
