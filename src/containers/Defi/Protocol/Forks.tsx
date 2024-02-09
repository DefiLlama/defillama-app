import useSWR from 'swr'
import { getForkPageData } from '~/api/categories/protocols'
import { ForkContainer } from '~/containers/ForkContainer'

export function ForksData({ protocolName }: { protocolName: string }) {
	const { data, error } = useSWR(`/forks/${protocolName}`, () =>
		getForkPageData(protocolName).then((data) => ({
			chartData: data.props.chartData,
			tokenLinks: [],
			token: data.props.token,
			filteredProtocols: data.props.filteredProtocols,
			parentTokens: []
		}))
	)

	const isLoading = !data && !error

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
