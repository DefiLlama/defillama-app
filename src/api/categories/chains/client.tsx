import useSWR from 'swr'
import { getChainPageData as getChainVolume } from '~/api/categories/adaptors'
import { getChainsPageData } from '~/api/categories/adaptors'
import { getDexVolumeByChain } from '../dexs'

const sum = (obj) => {
	return Object.values(obj).reduce((acc: any, curr) => (typeof curr === 'number' ? (acc += curr) : acc), 0)
}

export function useGetProtocolsVolumeByChain(chain?: string) {
	const { data, error } = useSWR(
		`protocolsVolumeByChain/${chain}`,
		chain
			? () =>
					getChainVolume('dexs', chain)
						.catch(() => ({}))
						.then((r: any) => (r.total24h === undefined ? {} : r))
						.then((chainVolumeData) => {
							if (chainVolumeData) {
								const chainProtocolsVolumes = []
								chainVolumeData?.protocols?.forEach((prototcol) =>
									chainProtocolsVolumes.push(prototcol, ...(prototcol?.subRows || []))
								)
								return chainProtocolsVolumes
							}

							return null
						})
						.catch((err) => {
							console.log(err)
							return null
						})
			: () => null
	)

	return { data, loading: !data && data !== null && !error }
}

export function useGetVolumeChartDataByChain(chain?: string) {
	const { data, error } = useSWR(`volumeChartDataByChain/${chain}`, () =>
		getDexVolumeByChain({ chain, excludeTotalDataChart: false, excludeTotalDataChartBreakdown: true }).then(
			(data) => data.totalDataChart ?? null
		)
	)

	return { data: data ?? null, loading: !data && data !== null && !error }
}
