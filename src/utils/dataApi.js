import { CHART_API, PROTOCOLS_API } from '../constants/index'

function sumSection(protocols, sectionName) {
    return protocols.reduce((total, p) => total + (p[sectionName] ?? 0), 0)
}

export async function getChainData(filterFunction, chain, mapFunction = undefined, sortProtocols = false) {
    let [chartData, protocols] = await Promise.all(
        [CHART_API + (chain ? "/" + chain : ''), PROTOCOLS_API].map(url => fetch(url).then(r => r.json()))
    )
    protocols.protocols = protocols.protocols.filter(p => p.category !== "Chain" && filterFunction(p))
    if (mapFunction !== undefined) {
        protocols.protocols = protocols.protocols.map(mapFunction)
    }
    if (sortProtocols) {
        protocols.protocols = protocols.protocols.sort((a, b) => b.tvl - a.tvl)
    }
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
            ...(chain && { chain }),
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