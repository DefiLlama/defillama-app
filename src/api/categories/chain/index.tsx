import useSWR from 'swr'
import { getChainPageData as getChainVolume } from '~/api/categories/adaptors'
import { getChainsPageData } from '~/api/categories/adaptors'

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
	const { data, error } = useSWR(
		`volumeChartDataByChain/${chain}`,
		chain === 'All'
			? () =>
					getChainsPageData('dexs').then((volumeData) =>
						chain === 'All' || volumeData?.totalDataChart[0]?.[0][chain]
							? volumeData?.totalDataChart?.[0].map((val) => [
									val.date,
									(chain === 'All' ? sum(val) : val[chain]) ?? null
							  ])
							: null
					)
			: () => null
	)

	return { data, loading: !data && data !== null && !error }
}
