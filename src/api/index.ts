import { CG_TOKEN_API } from '~/constants/index'
import { fetchApi, fetchWithErrorLogging } from '~/utils/async'
import type { IResponseCGMarketsAPI } from './types'
import { useQuery } from '@tanstack/react-query'

function getCGMarketsDataURLs() {
	const urls: string[] = []
	const maxPage = 20
	for (let page = 1; page <= maxPage; page++) {
		urls.push(`${CG_TOKEN_API.replace('<PLACEHOLDER>', `${page}`)}`)
	}
	return urls
}

export const useFetchCoingeckoTokensList = () => {
	const { data, isLoading, error } = useQuery({
		queryKey: ['coingeckotokenslist'],
		queryFn: () => fetchApi(getCGMarketsDataURLs())
	})

	return {
		data: data?.flat(),
		error,
		isLoading
	}
}

export async function retryCoingeckoRequest(func, retries) {
	for (let i = 0; i < retries; i++) {
		try {
			const resp = await func()
			return resp
		} catch (e) {
			if ((i + 1) % 3 === 0 && retries > 3) {
				await new Promise((resolve) => setTimeout(resolve, 10e3))
			}
			continue
		}
	}
	return {}
}

export async function getAllCGTokensList(): Promise<Array<IResponseCGMarketsAPI>> {
	const data = await fetchWithErrorLogging('https://defillama-datasets.llama.fi/tokenlist/sorted.json').then((res) =>
		res.json()
	)

	return data
}

//:00 -> adapters start running, they take up to 15mins
//:20 -> storeProtocols starts running, sets cache expiry to :21 of next hour
//:22 -> we rebuild all pages
export function maxAgeForNext(minutesForRollover: number[] = [22]) {
	// minutesForRollover is an array of minutes in the hour that we want to revalidate
	const currentMinute = new Date().getMinutes()
	const currentSecond = new Date().getSeconds()
	const nextMinute = minutesForRollover.find((m) => m > currentMinute) ?? Math.min(...minutesForRollover) + 60
	const maxAge = nextMinute * 60 - currentMinute * 60 - currentSecond
	return maxAge
}
