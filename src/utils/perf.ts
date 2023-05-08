// import { performance } from 'perf_hooks'
import { GetStaticProps, GetStaticPropsContext } from 'next'

export const withPerformanceLogging = <T extends {}>(
	filename: string,
	getStaticPropsFunction: GetStaticProps<T>
): GetStaticProps<T> => {
	return async (context: GetStaticPropsContext) => {
		const start = Date.now()
		const { params } = context
		try {
			const props = await getStaticPropsFunction(context)
			const end = Date.now()

			if (end - start > 10_000) {
				console.log(
					`[PREPARED][${(end - start).toFixed(0)}ms] <${filename}>` + (params ? ' ' + JSON.stringify(params) : '')
				)
			}

			return props
		} catch (error) {
			const end = Date.now()
			console.log(`[ERROR][${(end - start).toFixed(0)}ms] <${filename}>` + (params ? ' ' + JSON.stringify(params) : ''))
			throw error
		}
	}
}

export const fetchWithPerformaceLogging = async (api) => {
	const startTime = Date.now()

	const data = await fetch(api).then((res) => res.json())

	if (Date.now() - startTime > 5_000) {
		console.log('done fetching', api, Date.now() - startTime)
	}

	return data
}
