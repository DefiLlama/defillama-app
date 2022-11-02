import useSWR from 'swr'
import { BRIDGES_API } from '~/constants'
import { fetcher } from '~/utils/useSWR'

export const useFetchBridgeList = () => {
	const { data, error } = useSWR(BRIDGES_API, fetcher)
	return { data, error, loading: !data && !error }
}
