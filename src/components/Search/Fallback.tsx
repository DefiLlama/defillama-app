import { Icon } from '../Icon'

export const SearchFallback = () => {
	return (
		<div className="relative isolate w-full max-w-[50vw] cursor-not-allowed">
			<div className="absolute top-[8px] left-[8px] opacity-50">
				<div className="sr-only">Open Search</div>
				<Icon name="search" height={14} width={14} />
			</div>
			<div className="w-full rounded-md border border-(--cards-border) bg-(--app-bg) px-[10px] py-[5px] pl-7 text-sm text-[#7c7c7c] dark:text-[#848585]">
				Search...
			</div>
			<div className="absolute top-1 right-1 bottom-1 m-auto flex items-center justify-center rounded-md bg-(--link-bg) p-1 text-xs text-(--link-text)">
				⌘K
			</div>
		</div>
	)
}
