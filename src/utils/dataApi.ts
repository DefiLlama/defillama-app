import { CHART_API, PROTOCOLS_API, NFT_COLLECTIONS_API, NFT_CHARTS_API, NFT_STATISTICS_API } from '../constants/index'

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

export const basicPropertiesToKeep = ["tvl", "name", "symbol", "chains", "change_7d", "change_1d", "mcaptvl"]
export function keepNeededProperties(protocol: any, propertiesToKeep: string[] = basicPropertiesToKeep) {
    return propertiesToKeep.reduce((obj, prop) => {
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
        return keepNeededProperties(protocol, [...basicPropertiesToKeep, "staking", "pool2"])
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

export async function getNFTData(collection) {
    let chartData, collections, statistics;

    try {
        [chartData, collections, statistics] = await Promise.all(
            [`${NFT_CHARTS_API}/all/dailyVolume`, NFT_COLLECTIONS_API, NFT_STATISTICS_API].map(url => fetch(url).then(r => r.json()))
        )
    } catch (e) {
        console.log(e)
        return {
            notFound: true
        }
    }

    const {
        totalVolumeUSD,
        dailyVolumeUSD,
        dailyChange
    } = statistics;

    return {
        props: {
            chart: chartData.map(({ date, dailyVolume }) => [date, dailyVolume]),
            collections,
            totalVolumeUSD,
            dailyVolumeUSD,
            dailyChange
        }
    }
}

//:00 -> adapters start running, they take up to 15mins
//:20 -> storeProtocols starts running, sets cache expiry to :21 of next hour
//:22 -> we rebuild all pages
function next22Minutedate() {
    const dt = new Date()
    dt.setHours(dt.getHours() + 1);
    dt.setMinutes(22)
    return dt
}

export function revalidate() {
    const current = Date.now()
    return Math.ceil((next22Minutedate().getTime() - current) / 1000)
}