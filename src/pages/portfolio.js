import ProtocolList from 'components/ProtocolList'
import { GeneralLayout } from 'layout'

import { getProtocols, revalidate } from 'utils/dataApi'
import { useSavedTokens } from 'contexts/LocalStorage'

export async function getStaticProps() {
  const { protocolsDict } = await getProtocols()

  return {
    props: { protocolsDict },
    revalidate: revalidate()
  }
}

export default function Protocols({ protocolsDict }) {
  return (
    <GeneralLayout title={`Saved TVL Rankings - DefiLlama`}>
      <ProtocolList filteredProtocols={filteredProtocols} showChainList={false} />
    </GeneralLayout>
  )
}
