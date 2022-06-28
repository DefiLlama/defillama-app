import { extraTvlProps } from '~/contexts/LocalStorage'

function buildChainBreakdown(chainTvls) {
  const timeToTvl = {}

  Object.entries(chainTvls).forEach(([chainToAdd, data]) => {
    if (extraTvlProps.includes(chainToAdd?.toLowerCase())) return

    if (chainToAdd.includes('-') && extraTvlProps.includes(chainToAdd.split('-')[1])) {
      ;(data as any).tvl.forEach((dayTvl) => {
        timeToTvl[dayTvl.date] = {
          ...timeToTvl[dayTvl.date],
          extraTvl: {
            ...(timeToTvl[dayTvl.date]?.extraTvl ?? {}),
            [chainToAdd.split('-')[0]]: {
              ...(timeToTvl[dayTvl.date]?.extraTvl
                ? timeToTvl[dayTvl.date]?.extraTvl[chainToAdd.split('-')[0]] ?? {}
                : {}),
              [chainToAdd.split('-')[1]]: dayTvl.totalLiquidityUSD,
            },
          },
        }
      })
    } else {
      ;(data as any).tvl.forEach((dayTvl) => {
        timeToTvl[dayTvl.date] = {
          ...timeToTvl[dayTvl.date],
          [chainToAdd]: dayTvl.totalLiquidityUSD,
        }
      })
    }
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

function buildTokensBreakdown(tokensInUsd) {
  const tokenSet = new Set()
  const stacked = tokensInUsd.map((dayTokens) => {
    Object.keys(dayTokens.tokens).forEach((symbol) => tokenSet.add(symbol))
    return {
      ...Object.fromEntries(Object.entries(dayTokens.tokens).filter((t) => !(t[0].startsWith('UNKNOWN') && t[1] < 1))),
      date: dayTokens.date,
    }
  })
  return [stacked, Array.from(tokenSet)]
}

function buildInflows(tokensInUsd, tokens) {
  let tokenSet = new Set()
  const usdInflows = []
  const tokenInflows = []

  let zeroUsdInfows = 0
  let zeroTokenInfows = 0

  for (let i = 1; i < tokensInUsd.length; i++) {
    let dayDifference = 0
    let tokenDayDifference = {}
    for (const token in tokensInUsd[i]?.tokens) {
      tokenSet.add(token)
      const price = tokensInUsd[i].tokens[token] / tokens[i]?.tokens[token]
      const diff = (tokens[i]?.tokens[token] ?? 0) - (tokens[i - 1]?.tokens[token] ?? 0)
      const diffUsd = price * diff

      if (!Number.isNaN(diffUsd) && isFinite(price)) {
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

    usdInflows.push([tokensInUsd[i].date, dayDifference])
    tokenInflows.push({
      ...tokenDayDifference,
      date: tokensInUsd[i].date,
    })
  }

  return {
    usdInflows: zeroUsdInfows === usdInflows.length ? null : usdInflows,
    tokenInflows: zeroTokenInfows === tokenInflows.length ? null : tokenInflows,
  }
}

export const buildProtocolData = (protocolData) => {
  if (protocolData) {
    const chainsStacked = buildChainBreakdown(protocolData.chainTvls)

    if (protocolData.misrepresentedTokens !== true && protocolData.tokensInUsd !== undefined) {
      const [tokenBreakdown, tokensUnique] = buildTokensBreakdown(protocolData.tokensInUsd)
      const { usdInflows, tokenInflows } = buildInflows(protocolData.tokensInUsd, protocolData.tokens)
      return { tokenBreakdown, tokensUnique, usdInflows, tokenInflows, chainsStacked }
    }

    return { chainsStacked }
  }

  return {}
}
