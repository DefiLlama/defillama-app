import React from 'react'
import Layout from 'layout'
import { getChainsPageData, revalidate } from 'utils/dataApi'
import ChainsContainer from 'containers/ChainsContainer'

export async function getStaticProps() {
  const data = await getChainsPageData('All')
  return {
    ...data,
    revalidate: revalidate(),
  }
}

export default function Chains(props) {
  return (
    <Layout title={`All Chains TVL - DefiLlama`} defaultSEO>
      <ChainsContainer {...props} />
    </Layout>
  )
}
