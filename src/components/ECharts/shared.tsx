import * as React from 'react'
import * as Ariakit from '@ariakit/react'
import { useRouter } from 'next/router'
import { matchSorter } from 'match-sorter'

function renderValue(value: Array<string> | string, title: string) {
	return (
		<span className="flex items-center gap-1">
			<span className="text-[10px] rounded-full min-w-4 flex items-center justify-center bg-[var(--bg4)] px-[1px]">
				{typeof value === 'string' ? 1 : value?.length ?? 0}
			</span>
			<span>{title}</span>
		</span>
	)
}

interface ISelectLegendMultipleProps {
	allOptions: Array<string>
	options: Array<string>
	setOptions: React.Dispatch<React.SetStateAction<Array<string>>>
	title: string
}

export function SelectLegendMultiple({ allOptions, options, setOptions, title, ...props }: ISelectLegendMultipleProps) {
	const router = useRouter()

	const [searchValue, setSearchValue] = React.useState('')

	const matches = React.useMemo(() => {
		return matchSorter(allOptions, searchValue, {
			baseSort: (a, b) => (a.index < b.index ? -1 : 1)
		})
	}, [allOptions, searchValue])

	return (
		<Ariakit.ComboboxProvider
			resetValueOnHide
			setValue={(value) => {
				React.startTransition(() => {
					setSearchValue(value)
				})
			}}
		>
			<Ariakit.SelectProvider
				value={options}
				setValue={(values) => {
					setOptions(values)
				}}
			>
				<Ariakit.Select
					{...props}
					className="bg-[var(--btn-bg)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] flex items-center gap-2 py-2 px-3 text-xs rounded-md cursor-pointer text-[var(--text1)] flex-nowrap ml-auto"
				>
					{renderValue(options, title)}
					<Ariakit.SelectArrow />
				</Ariakit.Select>
				<Ariakit.SelectPopover
					unmountOnHide
					hideOnInteractOutside
					gutter={6}
					wrapperProps={{
						className: 'max-sm:!fixed max-sm:!bottom-0 max-sm:!top-[unset] max-sm:!transform-none max-sm:!w-full'
					}}
					className="flex flex-col bg-[var(--bg1)] rounded-md z-10 overflow-auto overscroll-contain min-w-[180px] max-h-[60vh] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer"
				>
					<Ariakit.Combobox
						placeholder="Search..."
						autoFocus
						className="bg-white dark:bg-black rounded-md py-2 px-3 m-3 mb-0"
					/>

					{matches.length > 0 ? (
						<>
							<span className="sticky z-[1] top-0 flex flex-wrap justify-between gap-1 bg-[var(--bg1)] text-[var(--link)] text-xs border-b border-black/10 dark:border-white/10">
								<button onClick={() => setOptions([])} className="p-3">
									Clear
								</button>
								{router.pathname !== '/comparison' && (
									<button onClick={() => setOptions(allOptions)} className="p-3">
										Toggle all
									</button>
								)}
							</span>
							<Ariakit.ComboboxList>
								{matches.map((value) => (
									<Ariakit.SelectItem
										key={`${title}-${value}`}
										value={value}
										className="flex items-center justify-between gap-4 py-2 px-3 flex-shrink-0 hover:bg-[var(--primary1-hover)] focus-visible:bg-[var(--primary1-hover)] cursor-pointer last-of-type:rounded-b-md border-b border-black/10 dark:border-white/10"
										render={<Ariakit.ComboboxItem />}
									>
										<span>{value}</span>
										<Ariakit.SelectItemCheck className="h-3 w-3 flex items-center justify-center rounded-sm flex-shrink-0 border border-[#28a2b5]" />
									</Ariakit.SelectItem>
								))}
							</Ariakit.ComboboxList>
						</>
					) : (
						<p className="text-[var(--text1)] py-6 px-3 text-center">No results found</p>
					)}
				</Ariakit.SelectPopover>
			</Ariakit.SelectProvider>
		</Ariakit.ComboboxProvider>
	)
}
