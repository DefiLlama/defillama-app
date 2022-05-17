import { useMemo } from 'react'
import { useGetExtraTvlEnabled, useGroupEnabled, useGetExtraPeggedEnabled } from 'contexts/LocalStorage'
import { getPercentChange } from 'utils'

interface IProtocol {
  name: string
  protocols: number
  tvl: number | null
  tvlPrevDay: number | null
  tvlPrevWeek: number | null
  tvlPrevMonth: number | null
  mcap: number | null
  mcaptvl: number | null
  category: string
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
  mcaptvl: number
}

interface GroupChain extends IChain {
  subChains: IChain[]
}

interface GroupChainPegged extends IPegged {
  subChains: IPegged[]
}

interface IPegged {
  circulating: number
  minted: number
  unreleased: number
  mcap: number
  name: string
  symbol: string
  gecko_id: string
  price: number
  change_1d: number | null
  change_7d: number | null
  change_1m: number | null
  circulatingPrevDay: number
  circulatingPrevWeek: number
  circulatingPrevMonth: number
  bridgeInfo: {
    bridge: string
    link?: string
  }
  bridgedAmount: number | string
}

// TODO update types in localstorage file and refer them here
type ExtraTvls = { [key: string]: boolean }

// PROTOCOLS
export const useCalcStakePool2Tvl = (
  filteredProtocols: Readonly<IProtocol[]>,
  defaultSortingColumn?: string,
  dir?: 'asc',
  applyDoublecounted = false
) => {
  const extraTvlsEnabled: ExtraTvls = useGetExtraTvlEnabled()

  const protocolTotals = useMemo(() => {
    const checkExtras = { ...extraTvlsEnabled, doublecounted: !extraTvlsEnabled.doublecounted }

    if (Object.values(checkExtras).every((t) => !t)) {
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

          if (prop === 'doublecounted' && applyDoublecounted) {
            tvl && (finalTvl = (finalTvl || 0) - tvl)
            tvlPrevDay && (finalTvlPrevDay = (finalTvlPrevDay || 0) - tvlPrevDay)
            tvlPrevWeek && (finalTvlPrevWeek = (finalTvlPrevWeek || 0) - tvlPrevWeek)
            tvlPrevMonth && (finalTvlPrevMonth = (finalTvlPrevMonth || 0) - tvlPrevMonth)
          }
          // convert to lowercase as server response is not consistent in extra-tvl names
          if (extraTvlsEnabled[prop.toLowerCase()] && (prop.toLowerCase() !== 'doublecounted' || applyDoublecounted)) {
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

        const mcaptvl = mcap && finalTvl ? mcap / finalTvl : null

        return {
          ...props,
          tvl: finalTvl,
          tvlPrevDay: finalTvlPrevDay,
          tvlPrevWeek: finalTvlPrevWeek,
          tvlPrevMonth: finalTvlPrevMonth,
          change_1d: change1d,
          change_7d: change7d,
          change_1m: change1m,
          mcap,
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

export const useCalcProtocolsTvls = (
  filteredProtocols: Readonly<IProtocol[]>,
  defaultSortingColumn?: string,
  dir?: 'asc'
) => {
  const extraTvlsEnabled: ExtraTvls = useGetExtraTvlEnabled()

  const protocolTotals = useMemo(() => {
    const checkExtras = { ...extraTvlsEnabled, doublecounted: !extraTvlsEnabled.doublecounted }

    if (Object.values(checkExtras).every((t) => !t)) {
      return filteredProtocols
    }

    const updatedProtocols = filteredProtocols.map(
      ({ tvl, tvlPrevDay, tvlPrevWeek, tvlPrevMonth, extraTvl, mcap, ...props }) => {
        let finalTvl: number | null = tvl
        let finalTvlPrevDay: number | null = tvlPrevDay
        let finalTvlPrevWeek: number | null = tvlPrevWeek
        let finalTvlPrevMonth: number | null = tvlPrevMonth
        let strikeTvl = false

        Object.entries(extraTvl).forEach(([prop, propValues]) => {
          const { tvl, tvlPrevDay, tvlPrevWeek, tvlPrevMonth } = propValues

          if (prop === 'doublecounted' && !extraTvlsEnabled['doublecounted']) {
            strikeTvl = true
          } else {
            // convert to lowercase as server response is not consistent in extra-tvl names
            if (extraTvlsEnabled[prop.toLowerCase()] && prop.toLowerCase() !== 'doublecounted') {
              // check if final tvls are null, if they are null and tvl exist on selected option, convert to 0 and add them
              tvl && (finalTvl = (finalTvl || 0) + tvl)
              tvlPrevDay && (finalTvlPrevDay = (finalTvlPrevDay || 0) + tvlPrevDay)
              tvlPrevWeek && (finalTvlPrevWeek = (finalTvlPrevWeek || 0) + tvlPrevWeek)
              tvlPrevMonth && (finalTvlPrevMonth = (finalTvlPrevMonth || 0) + tvlPrevMonth)
            }
          }
        })

        let change1d: number | null = getPercentChange(finalTvl, finalTvlPrevDay)
        let change7d: number | null = getPercentChange(finalTvl, finalTvlPrevWeek)
        let change1m: number | null = getPercentChange(finalTvl, finalTvlPrevMonth)

        const mcaptvl = mcap && finalTvl ? mcap / finalTvl : null

        return {
          ...props,
          tvl: finalTvl,
          tvlPrevDay: finalTvlPrevDay,
          tvlPrevWeek: finalTvlPrevWeek,
          tvlPrevMonth: finalTvlPrevMonth,
          change_1d: change1d,
          change_7d: change7d,
          change_1m: change1m,
          mcap,
          mcaptvl,
          strikeTvl,
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
    Object.entries(chainTvls).forEach(([section, sectionTvl]: any) => {
      if (section === 'doublecounted') {
        tvl -= sectionTvl
      }
      // convert to lowercase as server response is not consistent in extra-tvl names
      if (extraTvlsEnabled[section.toLowerCase()]) tvl += sectionTvl
    })
    return tvl
  }, [extraTvlsEnabled, simpleTvl, chainTvls])

  return protocolTvl
}

export const useGroupChainsByParent = (chains: Readonly<IChain[]>, groupData: IGroupData): GroupChain[] => {
  const groupsEnabled = useGroupEnabled()
  const data: GroupChain[] = useMemo(() => {
    const finalData = {}
    const addedChains = []
    for (const parentName in groupData) {
      let tvl: DataValue = null
      let tvlPrevDay: DataValue = null
      let tvlPrevWeek: DataValue = null
      let tvlPrevMonth: DataValue = null
      let mcap: DataValue = null
      let protocols: DataValue = null

      finalData[parentName] = {}

      const parentData = chains.find((item) => item.name === parentName)
      if (parentData) {
        tvl = parentData.tvl || null
        tvlPrevDay = parentData.tvlPrevDay || null
        tvlPrevWeek = parentData.tvlPrevWeek || null
        tvlPrevMonth = parentData.tvlPrevMonth || null
        mcap = parentData.mcap || null
        protocols = parentData.protocols || null
        finalData[parentName] = {
          ...parentData,
          subRows: [parentData],
          symbol: '-',
        }

        addedChains.push(parentName)
      } else {
        finalData[parentName] = {
          symbol: '-',
        }
      }

      let addedChildren = false
      for (const type in groupData[parentName]) {
        if (groupsEnabled[type] === true) {
          for (const child of groupData[parentName][type]) {
            const childData = chains.find((item) => item.name === child)

            const alreadyAdded = (finalData[parentName].subRows ?? []).find((p) => p.name === child)

            if (childData && alreadyAdded === undefined) {
              tvl += childData.tvl
              tvlPrevDay += childData.tvlPrevDay
              tvlPrevWeek += childData.tvlPrevWeek
              tvlPrevMonth += childData.tvlPrevMonth
              mcap += childData.mcap
              protocols += childData.protocols
              const subChains = finalData[parentName].subRows || []
              let mcaptvl = mcap && tvl && mcap / tvl

              finalData[parentName] = {
                ...finalData[parentName],
                tvl,
                tvlPrevDay,
                tvlPrevWeek,
                tvlPrevMonth,
                mcap,
                mcaptvl,
                protocols,
                name: parentName,
                subRows: [...subChains, childData],
              }
              addedChains.push(child)
              addedChildren = true
            }
          }
        }
      }
      if (!addedChildren) {
        if (finalData[parentName].tvl === undefined) {
          delete finalData[parentName]
        } else {
          finalData[parentName] = parentData
        }
      }
    }

    chains.forEach((item) => {
      if (!addedChains.includes(item.name)) {
        finalData[item.name] = item
      }
    })
    return (Object.values(finalData) as GroupChain[]).sort((a, b) => b.tvl - a.tvl)
  }, [chains, groupData, groupsEnabled])

  return data
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
          if (c === 'doublecounted') {
            sum -= chainTvls[c]
            totalDaySum -= chainTvls[c]
          }
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
        if (value === 'doublecounted') {
          sum -= values[value]
        }
        if (extraTvlsEnabled[value.toLowerCase()]) {
          sum += values[value]
        }
      }

      return [date, sum]
    })
  }, [data, extraTvlsEnabled])
}

// PEGGED ASSETS
export const useCalcCirculating = (filteredPeggedAssets: IPegged[], defaultSortingColumn?: string, dir?: 'asc') => {
  const extraPeggedEnabled: ExtraTvls = useGetExtraPeggedEnabled()

  const peggedAssetTotals = useMemo(() => {
    const updatedPeggedAssets = filteredPeggedAssets.map(({ circulating, unreleased, ...props }) => {
      if (extraPeggedEnabled['unreleased'] && unreleased) {
        circulating += unreleased
      }
      return {
        circulating,
        unreleased,
        ...props,
      }
    })

    if (defaultSortingColumn === undefined) {
      return updatedPeggedAssets.sort((a, b) => b.mcap - a.mcap)
    } else {
      return updatedPeggedAssets.sort((a, b) => {
        if (dir === 'asc') {
          return a[defaultSortingColumn] - b[defaultSortingColumn]
        } else return b[defaultSortingColumn] - a[defaultSortingColumn]
      })
    }
  }, [filteredPeggedAssets, extraPeggedEnabled, defaultSortingColumn, dir])

  return peggedAssetTotals
}

// returns circulating by day for a group of tokens
export const useCalcGroupExtraPeggedByDay = (chains) => {
  const extraPeggedEnabled = useGetExtraPeggedEnabled()

  const { data, daySum } = useMemo(() => {
    const daySum = {}

    const data = chains.map(([date, values]) => {
      const circulatings: IChainTvl = {}
      let totalDaySum = 0
      Object.entries(values).forEach(([name, chainCirculating]: ChainTvlsByDay) => {
        let sum = chainCirculating.circulating
        totalDaySum += chainCirculating.circulating
        if (extraPeggedEnabled['unreleased'] && chainCirculating.unreleased) {
          sum += chainCirculating.unreleased
          totalDaySum += chainCirculating.unreleased
        }

        circulatings[name] = sum
      })
      daySum[date] = totalDaySum
      return { date, ...circulatings }
    })
    return { data, daySum }
  }, [chains, extraPeggedEnabled])

  return { data, daySum }
}

export const useGroupChainsPegged = (chains, groupData: IGroupData): GroupChainPegged[] => {
  const groupsEnabled = useGroupEnabled()
  const data: GroupChainPegged[] = useMemo(() => {
    const finalData = {}
    const addedChains = []
    for (const parentName in groupData) {
      let circulating: DataValue = null
      let circulatingPrevDay: DataValue = null
      let circulatingPrevWeek: DataValue = null
      let circulatingPrevMonth: DataValue = null
      let bridgedAmount: number | string | null = null
      let bridgeInfo: { bridge: string; link?: string } | null = null
      let unreleased: DataValue = null

      finalData[parentName] = {}

      const parentData = chains.find((item) => item.name === parentName)
      if (parentData) {
        circulating = parentData.circulating || null
        circulatingPrevDay = parentData.circulatingPrevDay || null
        circulatingPrevWeek = parentData.circulatingPrevWeek || null
        circulatingPrevMonth = parentData.circulatingPrevMonth || null
        bridgedAmount = parentData.bridgedAmount || 0
        bridgeInfo = parentData.bridgeInfo || null
        unreleased = parentData.unreleased || null
        finalData[parentName] = {
          ...parentData,
          subRows: [parentData],
          symbol: '-',
        }

        addedChains.push(parentName)
      } else {
        finalData[parentName] = {
          symbol: '-',
          bridgeInfo: {
            bridge: '',
          },
        }
      }

      let addedChildren = false
      for (const type in groupData[parentName]) {
        if (groupsEnabled[type] === true) {
          for (const child of groupData[parentName][type]) {
            const childData = chains.find((item) => item.name === child)

            const alreadyAdded = (finalData[parentName].subRows ?? []).find((p) => p.name === child)

            if (childData && alreadyAdded === undefined) {
              circulating += childData.circulating
              circulatingPrevDay += childData.circulatingPrevDay
              circulatingPrevWeek += childData.circulatingPrevWeek
              circulatingPrevMonth += childData.circulatingPrevMonth
              unreleased += childData.unreleased
              const subChains = finalData[parentName].subRows || []
              bridgedAmount === '-' ? (bridgedAmount = 0) : true
              if (typeof childData.bridgedAmount === 'number') {
                bridgedAmount += childData.bridgedAmount
              } else {
                if (childData.bridgedAmount === 'all') {
                  bridgedAmount += childData.circulating
                }
              }

              finalData[parentName] = {
                ...finalData[parentName],
                circulating,
                circulatingPrevDay,
                circulatingPrevWeek,
                circulatingPrevMonth,
                bridgedAmount,
                unreleased,
                name: parentName,
                subRows: [...subChains, childData],
              }
              addedChains.push(child)
              addedChildren = true
            }
          }
        }
      }
      if (!addedChildren) {
        if (finalData[parentName].circulating === undefined) {
          delete finalData[parentName]
        } else {
          finalData[parentName] = parentData
        }
      }
      if (
        addedChildren &&
        finalData[parentName] &&
        finalData[parentName].bridgedAmount === finalData[parentName].circulating
      ) {
        finalData[parentName].bridgedAmount = 'all'
      }
    }

    chains.forEach((item) => {
      if (!addedChains.includes(item.name)) {
        finalData[item.name] = item
      }
    })
    return (Object.values(finalData) as GroupChainPegged[]).sort((a, b) => b.circulating - a.circulating)
  }, [chains, groupData, groupsEnabled])

  return data
}
