import * as React from 'react'
import { withPerformanceLogging } from '~/utils/perf'
import { maxAgeForNext } from '~/api'
import { getTreasuryData } from '~/Treasuries/queries'
import { Treasuries } from '~/Treasuries'

export const getStaticProps = withPerformanceLogging('treasuries', async () => {
	const data = await getTreasuryData()
	console.log({ data })
	return { props: { data, entity: false }, revalidate: maxAgeForNext([22]) }
})

export default function TreasuriesPage(props) {
	return <Treasuries {...props} />
}
