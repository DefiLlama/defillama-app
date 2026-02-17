import { useMemo } from 'react'
import type { IFormattedProtocol } from '~/api/types'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { formatDataWithExtraTvls } from './defi'

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
