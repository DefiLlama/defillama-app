import React from 'react'
import { getOraclePageData, revalidate } from 'utils/dataApi'
import { GeneralLayout } from 'layout'
import ParentTokenView from 'components/ParentTokenView'

export async function getStaticProps({ params: { oracle } }) {
  const data = await getOraclePageData(oracle)

  return {
    ...data,
    revalidate: revalidate(),
  }
}

export async function getStaticPaths() {
  const { oracles = {} } = await getOraclePageData()

  const oraclesList = Object.keys(oracles)

  const paths = oraclesList.map((oracle) => {
    return {
      params: { oracle },
    }
  })

  return { paths, fallback: 'blocking' }
}

export default function Oracles(props) {
  return (
    <GeneralLayout title={`Oracles - DefiLlama`} defaultSEO>
      <ParentTokenView header="Total Value Secured (USD)" {...props} />
    </GeneralLayout>
  )
}
