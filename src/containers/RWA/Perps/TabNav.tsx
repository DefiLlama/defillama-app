import { ButtonLink } from '~/components/Link'

const tabs = [
	{ id: 'overview', name: 'Overview', route: '/rwa/perps' },
	{ id: 'venues', name: 'Venues', route: '/rwa/perps/venues' },
	{ id: 'assetGroups', name: 'Asset Groups', route: '/rwa/perps/asset-groups' }
] as const

export type RWAPerpsTab = (typeof tabs)[number]['id']

export function RWAPerpsTabNav({ active }: { active: RWAPerpsTab }) {
	return (
		<nav className="flex w-full overflow-x-auto text-xs font-medium">
			{tabs.map((tab) => (
				<ButtonLink
					key={tab.id}
					href={tab.route}
					data-active={tab.id === active}
					className="shrink-0 border-b-2 border-(--form-control-border) px-4 py-1 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--primary)"
				>
					{tab.name}
				</ButtonLink>
			))}
		</nav>
	)
}
