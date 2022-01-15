import { useMemo } from 'react'
import { useGetExtraTvlEnabled } from 'contexts/LocalStorage'

export const useCalcStakePool2Tvl = (filteredProtocols, defaultSortingColumn) => {
  const extraTvlsEnabled = useGetExtraTvlEnabled()

  const protocolTotals = useMemo(() => {
    if (Object.values(extraTvlsEnabled).every((t) => !t)) {
      return filteredProtocols
    }

    const updatedProtocols = filteredProtocols.map(
      ({ tvl, change_1d, change_7d, change_1m, extraTvl, extraTvlsChange, ...props }) => {
        let finalTvl = tvl
        let change1d = change_1d
        let change7d = change_7d
        let change1m = change_1m

        Object.entries(extraTvl).forEach(([prop, propTvl]) => {
          // convert to lowercase as server response is not consistent in extra-tvl names
          if (extraTvlsEnabled[prop.toLowerCase()]) {
            finalTvl += propTvl
          }
        })

        Object.entries(extraTvlsChange).forEach(([prop, propChange]) => {
          if (extraTvlsEnabled[prop.toLowerCase()]) {
            if (propChange.change_1d !== null) {
              change1d = (change1d || 0) + propChange.change_1d
            }
            if (propChange.change_7d !== null) {
              change7d = (change7d || 0) + propChange.change_7d
            }
            if (propChange.change_1m !== null) {
              change1m = (change1m || 0) + propChange.change_1m
            }
          }
        })

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
