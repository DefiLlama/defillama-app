import { matchSorter } from 'match-sorter'
import { useDeferredValue, useMemo, useState } from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import Layout from '~/layout'
import insightsAndTools from '~/public/insights-and-tools.json'

export default function Tools() {
	const [searchValue, setSearchValue] = useState('')
	const deferredSearchValue = useDeferredValue(searchValue)

	const pages = useMemo(() => {
		return matchSorter(insightsAndTools.Tools, deferredSearchValue, {
			baseSort: (a, b) => (a.index < b.index ? -1 : 1),
			keys: ['name', 'description'],
			threshold: matchSorter.rankings.CONTAINS
		})
	}, [deferredSearchValue])

	return (
		<Layout title="Tools - DefiLlama" defaultSEO>
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
			<div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{pages.map((tool: any) => (
					<BasicLink
						key={`tool-${tool.name}-${tool.route}`}
						className="col-span-1 flex min-h-[120px] flex-col items-start gap-[2px] rounded-md border border-(--cards-border) bg-(--cards-bg) p-[10px] hover:bg-[rgba(31,103,210,0.12)]"
						href={tool.route}
					>
						<span className="font-medium">{tool.name}</span>
						<span className="text-start whitespace-pre-wrap text-(--text-form)">{tool.description ?? ''}</span>
					</BasicLink>
				))}
			</div>
		</Layout>
	)
}
