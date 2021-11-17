import ProtocolList from '../../components/ProtocolList'
import { PROTOCOLS_API } from '../../constants/index'
import { GeneralLayout } from '../../layout'

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export async function getStaticProps({ params: { protocols: [protocol1, protocol2] } }) {
    console.log(protocol1, protocol2)
    const res = await fetch(PROTOCOLS_API).then(r => r.json())
    return {
        props: {
            protocols: res.protocols,
            protocol1,
            protocol2
        }
    }
}

export async function getStaticPaths() {
    return { paths: [], fallback: "blocking" }
}

export default function Protocols({ category, chainsSet, protocols, chain }) {
    return (
        <GeneralLayout title={`${capitalizeFirstLetter(category)} TVL Rankings - DefiLlama`}>
        </GeneralLayout>
    )
}