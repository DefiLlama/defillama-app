import ChainPage from '../components/ChainPage'
import { GeneralLayout } from '../layout'
import { getChainData } from '../utils/dataApi'

export async function getStaticProps({ params }) {
    return getChainData(p => true)
}

export default function HomePage(props) {
    return (
        <GeneralLayout title="DefiLlama - DeFi Dashboard">
            <ChainPage {...props} />
        </GeneralLayout>
    )
}