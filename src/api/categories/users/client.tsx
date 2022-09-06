import useSWR from 'swr'
import { USER_METRICS_PROTOCOL_API } from '~/constants'
import { fetcher } from '~/utils/useSWR'

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
	const { data, error } = useSWR<Array<IData>>(
		protocolName ? `${USER_METRICS_PROTOCOL_API}/${protocolName}` : null,
		fetcher
	)

	return { data, error, loading: protocolName && !data && !error }
}
