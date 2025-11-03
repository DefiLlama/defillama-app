export type TNavLink = { name: string; route: string; icon?: string; attention?: boolean }

export type TNavLinks = Array<{ category: string; pages: Array<TNavLink> }>

export type TOldNavLink = {
	name: string
	route?: string
	pages?: Array<{ name: string; route: string }>
}
