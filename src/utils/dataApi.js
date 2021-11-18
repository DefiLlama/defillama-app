import { CHART_API, PROTOCOLS_API } from '../constants/index'

function sumSection(protocols, sectionName) {
    return protocols.reduce((total, p) => total + (p[sectionName] ?? 0), 0)
}

export function getProtocolNames(protocols) {
    return protocols.map(p => ({ name: p.name, symbol: p.symbol }));
}

export async function getChainData(filterFunction, chain, mapFunction = undefined, sortProtocols = false) {
    let [chartData, protocols] = await Promise.all(
        [CHART_API + (chain ? "/" + chain : ''), PROTOCOLS_API].map(url => fetch(url).then(r => r.json()))
    )
    protocols.protocols = protocols.protocols.filter(p => filterFunction(p))
    if (mapFunction !== undefined) {
        protocols.protocols = protocols.protocols.map(mapFunction)
    }
    if (sortProtocols) {
        protocols.protocols = protocols.protocols.sort((a, b) => b.tvl - a.tvl)
    }
    const currentTvl = chartData[chartData.length - 1].totalLiquidityUSD
    let tvlChange = 0;
    if (chartData.length > 1) {
        tvlChange =
            ((chartData[chartData.length - 1].totalLiquidityUSD - chartData[chartData.length - 2].totalLiquidityUSD) /
                chartData[chartData.length - 2].totalLiquidityUSD) *
            100
    }

    return {
        props: {
            ...(chain && { chain }),
            chainsSet: protocols.chains,
            filteredTokens: protocols.protocols,
            chart: chartData.map(({ date, totalLiquidityUSD }) => [date, totalLiquidityUSD]),
            totalVolumeUSD: currentTvl,
            volumeChangeUSD: tvlChange,
            totalStaking: sumSection(protocols.protocols, "staking"),
            totalPool2: sumSection(protocols.protocols, "pool2")
        }
    }

}