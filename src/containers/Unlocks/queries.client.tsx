import { useQuery } from '@tanstack/react-query'
import { slug } from '~/utils'
import { getProtocolEmissons } from './queries'

export const useGetProtocolEmissions = (protocol?: string | null) => {
	const isEnabled = !!protocol
	return useQuery({
		queryKey: ['emissions', protocol, isEnabled],
		queryFn: isEnabled ? () => getProtocolEmissons(slug(protocol)) : () => Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
}
