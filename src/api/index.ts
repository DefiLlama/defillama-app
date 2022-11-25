import useSWR from 'swr'
import { CG_TOKEN_API } from '~/constants/index'
import { arrayFetcher, retrySWR } from '~/utils/useSWR'
import type { IResponseCGMarketsAPI } from './types'

export function getCGMarketsDataURLs() {
	const urls: string[] = []
	const maxPage = 10
	for (let page = 1; page <= maxPage; page++) {
		urls.push(`${CG_TOKEN_API.replace('<PLACEHOLDER>', `${page}`)}`)
	}
	return urls
}

export const useFetchCoingeckoTokensList = () => {
	const { data, error } = useSWR<Array<IResponseCGMarketsAPI>>(
		'coingeckotokenslist',
		() => arrayFetcher(getCGMarketsDataURLs()),
		{
			onErrorRetry: retrySWR
		}
	)

	return {
		data: data?.flat(),
		error,
		loading: !data && !error
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

//:00 -> adapters start running, they take up to 15mins
//:20 -> storeProtocols starts running, sets cache expiry to :21 of next hour
//:22 -> we rebuild all pages
function next22Minutedate(minutesForRollover: number) {
	const dt = new Date()
	dt.setMinutes(minutesForRollover)
	if (dt < new Date()) {
		dt.setHours(dt.getHours() + 1)
	}
	return dt
}

export function revalidate(minutesForRollover: number = 22) {
	const current = Date.now()
	const secondsTillRevalidation = Math.ceil((next22Minutedate(minutesForRollover).getTime() - current) / 1000)
	return secondsTillRevalidation > 0 ? secondsTillRevalidation : 3600
}
