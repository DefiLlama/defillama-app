import { useQuery } from '@tanstack/react-query'
import { getProtocolEmissionsList } from '~/api/categories/protocols'
import { slug, tokenIconUrl } from '~/utils'
import { IGetSearchList } from '../types'

export function useGetUnlocksSearchList({ disabled }: { disabled?: boolean }): IGetSearchList {
	const { data, isLoading, isError } = useQuery({
		queryKey: ['unlocks-search-list'],
		queryFn: () =>
			getProtocolEmissionsList().catch((err) => {
				console.error(err)
				return null
			}),
		staleTime: 60 * 60 * 1000,
		enabled: !disabled
	})

	const searchData = disabled
		? []
		: (data ?? []).map((protocol) => ({
				name: protocol.name,
				logo: tokenIconUrl(protocol.name),
				route: `/unlocks/${slug(protocol.name)}`
		  }))

	return { data: searchData, loading: isLoading, error: isError }
}
