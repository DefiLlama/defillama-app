import { ButtonLink } from '~/components/Link'

const tabs = [
	{ id: 'overview', name: 'Overview', route: '/rwa' },
	{ id: 'chains', name: 'Chains', route: '/rwa/chains' },
	{ id: 'platforms', name: 'Platforms', route: '/rwa/platforms' },
	{ id: 'assetGroups', name: 'Asset Groups', route: '/rwa/asset-groups' },
	{ id: 'categories', name: 'Categories', route: '/rwa/categories' },
	{ id: 'issuers', name: 'Issuers', route: '/rwa/issuers' }
] as const

export type RWATab = (typeof tabs)[number]['id']

export function RWATabNav({ active }: { active: RWATab }) {
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
