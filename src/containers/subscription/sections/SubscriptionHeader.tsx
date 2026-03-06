import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { ThemeSwitch } from '~/components/Nav/ThemeSwitch'

export function SubscriptionHeader() {
	return (
		<>
			{/* Mobile */}
			<header className="relative z-20 flex h-16 items-center justify-between bg-(--sub-c-fbfbfbcc) px-4 backdrop-blur-[12px] md:hidden dark:bg-(--sub-c-090b0ccc)">
				<BasicLink href="/" aria-label="Back to home" className="flex h-10 w-10 items-center justify-center rounded-full">
					<Icon name="chevron-left" height={28} width={28} />
				</BasicLink>
				<div className="flex items-center gap-4">
					<ThemeSwitch variant="pill" />
					<button
						type="button"
						className="h-10 rounded-lg bg-(--sub-c-1f67d2) px-4 text-[14px] leading-[17px] font-medium text-white"
					>
						Sign-in
					</button>
				</div>
			</header>

			{/* Desktop */}
			<header className="relative z-20 hidden h-12 items-center justify-between bg-(--sub-c-fbfbfbcc) px-[42px] backdrop-blur-[12px] md:flex dark:bg-(--sub-c-090b0ccc)">
				<BasicLink href="/" className="flex items-center gap-2 text-xs text-(--sub-c-090b0c) dark:text-white">
					<Icon name="chevron-left" height={16} width={16} />
					Back
				</BasicLink>
				<div className="flex items-center gap-5">
					<ThemeSwitch variant="pill" size="sm" />
					<button type="button" className="h-8 rounded-lg bg-(--sub-c-1f67d2) px-3 text-xs text-white">
						Sign-in
					</button>
				</div>
			</header>
		</>
	)
}
