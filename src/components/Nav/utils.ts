import { navLinks } from './Links'

//function to check pathname against the navLinks
export const isActiveCategory = (pathname: string, category: string) => {
	const config = navLinks[category]
	if (!config) return false

	const matchesMain = config.main.some(
		(link) => pathname === link.path || pathname.startsWith(`${link.path}/`) || pathname.startsWith(`${link.path}?`)
	)

	if (config.main.length === 0) {
		const categoryPath = `/${category.toLowerCase()}`
		return pathname.startsWith(categoryPath)
	}

	return matchesMain
}
