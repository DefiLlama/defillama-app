import { NFT_SEARCH_API } from '../../../constants'
import useSWR from 'swr'
import { fetcher } from 'utils/dataApi'
import { useDebounce } from 'hooks';

export const useFetchNFTsList = (searchValue: string) => {
  const debouncedSearchTerm = useDebounce(searchValue, 500);
  const { data, error } = useSWR(debouncedSearchTerm ? `${NFT_SEARCH_API}?query=${debouncedSearchTerm}` : null, fetcher)
  return {
    data: data?.hits.map(el => el._source),
    error: error?.error,
    loading: (!data && !error && !!searchValue) || (searchValue != debouncedSearchTerm),
  }
}
