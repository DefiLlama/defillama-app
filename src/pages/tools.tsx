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
			<div className="p-2 bg-(--cards-bg) border border-(--cards-border) rounded-md flex flex-col gap-2">
				<h1 className="text-2xl font-bold">Tools</h1>
				<div className="relative">
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute text-(--text-tertiary) top-0 bottom-0 my-auto left-2"
					/>
					<input
						type="text"
						placeholder="Search..."
						className="w-full border-(--bg-input) bg-(--bg-input) p-[6px] pl-7 min-h-8 text-black dark:text-white placeholder:text-[#666] dark:placeholder:[#919296] rounded-md outline-hidden"
						value={searchValue}
						onChange={(e) => setSearchValue(e.target.value)}
					/>
				</div>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1">
				{pages.map((tool: any) => (
					<BasicLink
						key={`tool-${tool.name}-${tool.route}`}
						className="p-[10px] rounded-md bg-(--cards-bg) border border-(--cards-border) col-span-1 flex flex-col items-start gap-[2px] hover:bg-[rgba(31,103,210,0.12)] min-h-[120px]"
						href={tool.route}
					>
						<span className="font-medium">{tool.name}</span>
						<span className="text-(--text-form) text-start whitespace-pre-wrap">{tool.description ?? ''}</span>
					</BasicLink>
				))}
			</div>
		</Layout>
	)
}
