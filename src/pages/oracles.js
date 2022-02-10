import React from 'react'
import { getOraclePageData, revalidate } from '../utils/dataApi'

import { GeneralLayout } from '../layout'
import GroupedTokens from 'components/GroupedParentTokens'

export async function getStaticProps() {
  const data = await getOraclePageData()

  return {
    ...data,
    revalidate: revalidate(),
  }
}

export default function Oracles(props) {
  return (
    <GeneralLayout title={`Oracles - DefiLlama`} defaultSEO>
      <GroupedTokens header="Total Volume Secured All Oracles" tokenUrlPrefix="oracles" {...props} />
    </GeneralLayout>
  )
}
