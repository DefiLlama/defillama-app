import ChainPage from '../components/ChainPage'
import { GeneralLayout } from '../layout'
import { getChainData } from '../utils/dataApi'
import SearchDataProvider from 'contexts/SearchData'

export async function getStaticProps({ params }) {
    return getChainData(p => true)
}

export default function HomePage(props) {
    return (
        <SearchDataProvider protocolsAndChains={{ protocols: props.protocols, chains: props.chains }}>
            <GeneralLayout title="DefiLlama - DeFi Dashboard">
                <ChainPage {...props} />
            </GeneralLayout>
        </SearchDataProvider>
    )
}