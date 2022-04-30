import YieldPage from 'components/YieldsPage'
import { GeneralLayout } from 'layout'
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
    <GeneralLayout title={`Yield Rankings - DefiLlama`} defaultSEO>
      <YieldPage {...props} />
    </GeneralLayout>
  )
}
