import useSWR from 'swr'
import { PEGGEDS_API } from '~/constants'
import { fetcher } from '~/utils/useSWR'

export const useFetchPeggedList = () => {
	const { data, error } = useSWR(PEGGEDS_API, fetcher)
	return { data, error, loading: !data && !error }
}
