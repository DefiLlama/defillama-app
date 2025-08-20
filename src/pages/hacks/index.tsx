import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { HacksContainer } from '~/containers/Hacks'
import { getHacksPageData } from '~/containers/Hacks/queries'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('hacks', async () => {
	const data = await getHacksPageData()
	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

export default function Hacks(props) {
	return <HacksContainer {...props} />
}
