import { useQuery } from '@tanstack/react-query'
import { LocalLoader } from '~/components/Loaders'
import { ForksByProtocol } from '~/containers/Forks/ForksByProtocol'
import { getForksByProtocolPageData } from '~/containers/Forks/queries'

export function ForksData({ protocolName }: { protocolName: string }) {
	const { data, isLoading, error } = useQuery({
		queryKey: ['forks', protocolName],
		queryFn: () => getForksByProtocolPageData({ fork: protocolName }),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0
	})

	if (isLoading) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<LocalLoader />
			</div>
		)
	}

	if (error || !data) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<p className="p-2">{error instanceof Error ? error.message : 'Failed to fetch'}</p>
			</div>
		)
	}

	return <ForksByProtocol {...data} />
}
