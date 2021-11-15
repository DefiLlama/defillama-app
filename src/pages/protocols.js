import ProtocolList from '../components/ProtocolList'
import { PROTOCOLS_API } from '../constants/index'
import { GeneralLayout } from '../layout'

export async function getStaticProps({ params }) {
    const res = await fetch(PROTOCOLS_API).then(r => r.json())
    const protocols = res.protocols
    return {
        props: {
            protocols,
            chainsSet: res.chains,
        }
    }
}

export default function Protocols({ chainsSet, protocols }) {
    return (
        <GeneralLayout title={`TVL Rankings - DefiLlama`}>
            <ProtocolList chainsSet={chainsSet} filteredTokens={protocols} />
        </GeneralLayout>
    )
}