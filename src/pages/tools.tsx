import { useDeferredValue, useMemo, useState } from 'react'
import { matchSorter } from 'match-sorter'
import { Icon } from '~/components/Icon'
import { LinkToMetricOrToolPage } from '~/components/Metrics'
import Layout from '~/layout'
import defillamaPages from '~/public/pages.json'

export default function Tools() {
	const [searchValue, setSearchValue] = useState('')
	const deferredSearchValue = useDeferredValue(searchValue)

	const pages = useMemo(() => {
		if (!deferredSearchValue) return defillamaPages.Tools
		return matchSorter(defillamaPages.Tools, deferredSearchValue, {
			baseSort: (a, b) => (a.index < b.index ? -1 : 1),
			keys: ['name', 'description'],
			threshold: matchSorter.rankings.CONTAINS
		})
	}, [deferredSearchValue])

	return (
		<Layout title="Tools - DefiLlama">
			<div className="flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
				<h1 className="text-2xl font-bold">Tools</h1>
				<div className="relative">
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
					/>
					<input
						type="text"
						placeholder="Search..."
						className="dark:placeholder:[#919296] min-h-8 w-full rounded-md border-(--bg-input) bg-(--bg-input) p-[6px] pl-7 text-black outline-hidden placeholder:text-[#666] dark:text-white"
						value={searchValue}
						onChange={(e) => setSearchValue(e.target.value)}
					/>
				</div>
			</div>
			<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{pages.map((tool: any) => (
					<LinkToMetricOrToolPage key={`tool-${tool.name}-${tool.route}`} page={tool} totalTrackedByMetric={null} />
				))}
			</div>
		</Layout>
	)
}
