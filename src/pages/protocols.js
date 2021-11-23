import ProtocolList from '../components/ProtocolList'
import { PROTOCOLS_API } from '../constants/index'
import { GeneralLayout } from '../layout'
import { keepNeededProperties, revalidate } from '../utils/dataApi'

export async function getStaticProps({ params }) {
    const res = await fetch(PROTOCOLS_API).then(r => r.json())
    const protocols = res.protocols.map(p => keepNeededProperties(p))
    return {
        props: {
            protocols,
            chainsSet: res.chains,
        },
        revalidate: revalidate(),
    }
}

export default function Protocols({ chainsSet, protocols }) {
    return (
        <GeneralLayout title={`TVL Rankings - DefiLlama`}>
            <ProtocolList chainsSet={chainsSet} filteredTokens={protocols} showChainList={false} />
        </GeneralLayout>
    )
}