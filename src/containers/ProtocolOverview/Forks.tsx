import { useQuery } from '@tanstack/react-query'
import { LocalLoader } from '~/components/Loaders'
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
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0
	})

	if (isLoading) {
		return (
			<div className="flex min-h-[408px] items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<LocalLoader />
			</div>
		)
	}

	if (error || !data) {
		return (
			<div className="flex min-h-[408px] items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<p>{error instanceof Error ? error.message : 'Failed to fetch'}</p>
			</div>
		)
	}

	return (
		<div className="min-h-[460px]">
			<ForksByProtocol {...data} />
		</div>
	)
}
