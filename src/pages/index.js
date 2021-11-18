import ChainPage from '../components/ChainPage'
import { GeneralLayout } from '../layout'
import { getChainData } from '../utils/dataApi'
import SearchDataProvider from 'contexts/SearchData'

export async function getStaticProps({ params }) {
    return getChainData(() => true);
}

export default function HomePage(props) {
    return (
        <SearchDataProvider protocolsAndChains={{ protocolNames: props.filteredTokens, chainsSet: props.chainsSet }}>
            <GeneralLayout title="DefiLlama - DeFi Dashboard">
                <ChainPage {...props} />
            </GeneralLayout>
        </SearchDataProvider>
    )
}