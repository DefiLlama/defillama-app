export const fetcher = (input: RequestInfo, init?: RequestInit) => fetch(input, init).then((res) => res.json())
export const arrayFetcher = (init?: RequestInit, ...urlArr: RequestInfo[]) => Promise.all(urlArr.map((url => fetcher(url, init))))

export const retrySWR = (error, key, config, revalidate, { retryCount }) => {
    // Only retry up to 3 times.
    if (retryCount >= 3) return
    // Retry after 200 miliseconds.
    setTimeout(() => revalidate({ retryCount }), 200)
}
