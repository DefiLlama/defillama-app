import { useQuery } from '@tanstack/react-query'
import { USER_METRICS_PROTOCOL_API } from '~/constants'
import { fetchApi } from '~/utils/async'

interface IData {
	adaptor: string
	chain: string
	column_type: string
	day: string
	new_users: number | null
	sticky_users: number | null
	total_txs: number | null
	unique_users: number | null
}

export const useFetchProtocolUserMetrics = (protocolName?: string | string[]) => {
	const url = protocolName ? `${USER_METRICS_PROTOCOL_API}/${protocolName}` : null
	return useQuery<Array<IData>>({
		queryKey: [url],
		queryFn: () => fetchApi(url)
	})
}
