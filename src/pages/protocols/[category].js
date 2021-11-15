import ProtocolList from '../../components/ProtocolList'
import { PROTOCOLS_API } from '../../constants/index'
import { GeneralLayout } from '../../layout'

export async function getStaticProps({ params }) {
    const category = params.category
    const res = await fetch(PROTOCOLS_API).then(r => r.json())
    const chainsSet = new Set()
    const protocols = res.protocols.filter(p => {
        if (p.category?.toLowerCase() !== category) {
            return false
        }
        p.chains.forEach(c => chainsSet.add(c))
        return true
    })
    return {
        props: {
            protocols,
            chainsSet: Array.from(chainsSet),
            category,
        }
    }
}
export async function getStaticPaths() {
    const res = await fetch(PROTOCOLS_API)

    const paths = (await res.json()).protocolCategories.map((category) => ({
        params: { category },
    }))

    return { paths, fallback: 'blocking' }
}

export default function Protocols({ category, chainsSet, protocols }) {
    return (
        <GeneralLayout title={`${category} TVL Rankings - DefiLlama`}>
            <ProtocolList category={category} chainsSet={chainsSet} filteredTokens={protocols} />
        </GeneralLayout>
    )
}