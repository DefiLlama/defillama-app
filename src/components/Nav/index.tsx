import defillamaPages from '~/public/pages.json'
import { DesktopNav } from './Desktop'
import { MobileNav } from './Mobile'
import { TNavLinks } from './types'

const otherMainPages = [
	{ name: 'Pricing', route: '/subscription', icon: 'banknote' },
	{ name: 'Custom Dashboards', route: '/pro', icon: 'blocks' }
]

const links = ['Main', 'More', 'About Us'].map((category) => ({
	category,
	pages: defillamaPages[category].concat(category === 'Main' ? otherMainPages : [])
})) as TNavLinks

export default function Nav() {
	return (
		<>
			<DesktopNav links={links} />
			<MobileNav links={links} />
		</>
	)
}
