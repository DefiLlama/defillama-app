import YieldPage from 'components/YieldsPage'
import { GeneralLayout } from 'layout'
import { revalidate, getYieldPageData } from 'utils/dataApi'

export async function getStaticPaths() {
  const data = await getYieldPageData()

  const paths = data.props.chainList.slice(0, 20).map((chain) => ({ params: { chain } }))

  return { paths, fallback: 'blocking' }
}

export async function getStaticProps({ params: { chain } }) {
  const data = await getYieldPageData({ chain: chain })

  return {
    ...data,
    revalidate: revalidate(),
  }
}

export default function YieldChainPage(props) {
  return (
    <GeneralLayout title={`Yield Rankings - DefiLlama`} defaultSEO>
      <YieldPage {...props} />
    </GeneralLayout>
  )
}
