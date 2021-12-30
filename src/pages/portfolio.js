import PortfolioContainer from 'containers/PortfolioContainer'
import { GeneralLayout } from 'layout'

import { getProtocols, revalidate } from 'utils/dataApi'

export async function getStaticProps() {
  const { protocolsDict } = await getProtocols()

  return {
    props: { protocolsDict },
    revalidate: revalidate()
  }
}

export default function Portfolio({ protocolsDict }) {
  return (
    <GeneralLayout title={`Saved TVL Rankings - DefiLlama`} defaultSEO>
      <PortfolioContainer protocolsDict={protocolsDict} />
    </GeneralLayout>
  )
}
