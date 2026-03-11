import { Announcement } from '~/components/Announcement'
import type { PrecomputedData, UnlocksData } from '~/containers/Unlocks/calendarTypes'
import { CalendarView } from '~/containers/Unlocks/CalendarView'
import { getUnlocksCalendarStaticPropsData } from '~/containers/Unlocks/queries'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('unlocks-calendar', async () => {
	const { unlocksData, precomputedData } = await getUnlocksCalendarStaticPropsData()

	return {
		props: {
			unlocksData,
			precomputedData
		},
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Token Unlocks Calendar']

export default function UnlocksCalendar({
	unlocksData: initialUnlocksData,
	precomputedData
}: {
	unlocksData: UnlocksData
	precomputedData: PrecomputedData
}) {
	return (
		<Layout
			title={`Token Unlocks Calendar - DefiLlama`}
			description="View upcoming token unlocks on a calendar. Track vesting schedules, unlock dates, and token amounts for DeFi protocols."
			canonicalUrl={`/unlocks/calendar`}
			pageName={pageName}
		>
			<Announcement notCancellable>
				<span>Are we missing any protocol?</span>{' '}
				<a
					href="https://airtable.com/shrD1bSGYNcdFQ6kd"
					className="font-medium text-(--blue) underline"
					target="_blank"
					rel="noopener noreferrer"
				>
					Add it here!
				</a>
			</Announcement>
			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
				<CalendarView initialUnlocksData={initialUnlocksData} precomputedData={precomputedData} />
			</div>
		</Layout>
	)
}
