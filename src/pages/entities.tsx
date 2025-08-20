import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { Treasuries } from '~/containers/Treasuries'
import { getEntitiesData } from '~/containers/Treasuries/queries'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('entities', async () => {
	const data = await getEntitiesData()
	return { props: { data, entity: true }, revalidate: maxAgeForNext([22]) }
})

export default function Entities(props) {
	return <Treasuries {...props} />
}
