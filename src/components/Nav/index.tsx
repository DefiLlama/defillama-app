import defillamaPages from '~/public/pages.json'
import { DesktopNav } from './Desktop'
import { MobileNav } from './Mobile'
import { TNavLinks } from './types'

const links: TNavLinks = Object.entries(defillamaPages)
	.filter(([key]) => !['Metrics', 'Tools', 'Hidden'].includes(key))
	.map(([category, pages]) => ({ category, pages }))

export default function Nav() {
	return (
		<>
			<DesktopNav links={links} />
			<MobileNav links={links} />
		</>
	)
}
