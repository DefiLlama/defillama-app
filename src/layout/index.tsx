import * as React from 'react'
import Head from 'next/head'
import { useProtocolsFilterState } from '~/components/Filters/useProtocolFilterState'
import { MetricsAndTools } from '~/components/Metrics'
import { Nav } from '~/components/Nav'
import { DesktopSearch } from '~/components/Search'
import { SearchFallback } from '~/components/Search/Fallback'
import { Select } from '~/components/Select'
import { SEO } from '~/components/SEO'
import { useIsClient } from '~/hooks'

const Toaster = React.lazy(() => import('~/components/Toast').then((m) => ({ default: m.Toast })))

interface ILayoutProps {
	title: string
	children: React.ReactNode
	customSEO?: boolean
	className?: string
	style?: React.CSSProperties
	includeInMetricsOptions?: { name: string; key: string }[]
	includeInMetricsOptionslabel?: string
	pageName?: Array<string>
}

export default function Layout({
	title,
	children,
	customSEO = false,
	className,
	pageName,
	includeInMetricsOptions,
	includeInMetricsOptionslabel,
	...props
}: ILayoutProps) {
	const isClient = useIsClient()
	return (
		<>
			<Head>
				<title>{title}</title>
			</Head>

			{customSEO ? null : <SEO />}
			<Nav />
			<main
				{...props}
				className={`isolate flex min-h-screen flex-col gap-2 p-1 text-(--text-primary) lg:w-screen lg:p-4 lg:pl-[248px] ${
					className ?? ''
				}`}
			>
				<span className="hidden items-center justify-between gap-2 lg:flex lg:min-h-8">
					<React.Suspense fallback={<SearchFallback />}>
						<DesktopSearch />
					</React.Suspense>
					{!includeInMetricsOptions || includeInMetricsOptions.length === 0 ? null : (
						<IncludeInMetricsOptions options={includeInMetricsOptions} label={includeInMetricsOptionslabel} />
					)}
				</span>
				{pageName ? <MetricsAndTools currentMetric={pageName} /> : null}
				{children}
			</main>
			{isClient ? (
				<React.Suspense>
					<Toaster />
				</React.Suspense>
			) : null}
		</>
	)
}

const IncludeInMetricsOptions = React.memo(function IncludeInMetricsOptions({
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
						'flex items-center gap-2 py-2 px-3 text-xs rounded-md cursor-pointer flex-nowrap bg-[#E2E2E2] dark:bg-[#181A1C] ml-auto'
				}}
				placement="bottom-end"
			/>
		</>
	)
})

// sidebar + gap between nav & main + padding right
// 228px + 4px + 16px = 248px
