import YieldPage from 'components/YieldsPage'
import Layout from 'layout'
import { revalidate, getYieldPageData } from 'utils/dataApi'

export async function getStaticProps() {
  const data = await getYieldPageData()

  return {
    ...data,
    revalidate: revalidate(),
  }
}

export default function ApyHomePage(props) {
  return (
    <Layout title={`Yield Rankings - DefiLlama`} defaultSEO>
      <YieldPage {...props} />
    </Layout>
  )
}
