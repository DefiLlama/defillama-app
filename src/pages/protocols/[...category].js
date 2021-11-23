import ProtocolList from '../../components/ProtocolList'
import { PROTOCOLS_API } from '../../constants/index'
import { GeneralLayout } from '../../layout'
import { keepNeededProperties, revalidate } from '../../utils/dataApi'

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export async function getStaticProps({ params: { category: [category, chain] } }) {
    let { protocols } = await fetch(PROTOCOLS_API).then(r => r.json())
    const chainsSet = new Set()
    protocols = protocols.filter(p => {
        if (p.category?.toLowerCase() !== category) {
            return false
        }
        p.chains.forEach(c => chainsSet.add(c))
        if (chain !== undefined) {
            const chainTvl = p.chainTvls[chain];
            if (chainTvl === undefined) {
                return false
            }
            p.tvl = chainTvl
        }
        return true
    }).map(p => keepNeededProperties(p))
    if (chain) {
        protocols = protocols.sort((a, b) => b.tvl - a.tvl)
    }
    if (protocols.length === 0) {
        return {
            notFound: true,
        }
    }
    return {
        props: {
            protocols,
            chainsSet: Array.from(chainsSet),
            category,
            ...(chain && { chain })
        },
        revalidate: revalidate()
    }
}

export async function getStaticPaths() {
    const res = await fetch(PROTOCOLS_API)

    const paths = (await res.json()).protocolCategories.map((category) => ({
        params: { category: [category.toLowerCase()] },
    }))

    return { paths, fallback: "blocking" }
}

export default function Protocols({ category, chainsSet, protocols, chain }) {
    return (
        <GeneralLayout title={`${capitalizeFirstLetter(category)} TVL Rankings - DefiLlama`}>
            <ProtocolList category={capitalizeFirstLetter(category)} chainsSet={chainsSet} selectedChain={chain} filteredTokens={protocols} />
        </GeneralLayout>
    )
}