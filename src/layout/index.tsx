import * as React from 'react'
import { Announcement } from '~/components/Announcement'
import { useProtocolsFilterState } from '~/components/Filters/useProtocolFilterState'
import { MetricsAndTools } from '~/components/Metrics'
import { Nav } from '~/components/Nav'
import { DesktopSearch } from '~/components/Search'
import { SearchFallback } from '~/components/Search/Fallback'
import { Select } from '~/components/Select'
import { ISEOProps, SEO } from '~/components/SEO'
import { useIsClient } from '~/hooks'

const Toaster = React.lazy(() => import('~/components/Toast').then((m) => ({ default: m.Toast })))

interface ILayoutProps extends ISEOProps {
	children: React.ReactNode
	metricFilters?: { name: string; key: string }[]
	metricFiltersLabel?: string
	pageName?: Array<string>
	annonuncement?: React.ReactNode
}

function Layout({
	title,
	description,
	keywords,
	canonicalUrl,
	children,
	pageName,
	metricFilters,
	metricFiltersLabel,
	annonuncement,
	...props
}: ILayoutProps) {
	const isClient = useIsClient()
	return (
		<>
			<SEO title={title} description={description} keywords={keywords} canonicalUrl={canonicalUrl} />
			<Nav metricFilters={metricFilters} />
			<main
				{...props}
				className="isolate flex min-h-[calc(100dvh-68px)] flex-col gap-2 p-1 text-(--text-primary) lg:min-h-[100dvh] lg:w-screen lg:p-4 lg:pl-(--nav-width)"
			>
				{annonuncement ? <Announcement>{annonuncement}</Announcement> : null}
				<span className="hidden items-center justify-between gap-2 lg:flex lg:min-h-8">
					<React.Suspense fallback={<SearchFallback />}>
						<DesktopSearch />
					</React.Suspense>
					{!metricFilters || metricFilters.length === 0 ? null : (
						<MetricFilters options={metricFilters} label={metricFiltersLabel} />
					)}
				</span>
				{pageName ? <MetricsAndTools currentMetric={pageName} /> : null}
				{children}
			</main>
			{isClient ? (
				<React.Suspense fallback={<></>}>
					<Toaster />
				</React.Suspense>
			) : null}
		</>
	)
}

const MetricFilters = React.memo(function MetricFilters({
	options,
	label
}: {
	options: { name: string; key: string }[]
	label?: string
}) {
	const { selectedValues, setSelectedValues } = useProtocolsFilterState(options)

	return (
		<>
			<Select
				allValues={options}
				selectedValues={selectedValues}
				setSelectedValues={setSelectedValues}
				selectOnlyOne={(newOption) => {
					setSelectedValues([newOption])
				}}
				label={label || 'Include in TVL'}
				triggerProps={{
					className:
						'whitespace-nowrap *:shrink-0 flex items-center gap-2 py-2 px-3 text-xs rounded-md cursor-pointer flex-nowrap bg-[#E2E2E2] dark:bg-[#181A1C] ml-auto'
				}}
				placement="bottom-end"
			/>
		</>
	)
})

export default React.memo(Layout)

// sidebar + gap between nav & main + padding right
// 228px + 4px + 16px = 248px
