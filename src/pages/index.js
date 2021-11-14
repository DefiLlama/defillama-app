import ChainPage from '../components/ChainPage'
import { CHART_API, PROTOCOLS_API } from '../constants/index'
import ThemeProvider, { GlobalStyle } from '../Theme'
import { AppWrapper, LayoutWrapper } from '../layout'
import { useState } from 'react'
import Head from 'next/head'

export async function getStaticProps({ params }) {
    const [chart, protocols] = await Promise.all(
        [CHART_API, 'https://api.llama.fi/lite/protocols2'].map(url => fetch(url).then(r => r.json()))
    )

    return {
        props: {
            chainsSet: protocols.chains,
            filteredTokens: protocols.protocols,
            chart,
            totalStaking: 0,
            totalPool2: 0
        }
    }
}

function BlogPost(props) {
    const [savedOpen, setSavedOpen] = useState(false)
    return (
        <>
            <Head>
                <title>DefiLlama - DeFi Dashboard</title>
            </Head>
            <ThemeProvider>
                <>
                    <GlobalStyle />
                    <AppWrapper>
                        <LayoutWrapper savedOpen={savedOpen} setSavedOpen={setSavedOpen}>
                            <ChainPage {...props} />
                        </LayoutWrapper>
                    </AppWrapper>
                </>
            </ThemeProvider>
        </>
    )
}

export default BlogPost