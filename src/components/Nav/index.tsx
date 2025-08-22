import defillamaPages from '~/public/pages.json'
import { DesktopNav } from './Desktop'
import { MobileNav } from './Mobile'
import { TNavLinks } from './types'

const otherMainPages = [
	{ name: 'Pricing', route: '/subscription', icon: 'banknote' },
	{ name: 'Custom Dashboards', route: '/pro', icon: 'blocks' }
]
const mainLinks = [{ category: 'Main', pages: defillamaPages['Main'].concat(otherMainPages) }]
const footerLinks = ['More', 'About Us'].map((category) => ({
	category,
	pages: defillamaPages[category]
})) as TNavLinks

export default function Nav() {
	return (
		<>
			<DesktopNav mainLinks={mainLinks} footerLinks={footerLinks} />
			<MobileNav mainLinks={mainLinks} footerLinks={footerLinks} />
		</>
	)
}
