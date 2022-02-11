import React from 'react'
import { getForkPageData, revalidate } from 'utils/dataApi'
import { GeneralLayout } from 'layout'
import ParentTokenView from 'components/ParentTokenView'

export async function getStaticProps({ params: { fork } }) {
  const data = await getForkPageData(fork)

  return {
    ...data,
    revalidate: revalidate(),
  }
}

export async function getStaticPaths() {
  const { forks = {} } = await getForkPageData()

  const forksList = Object.keys(forks)

  const paths = forksList.map((fork) => {
    return {
      params: { fork },
    }
  })

  return { paths, fallback: 'blocking' }
}

export default function Forks(props) {
  return (
    <GeneralLayout title={`Forks - DefiLlama`} defaultSEO>
      <ParentTokenView header="Total Volume Locked" {...props} />
    </GeneralLayout>
  )
}
