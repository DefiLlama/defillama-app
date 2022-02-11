import React from 'react'
import { getForkPageData, revalidate } from '../utils/dataApi'

import { GeneralLayout } from '../layout'
import GroupedTokens from 'components/GroupedParentTokens'

export async function getStaticProps() {
  const data = await getForkPageData()

  return {
    ...data,
    revalidate: revalidate(),
  }
}

export default function Forks(props) {
  return (
    <GeneralLayout title={`Forks - DefiLlama`} defaultSEO>
      <GroupedTokens header="Total Volume Locked All Forks" tokenUrlPrefix="forks" {...props} />
    </GeneralLayout>
  )
}
