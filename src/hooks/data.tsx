import { useMemo } from 'react'
import { useGetExtraTvlEnabled } from 'contexts/LocalStorage'
import { formattedNum, getPercentChange } from 'utils'

interface IProtocol {
  tvl: number | null
  tvlPrevDay: number | null
  tvlPrevWeek: number | null
  tvlPrevMonth: number | null
  mcap: number | null
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

type DataValue = number | null

interface IGroupData {
  [key: string]: {}
}

interface IChain {
  tvl: number
  tvlPrevDay: number
  tvlPrevWeek: number
  tvlPrevMonth: number
  mcap: number
  name: string
  protocols: number
}

interface GroupChain extends IChain {
  childChains: IChain[]
}

// PROTOCOLS
export const useCalcStakePool2Tvl = (filteredProtocols: IProtocol[], defaultSortingColumn: string, dir: 'asc') => {
  const extraTvlsEnabled = useGetExtraTvlEnabled()

  const protocolTotals = useMemo(() => {
    if (Object.values(extraTvlsEnabled).every((t) => !t)) {
      return filteredProtocols
    }

    const updatedProtocols = filteredProtocols.map(
      ({ tvl, tvlPrevDay, tvlPrevWeek, tvlPrevMonth, extraTvl, mcap, ...props }) => {
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

        const mcaptvl = mcap && finalTvl && formattedNum(mcap / finalTvl)

        return {
          ...props,
          tvl: finalTvl,
          tvlPrevDay: finalTvlPrevDay,
          tvlPrevWeek: finalTvlPrevWeek,
          tvlPrevMonth: finalTvlPrevMonth,
          change_1d: change1d,
          change_7d: change7d,
          change_1m: change1m,
          mcaptvl,
        }
      }
    )
    if (defaultSortingColumn === undefined) {
      return updatedProtocols.sort((a, b) => b.tvl - a.tvl)
    } else {
      return updatedProtocols.sort((a, b) => {
        if (dir === 'asc') {
          return a[defaultSortingColumn] - b[defaultSortingColumn]
        } else return b[defaultSortingColumn] - a[defaultSortingColumn]
      })
    }
  }, [filteredProtocols, extraTvlsEnabled, defaultSortingColumn, dir])

  return protocolTotals
}

export const useCalcSingleExtraTvl = (chainTvls, simpleTvl): number => {
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

export const useGroupChainsByParent = (chains: IChain[], groupData: IGroupData): GroupChain[] => {
  const data: GroupChain[] = useMemo(() => {
    const finalData = {}
    const addedChains = []
    for (const parent in groupData) {
      const parentName = parent
      let tvl: DataValue = null
      let tvlPrevDay: DataValue = null
      let tvlPrevWeek: DataValue = null
      let tvlPrevMonth: DataValue = null
      let mcap: DataValue = null
      let protocols: DataValue = null

      finalData[parentName] = {}

      const parentData = chains.find((item) => item.name === parent)
      if (parentData) {
        tvl = parentData.tvl || null
        tvlPrevDay = parentData.tvlPrevDay || null
        tvlPrevWeek = parentData.tvlPrevWeek || null
        tvlPrevMonth = parentData.tvlPrevMonth || null
        mcap = parentData.mcap || null
        protocols = parentData.protocols || null
        finalData[parentName] = {
          ...parentData,
          tvl,
          tvlPrevDay,
          tvlPrevWeek,
          tvlPrevMonth,
          mcap,
          protocols,
          childChains: [parentData],
        }
        addedChains.push(parent)
      } else {
        finalData[parentName] = {
          symbol: '-',
        }
      }
      for (const child in groupData[parent]) {
        const childData = chains.find((item) => item.name === child)
        if (childData) {
          tvl += childData.tvl
          tvlPrevDay += childData.tvlPrevDay
          tvlPrevWeek += childData.tvlPrevWeek
          tvlPrevMonth += childData.tvlPrevMonth
          mcap += childData.mcap
          protocols += childData.protocols
          const childChains = finalData[parentName].childChains || []
          finalData[parentName] = {
            ...finalData[parentName],
            tvl,
            tvlPrevDay,
            tvlPrevWeek,
            tvlPrevMonth,
            mcap,
            protocols,
            name: parentName,
            childChains: [...childChains, childData],
          }
          addedChains.push(child)
        }
      }
    }
    chains.forEach((item) => {
      if (!addedChains.includes(item.name)) {
        finalData[item.name] = item
      }
    })
    return Object.values(finalData)
  }, [chains, groupData])

  return data.sort((a, b) => b.tvl - a.tvl)
}

// returns tvl by day for a group of tokens
export const useCalcGroupExtraTvlsByDay = (chains) => {
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

// returns tvl by day for a single token
export const useCalcExtraTvlsByDay = (data) => {
  const extraTvlsEnabled = useGetExtraTvlEnabled()

  return useMemo(() => {
    return data.map(([date, values]) => {
      let sum = values.tvl || 0

      for (const value in values) {
        if (extraTvlsEnabled[value.toLowerCase()]) {
          sum += values[value]
        }
      }

      return [date, sum]
    })
  }, [data, extraTvlsEnabled])
}
