export type TNavLink = {
	name: string
	route: string
	icon?: string | undefined
	attention?: boolean | undefined
	freeTrial?: boolean | undefined
	isNew?: boolean | undefined
	/** Only for external links - internal pages are auto-tracked by Umami */
	umamiEvent?: string | undefined
}

export type TNavLinks = Array<{ category: string; pages: Array<TNavLink> }>

export type TOldNavLink = {
	name: string
	route?: string | undefined
	pages?: Array<{ name: string; route: string }> | undefined
}
