export type TNavLink = { name: string; route: string; icon?: string }

export type TNavLinks = Array<{ category: string; pages: Array<TNavLink> }>
