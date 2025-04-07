import { useQuery } from '@tanstack/react-query'
import { getProtocolsMetadataByChain, IChainOverviewData } from './queries'

export function ChainOverview(props: IChainOverviewData) {
	const { data } = useQuery({
		queryKey: ['protocols-list', props.metadata.name],
		queryFn: () => getProtocolsMetadataByChain({ chainDisplayName: props.metadata.name })
	})
	console.log({ data })
	return <></>
}
