import ChainPage from '../../components/ChainPage'
import { PROTOCOLS_API } from '../../constants/index'
import { GeneralLayout } from '../../layout'
import { getChainData } from '../../utils/dataApi'

function addSection(protocol, section, chain) {
    if (protocol.chainTvls[`${chain}-${section}`] !== undefined) {
        protocol[section] = protocol.chainTvls[`${chain}-${section}`]
    }
}

export async function getStaticProps({ params }) {
    const chain = params.chain
    return getChainData(p => p.chains.includes(chain), chain, protocol => {
        protocol.tvl = protocol.chainTvls[chain];
        addSection(protocol, "staking", chain);
        addSection(protocol, "pool2", chain);
        return protocol
    }, true)
}
export async function getStaticPaths() {
    const res = await fetch(PROTOCOLS_API)

    const paths = (await res.json()).chains.map((chain) => ({
        params: { chain },
    }))

    return { paths, fallback: 'blocking' }
}

export default function Chain({ chain, ...props }) {
    return (
        <GeneralLayout title={`${chain} TVL - DefiLlama`}>
            <ChainPage {...props} selectedChain={chain} />
        </GeneralLayout>
    )
}