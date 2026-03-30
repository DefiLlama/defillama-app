import { Icon } from '~/components/Icon'

interface UserHeaderProps {
	displayName: string
	onLogout: () => void
}

export function UserHeader({ displayName, onLogout }: UserHeaderProps) {
	return (
		<div className="flex items-center justify-between">
			<div className="flex items-center gap-4">
				<img src="/assets/account_avatar.png" alt="" className="h-12 w-12 shrink-0 rounded-full" />
				<span className="text-sm font-medium text-(--sub-ink-primary) dark:text-white">{displayName}</span>
			</div>
			<button
				onClick={onLogout}
				className="flex h-8 items-center justify-center gap-1 rounded-lg border border-(--sub-border-muted) px-3 text-xs leading-4 font-medium text-(--error) dark:border-(--sub-border-strong)"
			>
				<Icon name="sign-out" height={16} width={16} />
				<span>Sign Out</span>
			</button>
		</div>
	)
}
