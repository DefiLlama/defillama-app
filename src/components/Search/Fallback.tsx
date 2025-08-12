import { Icon } from '../Icon'

export const SearchFallback = () => {
	return (
		<div className="relative isolate w-full max-w-[50vw] cursor-not-allowed">
			<div className="absolute top-[8px] left-[8px] opacity-50">
				<div className="sr-only">Open Search</div>
				<Icon name="search" height={14} width={14} />
			</div>
			<div className="w-full text-sm rounded-md border border-(--cards-border) text-[#7c7c7c] dark:text-[#848585] bg-(--app-bg) py-[5px] px-[10px] pl-7">
				Search...
			</div>
			<div className="rounded-md text-xs text-(--link-text) bg-(--link-bg) p-1 absolute top-1 right-1 bottom-1 m-auto flex items-center justify-center">
				⌘K
			</div>
		</div>
	)
}
