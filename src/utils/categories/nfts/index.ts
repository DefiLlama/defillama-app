import { NFT_SEARCH_API } from '../../../constants'
import useSWR from 'swr'
import { useDebounce } from 'hooks';
import { fetcher } from 'utils/useSWR';

interface IResponseNFTSearchAPI {
  hits: Array<{
    _id: string
    _index: string
    _score: number
    _source: {
      logo: string
      name: string
      slug: string
      symbol: string
    }
    _type: string
  }>
  max_score: number,
  total: {
    relation: string,
    value: number
  }
}

export const useFetchNFTsList = (searchValue: string) => {
  const debouncedSearchTerm = useDebounce(searchValue, 500);
  const { data, error } = useSWR<IResponseNFTSearchAPI>(debouncedSearchTerm ? `${NFT_SEARCH_API}?query=${debouncedSearchTerm}` : null, fetcher)

  return {
    data: data?.hits.map(el => el._source),
    error: error?.error,
    loading: (!data && !error && !!searchValue) || (searchValue != debouncedSearchTerm),
  }
}
