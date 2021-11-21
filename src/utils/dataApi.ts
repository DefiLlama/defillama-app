import { CHART_API, PROTOCOLS_API } from '../constants/index'

function sumSection(protocols, sectionName) {
    return protocols.reduce((total, p) => total + (p[sectionName] ?? 0), 0)
}

export function getProtocolNames(protocols) {
    return protocols.map(p => ({ name: p.name, symbol: p.symbol }));
}

function addSection(protocol: any, section: string, chain: string | undefined) {
    const chainSectionName = chain === undefined ? section : `${chain}-${section}`;
    if (protocol.chainTvls[chainSectionName] !== undefined) {
        protocol[section] = protocol.chainTvls[chainSectionName]
    }
}

const propertiesToKeep = ["tvl", "name", "symbol", "chains", "change_7d", "change_1d", "mcaptvl"]
export function keepNeededProperties(protocol: any, extraProperties: string[] = []) {
    return propertiesToKeep.concat(extraProperties).reduce((obj, prop) => {
        if (protocol[prop] !== undefined) {
            obj[prop] = protocol[prop]
        }
        return obj
    }, {})
}

export async function getChainData(chain) {
    let chartData, protocols, chains;
    try {
        [chartData, { protocols, chains }] = await Promise.all(
            [CHART_API + (chain ? "/" + chain : ''), PROTOCOLS_API].map(url => fetch(url).then(r => r.json()))
        )
    } catch (e) {
        return {
            notFound: true
        }
    }
    if (chain !== undefined) {
        protocols = protocols.filter(p => p.chains.includes(chain))
    }
    protocols = protocols.map(protocol => {
        if (chain !== undefined) {
            protocol.tvl = protocol.chainTvls[chain];
        }
        addSection(protocol, "staking", chain);
        addSection(protocol, "pool2", chain);
        return keepNeededProperties(protocol, ["staking", "pool2"])
    })
    if (chain !== undefined) {
        protocols = protocols.sort((a, b) => b.tvl - a.tvl)
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
            chainsSet: chains,
            filteredTokens: protocols,
            chart: chartData.map(({ date, totalLiquidityUSD }) => [date, Math.trunc(totalLiquidityUSD)]),
            totalVolumeUSD: currentTvl,
            volumeChangeUSD: tvlChange,
            totalStaking: sumSection(protocols, "staking"),
            totalPool2: sumSection(protocols, "pool2")
        }
    }

}