import { useQuery } from '@tanstack/react-query'
import { getForkPageData } from '~/api/categories/protocols'
import { ForkContainer } from '~/containers/ForkContainer'

export function ForksData({ protocolName }: { protocolName: string }) {
	const { data, isLoading, error } = useQuery({
		queryKey: ['forks', protocolName],
		queryFn: () =>
			getForkPageData(protocolName).then((data) => ({
				chartData: data.props.chartData,
				tokenLinks: [],
				token: data.props.token,
				filteredProtocols: data.props.filteredProtocols,
				parentTokens: []
			})),
		staleTime: 60 * 60 * 1000
	})

	if (isLoading) {
		return <p style={{ margin: '180px 0', textAlign: 'center' }}>Loading...</p>
	}

	if (error) {
		return <p style={{ margin: '180px 0', textAlign: 'center' }}>{JSON.stringify(error)}</p>
	}

	return (
		<div style={{ minHeight: '460px' }}>
			<ForkContainer {...data} skipTableVirtualization />
		</div>
	)
}
