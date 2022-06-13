import useSWR from 'swr'
import { arrayFetcher, getCGMarketsDataURLs } from 'utils/dataApi'

export const retrySWR = (error, key, config, revalidate, { retryCount }) => {
  // Only retry up to 3 times.
  if (retryCount >= 3) return
  // Retry after 200 miliseconds.
  setTimeout(() => revalidate({ retryCount }), 200)
}

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
