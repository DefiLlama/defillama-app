import { chainCoingeckoIds } from "constants/chainTokens"

export function buildChainBreakdown(chainTvls) {
    const timeToTvl = {}
    Object.entries(chainTvls).forEach(([chainToAdd, tvl]) => {
        (tvl as any).tvl.forEach((dayTvl) => {
            timeToTvl[dayTvl.date] = {
                ...timeToTvl[dayTvl.date],
                [chainToAdd]: dayTvl.totalLiquidityUSD,
            }
        })
    })

    const chainsStacked = Object.keys(timeToTvl)
        .sort((a, b) => Number(a) - Number(b))
        .map((dayDate) => ({
            ...timeToTvl[dayDate],
            // kinda scuffed but gotta fix the datakey for chart again
            date: Number(dayDate),
        }))
    return chainsStacked
}

export function buildTokensBreakdown(tokensInUsd) {
    const tokenSet = new Set()
    const stacked = tokensInUsd.map((dayTokens) => {
        Object.keys(dayTokens.tokens).forEach((symbol) => tokenSet.add(symbol))
        return {
            ...Object.fromEntries(
                Object.entries(dayTokens.tokens).filter((t) => !(t[0].startsWith('UNKNOWN') && t[1] < 1))
            ),
            date: dayTokens.date,
        }
    })
    return [stacked, Array.from(tokenSet)]
}

export function buildInflows(tokensInUsd, tokens) {
    let tokenSet = new Set()
    const usdInflows = []
    const tokenInflows = []

    let zeroUsdInfows = 0
    let zeroTokenInfows = 0

    for (let i = 1; i < tokensInUsd.length; i++) {
        let dayDifference = 0
        let tokenDayDifference = {}
        for (const token in tokensInUsd[i].tokens) {
            tokenSet.add(token)
            const price = tokensInUsd[i].tokens[token] / tokens[i].tokens[token]
            const diff = (tokens[i].tokens[token] ?? 0) - (tokens[i - 1].tokens[token] ?? 0)
            const diffUsd = price * diff
            if (diffUsd) {
                tokenDayDifference[token] = diffUsd
                dayDifference += diffUsd
            }
        }

        if (dayDifference === 0) {
            zeroUsdInfows++
        }

        if (Object.keys(tokenDayDifference)?.length === 0) {
            zeroTokenInfows++
        }

        usdInflows.push([
            tokensInUsd[i].date,
            dayDifference,
        ])
        tokenInflows.push({
            ...tokenDayDifference,
            date: tokensInUsd[i].date,
        })
    }



    return { usdInflows: zeroUsdInfows === usdInflows.length ? null : usdInflows, tokenInflows: zeroTokenInfows === tokenInflows.length ? null : tokenInflows }
}

export const buildProtocolData = (protocolData) => {
    if (protocolData && protocolData.misrepresentedTokens !== true && protocolData.tokensInUsd !== undefined) {
        const [tokenBreakdown, tokensUnique] = buildTokensBreakdown(protocolData.tokensInUsd)
        const { usdInflows, tokenInflows } = buildInflows(protocolData.tokensInUsd, protocolData.tokens)

        return { tokenBreakdown, tokensUnique, usdInflows, tokenInflows }
    }

    return { tokenBreakdown: null, tokensUnique: null, usdInflows: null, tokenInflows: null }
}

// const ETH_DENOMINATION = "ETH"
// export const buildProtocolData = async (protocolData, selectedChain, denomination) => {
//     const tvl = protocolData.tvl ?? []
//     delete protocolData.tvl;
//     const chainsStacked = buildChainBreakdown(protocolData.chainTvls)

//     let chartData = tvl.filter((item) => item.date).map(({ date, totalLiquidityUSD }) => [date, totalLiquidityUSD])
//     let { tokensInUsd, tokens, chainTvls } = protocolData
//     if (selectedChain !== 'all') {
//         chartData = chainTvls[selectedChain].tvl.map(({ date, totalLiquidityUSD }) => [date, totalLiquidityUSD])
//         tokens = chainTvls[selectedChain].tokens
//         tokensInUsd = chainTvls[selectedChain].tokensInUsd
//     }
//     delete protocolData.chainTvls

//     const chains = protocolData.chains ?? [protocolData.name]
//     let chainDenomination = null;
//     if (selectedChain !== 'all' || chains.length === 1) {
//         chainDenomination = (chainCoingeckoIds[selectedChain] ?? chainCoingeckoIds[chains[0]]) ?? null
//     }

//     let data = {
//         ...protocolData,
//         tvl: tvl.length > 0 ? tvl[tvl.length - 1]?.totalLiquidityUSD : 0,
//         tvlList: chartData,
//         chainsStacked,
//         tokens,
//         chainsList: Object.keys(chainTvls),
//         chainDenomination,
//     }
//     if (denomination !== null && (denomination === "ETH" || denomination === chainDenomination?.symbol)) {
//         data.denominationPrices = (await fetch(
//             `https://api.coingecko.com/api/v3/coins/${denomination === ETH_DENOMINATION ? 'ethereum' : chainDenomination.geckoId
//             }/market_chart/range?vs_currency=usd&from=${chartData[0][0]}&to=${Math.floor(Date.now() / 1000)}`
//         ).then(r => r.json())).prices;
//     }
//     if (protocolData.misrepresentedTokens !== true && tokensInUsd !== undefined) {
//         try {
//             const [tokenBreakdown, tokensUnique] = buildTokensBreakdown(tokensInUsd)
//             const { usdInflows, tokenInflows } = buildInflows(tokensInUsd, tokens)
//             data = {
//                 ...data,
//                 tokenBreakdown,
//                 tokensUnique,
//                 usdInflows,
//                 tokenInflows,
//             }
//         } catch (e) {
//             console.log("buildTokens", e)
//         }
//     }
//     if (typeof denomination !== "string" || !denomination.startsWith("Tokens")) {
//         data.tokens = null
//     }
//     delete data.tokensInUsd

//     return data
// }