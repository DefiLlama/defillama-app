import YieldPage from 'components/YieldsPage'
import { GeneralLayout } from 'layout'
import { getYieldPageData } from 'utils/dataApi'

export async function getServerSideProps({ params: { token } }) {
  const data = await getYieldPageData({ token: token })

  return {
    ...data,
  }
}

export default function YieldProjectPage(props) {
  return (
    <GeneralLayout title={`Yield Rankings - DefiLlama`} defaultSEO>
      <YieldPage {...props} />
    </GeneralLayout>
  )
}
