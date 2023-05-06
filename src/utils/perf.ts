import { performance } from 'perf_hooks'
import { GetStaticProps, GetStaticPropsContext } from 'next'

export const withPerformanceLogging = <T extends {}>(
	filename: string,
	getStaticPropsFunction: GetStaticProps<T>
): GetStaticProps<T> => {
	return async (context: GetStaticPropsContext) => {
		const start = performance.now()
		const { params } = context
		try {
			const props = await getStaticPropsFunction(context)
			const end = performance.now()
			console.log(
				`[PREPARED][${(end - start).toFixed(0)}ms] <${filename}>` + (params ? ' ' + JSON.stringify(params) : '')
			)
			return props
		} catch (error) {
			const end = performance.now()
			console.log(`[ERROR][${(end - start).toFixed(0)}ms] <${filename}>` + (params ? ' ' + JSON.stringify(params) : ''))
			throw error
		}
	}
}

export const fetchWithPerformaceLogging = async (api) => {
	const dateNow = Date.now()
	console.log('started fetching', api)
	const data = fetch(api).then((res) => res.json())
	console.log('done fetching', api, Date.now() - dateNow)
	return data
}
