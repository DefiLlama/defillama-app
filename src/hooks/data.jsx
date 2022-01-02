import { useMemo } from 'react'
import { useGetExtraTvlEnabled } from 'contexts/LocalStorage'

export const useCalcStakePool2Tvl = (filteredProtocols, defaultSortingColumn) => {
  const extraTvlsEnabled = useGetExtraTvlEnabled()

  const protocolTotals = useMemo(() => {
    if (Object.values(extraTvlsEnabled).every(t => !t)) {
      return filteredProtocols
    }

    const updatedProtocols = filteredProtocols.map(({ tvl, extraTvl, ...props }) => {
      let finalTvl = tvl

      Object.entries(extraTvl).forEach(([prop, propTvl]) => {
        if (extraTvlsEnabled[prop]) {
          finalTvl += propTvl
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
  const extraTvlsEnabled = useGetExtraTvlEnabled()

  const protocolTvl = useMemo(() => {
    let tvl = simpleTvl
    Object.entries(chainTvls).forEach(([section, sectionTvl]) => {
      if (extraTvlsEnabled[section]) tvl += sectionTvl
    })
    return tvl
  }, [extraTvlsEnabled, simpleTvl, chainTvls])

  return protocolTvl
}
