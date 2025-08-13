import { useQuery } from '@tanstack/react-query'
import { ForksByProtocol } from '~/containers/Forks'
import { getForkPageData } from '~/containers/Forks/queries'

export function ForksData({ protocolName }: { protocolName: string }) {
	const { data, isLoading, error } = useQuery({
		queryKey: ['forks', protocolName],
		queryFn: () =>
			getForkPageData(protocolName).then((data) =>
				data
					? {
							chartData: data.chartData,
							tokenLinks: [],
							token: data.token,
							filteredProtocols: data.filteredProtocols,
							parentTokens: []
						}
					: null
			),
		staleTime: 60 * 60 * 1000
	})

	if (isLoading) {
		return <p className="my-[180px] text-center">Loading...</p>
	}

	if (error) {
		return <p className="my-[180px] text-center">{error.message}</p>
	}

	if (!data) {
		return <p className="my-[180px] text-center">Failed to fetch</p>
	}

	return (
		<div className="min-h-[460px]">
			<ForksByProtocol {...data} />
		</div>
	)
}
