import { useMemo } from 'react'
import { useGetExtraTvlEnabled } from 'contexts/LocalStorage'

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

interface IChainTvls {
  [key: string]: number
}

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
          const option = prop.toLowerCase()
          if (extraTvlsEnabled[option]) {
            if (option === 'masterchef') {
              tvl && (finalTvl = (finalTvl || 0) - tvl)
              tvlPrevDay && (finalTvlPrevDay = (finalTvlPrevDay || 0) - tvlPrevDay)
              tvlPrevWeek && (finalTvlPrevWeek = (finalTvlPrevWeek || 0) - tvlPrevWeek)
              tvlPrevMonth && (finalTvlPrevMonth = (finalTvlPrevMonth || 0) - tvlPrevMonth)
            } else {
              tvl && (finalTvl = (finalTvl || 0) + tvl)
              tvlPrevDay && (finalTvlPrevDay = (finalTvlPrevDay || 0) + tvlPrevDay)
              tvlPrevWeek && (finalTvlPrevWeek = (finalTvlPrevWeek || 0) + tvlPrevWeek)
              tvlPrevMonth && (finalTvlPrevMonth = (finalTvlPrevMonth || 0) + tvlPrevMonth)
            }
          }
        })

        let change1d: number | null = getPercentChange(finalTvlPrevDay, finalTvl)
        let change7d: number | null = getPercentChange(finalTvlPrevWeek, finalTvl)
        let change1m: number | null = getPercentChange(finalTvlPrevMonth, finalTvl)

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

export const useCalcSingleExtraTvl = (chainTvls: IChainTvls, simpleTvl) => {
  const extraTvlsEnabled = useGetExtraTvlEnabled()
  const protocolTvl = useMemo(() => {
    let tvl = simpleTvl
    Object.entries(chainTvls).forEach(([section, sectionTvl]) => {
      // convert to lowercase as server response is not consistent in extra-tvl names
      const option = section.toLowerCase()
      if (extraTvlsEnabled[option]) {
        if (option === 'masterchef') {
          tvl -= sectionTvl
        } else {
          tvl += sectionTvl
        }
      }
    })
    return tvl
  }, [extraTvlsEnabled, simpleTvl, chainTvls])

  return protocolTvl
}

export function getPercentChange(v1, v2): number | null {
  const change = ((v2 - v1) / v1) * 100

  if (!Number.isNaN(change) && Number.isFinite(change)) {
    return change
  } else return null
}
