import ChainPage from '../components/ChainPage'
import { CHART_API, PROTOCOLS_API } from '../constants/index'
import ThemeProvider, { GlobalStyle } from '../Theme'
import { AppWrapper, LayoutWrapper } from '../layout'
import { useState } from 'react'
import LocalStorageContextProvider, { Updater as LocalStorageContextUpdater } from '../contexts/LocalStorage'
import Head from 'next/head'

function sumSection(protocols, sectionName) {
    return protocols.reduce((total, p) => total + (p[sectionName] ?? 0), 0)
}

export async function getStaticProps({ params }) {
    let [chartData, protocols] = await Promise.all(
        [CHART_API, PROTOCOLS_API + '2'].map(url => fetch(url).then(r => r.json()))
    )
    protocols.protocols = protocols.protocols.filter(p => p.category !== "Chain")
    const totalVolumeUSD = chartData[chartData.length - 1].totalLiquidityUSD
    let volumeChangeUSD = 0;
    if (chartData.length > 1) {
        volumeChangeUSD =
            ((chartData[chartData.length - 1].totalLiquidityUSD - chartData[chartData.length - 2].totalLiquidityUSD) /
                chartData[chartData.length - 2].totalLiquidityUSD) *
            100
    } else {
        volumeChangeUSD = 0
    }

    return {
        props: {
            chainsSet: protocols.chains,
            filteredTokens: protocols.protocols,
            chart: chartData,
            totalVolumeUSD,
            volumeChangeUSD,
            totalStaking: sumSection(protocols.protocols, "staking"),
            totalPool2: sumSection(protocols.protocols, "pool2")
        }
    }
}

function BlogPost(props) {
    const [savedOpen, setSavedOpen] = useState(false)
    return (
        <>
            <Head>
                <title>DefiLlama - DeFi Dashboard</title>
                <script src="https://cdn.usefathom.com/script.js" data-site="OANJVQNZ" defer></script>
                <link rel="preload" href="/font-files/Inter-roman.var.woff2" as="font" type="font/woff2" crossorigin="anonymous"></link>
            </Head>
            <ThemeProvider>
                <LocalStorageContextProvider>
                    <LocalStorageContextUpdater />
                    <>
                        <GlobalStyle />
                        <AppWrapper>
                            <LayoutWrapper savedOpen={savedOpen} setSavedOpen={setSavedOpen}>
                                <ChainPage {...props} />
                            </LayoutWrapper>
                        </AppWrapper>
                    </>
                </LocalStorageContextProvider>
            </ThemeProvider>
        </>
    )
}

export default BlogPost