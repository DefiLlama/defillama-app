import { useQuery } from '@tanstack/react-query'
import { PROTOCOL_EMISSION_API } from '~/constants'

// TODO check emissions
export const useEmissions = (protocol) => {
	const { data } = useQuery({
		queryKey: ['emissions', protocol],
		queryFn: () =>
			fetch(`${PROTOCOL_EMISSION_API}/${protocol}`)
				.then((r) => r.json())
				.then((r) => JSON.parse(r.body))
				.catch(() => null),
		staleTime: 60 * 60 * 1000
	})
	const result = data
		? data?.unlockUsdChart
				?.filter(([_, value]) => value > 0)
				?.reduce((acc, [ts, val]) => {
					acc[ts] = val
					return acc
				}, {})
		: {}

	return Object.keys(result ?? {}).length ? result : null
}
