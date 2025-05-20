import { forwardRef } from 'react'
import { defaultToolsAndFooterLinks, linksWithNoSubMenu, navLinks } from '../Links'
import { isActiveCategory } from '../utils'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { NewTag } from '../NewTag'
import { BasicLink } from '~/components/Link'

export const SubMenu = forwardRef<HTMLDetailsElement, { name: string }>(function Menu({ name }, ref) {
	const { pathname } = useRouter()

	const noSubMenu = linksWithNoSubMenu.find((x) => x.name === name)

	const active = isActive({ category: name, pathname })

	if (noSubMenu || (name === 'Yields' && !active)) {
		return (
			<BasicLink
				href={noSubMenu?.url ?? '/yields'}
				data-linkactive={(noSubMenu?.url ?? '/yields') === pathname}
				target={noSubMenu?.external && '_blank'}
				className="group -ml-[6px] font-semibold rounded-md flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/10 focus-visible:bg-black/5 dark:focus-visible:bg-white/10 data-[linkactive=true]:bg-[var(--link-active-bg)] data-[linkactive=true]:text-white p-[6px]"
			>
				<span className="group-hover:animate-wiggle">{navLinks[name].icon}</span>
				<span>{name}</span>
				{navLinks[name].newTag === true ? <NewTag /> : null}
			</BasicLink>
		)
	}

	return (
		<details ref={ref} open={active ? true : false} className="group">
			<summary className="group/summary -ml-[6px] font-semibold rounded-md flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/10 focus-visible:bg-black/5 dark:focus-visible:bg-white/10 p-[6px]">
				<span className="group-hover/summary:animate-wiggle group-focus-visible/summary:animate-wiggle">
					{navLinks[name].icon}
				</span>
				<span>{name}</span>
				{navLinks[name].newTag === true ? <NewTag /> : null}
				<Icon
					name="chevron-right"
					height={16}
					width={16}
					className="ml-auto group-open:rotate-90 transition-transform duration-100 relative -right-1"
				/>
			</summary>

			<span className="my-4 flex flex-col gap-4">
				{navLinks[name].main.map((subLink) => (
					<BasicLink
						href={subLink.path}
						key={subLink.path}
						data-linkactive={subLink.path === pathname}
						className="-my-[6px] pl-7 rounded-md flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/10 focus-visible:bg-black/5 dark:focus-visible:bg-white/10 data-[linkactive=true]:bg-[var(--link-active-bg)] data-[linkactive=true]:text-white p-[6px]"
					>
						<span>{subLink.name}</span>
						{subLink.newTag === true ? <NewTag /> : null}
					</BasicLink>
				))}
			</span>
		</details>
	)
})

const isActive = ({ pathname, category }: { pathname: string; category: string }) => {
	if (category === 'DeFi') {
		return (
			!isDefaultLink(pathname) &&
			!Object.keys(navLinks)
				.filter((cat) => cat !== 'DeFi')
				.some((cat) => isActiveCategory(pathname, cat))
		)
	}
	return isActiveCategory(pathname, category)
}

const isDefaultLink = (pathname) =>
	[...defaultToolsAndFooterLinks.tools, ...defaultToolsAndFooterLinks.footer].map((x) => x.path).includes(pathname)
