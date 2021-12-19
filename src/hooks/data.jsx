import { useMemo } from 'react'
import { getExtraTvlEnabled } from 'contexts/LocalStorage'

export const useCalcStakePool2Tvl = (filteredProtocols, defaultSortingColumn) => {
  const extraTvlsEnabled = getExtraTvlEnabled()

  const protocolTotals = useMemo(() => {
    if (Object.values(extraTvlsEnabled).every(t => !t)) {
      return filteredProtocols
    }

    const updatedProtocols = filteredProtocols
      .map(({ tvl, extraTvl, ...props }) => {
        let finalTvl = tvl

        Object.entries(extraTvl).map(([prop, propTvl]) => {
          if (extraTvlsEnabled[prop]) {
            finalTvl += propTvl;
          }
        })

        return {
          ...props,
          tvl: finalTvl
        }
      })
    if (defaultSortingColumn === undefined) {
      return updatedProtocols.sort((a, b) => b.tvl - a.tvl)
    } else {
      return updatedProtocols
    }
  }, [filteredProtocols, extraTvlsEnabled, defaultSortingColumn])

  return protocolTotals
}

export const useCalcSingleExtraTvl = (chainTvls, simpleTvl) => {
  const extraTvlsEnabled = getExtraTvlEnabled()

  const protocolTvl = useMemo(() => {
    Object.entries(chainTvls).map(([section, sectionTvl]) => {
      if (extraTvlsEnabled[section])
        simpleTvl += sectionTvl
    })
    return simpleTvl
  }, [extraTvlsEnabled, simpleTvl])

  return protocolTvl
}
