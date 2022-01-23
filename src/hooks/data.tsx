import { useMemo } from 'react'
import { useGetExtraTvlEnabled } from 'contexts/LocalStorage'
import { getPercentChange } from 'utils'

interface IProtocol {
  tvl: number | null
  tvlPrevDay: number | null
  tvlPrevWeek: number | null
  tvlPrevMonth: number | null
  extraTvl: {
    [key: string]: {
      tvl: number | null
      tvlPrevDay: number | null
      tvlPrevWeek: number | null
      tvlPrevMonth: number | null
    }
  }
}

interface IChainTvl {
  [key: string]: number
}

type ChainTvlsByDay = [string, IChainTvl]

export const useCalcStakePool2Tvl = (filteredProtocols: IProtocol[], defaultSortingColumn) => {
  const extraTvlsEnabled = useGetExtraTvlEnabled()

  const protocolTotals = useMemo(() => {
    if (Object.values(extraTvlsEnabled).every((t) => !t)) {
      return filteredProtocols
    }

    const updatedProtocols = filteredProtocols.map(
      ({ tvl, tvlPrevDay, tvlPrevWeek, tvlPrevMonth, extraTvl, ...props }) => {
        let finalTvl: number | null = tvl
        let finalTvlPrevDay: number | null = tvlPrevDay
        let finalTvlPrevWeek: number | null = tvlPrevWeek
        let finalTvlPrevMonth: number | null = tvlPrevMonth

        Object.entries(extraTvl).forEach(([prop, propValues]) => {
          const { tvl, tvlPrevDay, tvlPrevWeek, tvlPrevMonth } = propValues
          // convert to lowercase as server response is not consistent in extra-tvl names
          if (extraTvlsEnabled[prop.toLowerCase()]) {
            // check if final tvls are null, if they are null and tvl exist on selected option, convert to 0 and add them
            tvl && (finalTvl = (finalTvl || 0) + tvl)
            tvlPrevDay && (finalTvlPrevDay = (finalTvlPrevDay || 0) + tvlPrevDay)
            tvlPrevWeek && (finalTvlPrevWeek = (finalTvlPrevWeek || 0) + tvlPrevWeek)
            tvlPrevMonth && (finalTvlPrevMonth = (finalTvlPrevMonth || 0) + tvlPrevMonth)
          }
        })

        let change1d: number | null = getPercentChange(finalTvl, finalTvlPrevDay)
        let change7d: number | null = getPercentChange(finalTvl, finalTvlPrevWeek)
        let change1m: number | null = getPercentChange(finalTvl, finalTvlPrevMonth)

        return {
          ...props,
          tvl: finalTvl,
          change_1d: change1d,
          change_7d: change7d,
          change_1m: change1m,
        }
      }
    )
    if (defaultSortingColumn === undefined) {
      return updatedProtocols.sort((a, b) => b.tvl - a.tvl)
    } else {
      return updatedProtocols
    }
  }, [filteredProtocols, extraTvlsEnabled, defaultSortingColumn])

  return protocolTotals
}

export const useCalcSingleExtraTvl = (chainTvls, simpleTvl) => {
  const extraTvlsEnabled = useGetExtraTvlEnabled()

  const protocolTvl = useMemo(() => {
    let tvl = simpleTvl
    Object.entries(chainTvls).forEach(([section, sectionTvl]) => {
      // convert to lowercase as server response is not consistent in extra-tvl names
      if (extraTvlsEnabled[section.toLowerCase()]) tvl += sectionTvl
    })
    return tvl
  }, [extraTvlsEnabled, simpleTvl, chainTvls])

  return protocolTvl
}

export const useCalcChainsTvlsByDay = (chains) => {
  const extraTvlsEnabled = useGetExtraTvlEnabled()

  const { data, daySum } = useMemo(() => {
    const daySum = {}
    const data = chains.map(([date, values]) => {
      const tvls: IChainTvl = {}
      let totalDaySum = 0

      Object.entries(values).forEach(([name, chainTvls]: ChainTvlsByDay) => {
        let sum = chainTvls.tvl
        totalDaySum += chainTvls.tvl || 0

        for (const c in chainTvls) {
          if (extraTvlsEnabled[c.toLowerCase()]) {
            sum += chainTvls[c]
            totalDaySum += chainTvls[c]
          }
        }
        tvls[name] = sum
      })
      daySum[date] = totalDaySum
      return { date, ...tvls }
    })
    return { data, daySum }
  }, [chains, extraTvlsEnabled])

  return { data, daySum }
}
