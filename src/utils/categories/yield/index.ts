import useSWR from 'swr'
import { getCGMarketsDataURLs } from 'utils/dataApi'
import { arrayFetcher, retrySWR } from 'utils/useSWR'

export const useFetchYieldsList = () => {
  const { data, error } = useSWR(getCGMarketsDataURLs(), (urls) => arrayFetcher(undefined, urls), {
    onErrorRetry: retrySWR,
  })
  return {
    data: data?.flat(),
    error,
    loading: !data && !error,
  }
}
