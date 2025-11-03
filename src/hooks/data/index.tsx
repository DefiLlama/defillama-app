import { useMemo } from 'react'
import { IFormattedProtocol } from '~/api/types'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { formatDataWithExtraTvls, groupDataWithTvlsByDay } from './defi'

// PROTOCOLS
export const useCalcStakePool2Tvl = (
	filteredProtocols: Readonly<Array<IFormattedProtocol>>,
	defaultSortingColumn?: string,
	dir?: 'asc',
	applyLqAndDc = false
) => {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')

	const protocolTotals = useMemo(() => {
		return formatDataWithExtraTvls({
			data: filteredProtocols,
			defaultSortingColumn,
			dir,
			applyLqAndDc,
			extraTvlsEnabled
		})
	}, [filteredProtocols, extraTvlsEnabled, defaultSortingColumn, dir, applyLqAndDc])

	return protocolTotals as unknown as Array<IFormattedProtocol>
}

// returns tvl by day for a group of tokens
export const useCalcGroupExtraTvlsByDay = (chains, tvlTypes = null) => {
	const [extraTvls] = useLocalStorageSettingsManager('tvl')

	return useMemo(
		() => groupDataWithTvlsByDay({ chains, tvlTypes, extraTvlsEnabled: extraTvls }),
		[extraTvls, chains, tvlTypes]
	)
}

// returns tvl by day for a single token
export function formatChartTvlsByDay({ data, extraTvlsEnabled, key }) {
	return data.map(([date, values]) => {
		let sum = values.tvl || 0

		for (const value in values) {
			if (value === 'doublecounted' && !extraTvlsEnabled['doublecounted']) {
				sum -= values[value]
			}

			if ((value === 'liquidstaking' || value === 'd') && !extraTvlsEnabled['liquidstaking']) {
				sum -= values[value]
			}

			if (value.toLowerCase() === 'dcandlsoverlap') {
				if (!extraTvlsEnabled['doublecounted'] || !extraTvlsEnabled['liquidstaking']) {
					sum += values[value]
				}
			}

			if (extraTvlsEnabled[value.toLowerCase()] && value !== 'doublecounted' && value !== 'liquidstaking') {
				sum += values[value]
			}
		}

		return [Number(date) * 1e3, sum]
	})
}
