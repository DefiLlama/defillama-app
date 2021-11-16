import ProtocolList from '../components/ProtocolList'
import { PROTOCOLS_API } from '../constants/index'
import { GeneralLayout } from '../layout'

const exclude = ["Mento", "Lightning Network", "Secret Bridge", "Karura Swap", "Karura Liquid-Staking", "Karura Dollar (kUSD)", "Tezos Liquidity Baking", "Notional", "Tinlake"]

export async function getStaticProps({ params }) {
    const res = await fetch(PROTOCOLS_API).then(r => r.json())
    const protocols = res.protocols.filter(token =>
        token.name === "DeversiFi" || ((token.symbol === null || token.symbol === '-') && !exclude.includes(token.name))
    )
    return {
        props: {
            protocols,
        }
    }
}

export default function Protocols({ protocols }) {
    return (
        <GeneralLayout title={`Airdroppable protocols - Defi Llama`}>
            <ProtocolList title="Tokenless protocols that may airdrop 🧑‍🌾" category="" chainsSet={[]} filteredTokens={protocols} showChainList={false} />
        </GeneralLayout>
    )
}