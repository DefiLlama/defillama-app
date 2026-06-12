export const ALL_INVESTORS_PROJECTS = [
	{ id: 'etherfi', name: 'Ether.fi', dashboardId: '73x90j3b28pfhgx', customOnly: false },
	{ id: 'spark', name: 'Spark', dashboardId: '9vn8xp43tdzo6gt', customOnly: false },
	{ id: 'maple', name: 'Maple', dashboardId: 'l5accmh9zooc32q', customOnly: false },
	{ id: 'berachain', name: 'Berachain', dashboardId: 't62luatlj9thwx2', customOnly: true },
	{ id: 'aave', name: 'Aave', dashboardId: 'g3rswlkr9khxa03', customOnly: false },
	{ id: 'sonic', name: 'Sonic', dashboardId: 's0n1cd4shb0ard1', customOnly: true },
	{ id: 'near', name: 'NEAR', dashboardId: 'n34rr3v3nu3d4sh', customOnly: true },
	{ id: 'flare', name: 'Flare', dashboardId: 'fl4r3d4shb0ard1', customOnly: true },
	{ id: 'odyssey-ecosystem', name: 'Odyssey Ecosystem', dashboardId: '0dyss3y3c0sys7m1', customOnly: true },
	{ id: 'thorchain', name: 'THORChain', dashboardId: 'bfqwxro9m0xnc9z', customOnly: false }
] as const

export type InvestorsProject = (typeof ALL_INVESTORS_PROJECTS)[number]
export type InvestorsProjectId = InvestorsProject['id']

const INVESTORS_DOMAIN_PROJECT_IDS = ['spark', 'sonic', 'near'] as const satisfies readonly InvestorsProjectId[]
const INVESTORS_COMING_SOON_PROJECT_IDS = [
	'flare',
	'thorchain',
	'berachain'
] as const satisfies readonly InvestorsProjectId[]
const ENTERPRISE_DOMAIN_PROJECT_IDS = ['odyssey-ecosystem'] as const satisfies readonly InvestorsProjectId[]

type InvestorsSite = {
	hosts: readonly string[]
	projectIds: readonly InvestorsProjectId[]
	landingProjectIds: readonly InvestorsProjectId[]
	defaultProjectId: InvestorsProjectId
	comingSoonProjectIds: readonly InvestorsProjectId[]
}

export const INVESTORS_SITES = {
	investors: {
		hosts: ['investors.defillama.com'],
		projectIds: INVESTORS_DOMAIN_PROJECT_IDS,
		landingProjectIds: INVESTORS_DOMAIN_PROJECT_IDS,
		defaultProjectId: 'spark',
		comingSoonProjectIds: INVESTORS_COMING_SOON_PROJECT_IDS
	},
	enterprise: {
		hosts: ['enterprise.defillama.com'],
		projectIds: ENTERPRISE_DOMAIN_PROJECT_IDS,
		landingProjectIds: [...INVESTORS_DOMAIN_PROJECT_IDS, ...ENTERPRISE_DOMAIN_PROJECT_IDS],
		defaultProjectId: 'odyssey-ecosystem',
		comingSoonProjectIds: []
	}
} as const satisfies Record<string, InvestorsSite>

export type InvestorsSiteId = keyof typeof INVESTORS_SITES

function getActiveInvestorsSiteId(): InvestorsSiteId | null {
	const siteId = process.env.NEXT_PUBLIC_INVESTORS_SITE
	if (siteId && siteId in INVESTORS_SITES) {
		return siteId as InvestorsSiteId
	}

	if (process.env.NEXT_PUBLIC_SUPERLUMINAL_DASHBOARD_ID) {
		return 'investors'
	}

	return null
}

function isInvestorsSiteForcedByEnv(): boolean {
	const siteId = process.env.NEXT_PUBLIC_INVESTORS_SITE
	return !!(siteId && siteId in INVESTORS_SITES)
}

function normalizeHost(host: string | null | undefined): string {
	return (host ?? '').split(':')[0].toLowerCase()
}

export const ACTIVE_INVESTORS_SITE_ID = getActiveInvestorsSiteId()
export const ACTIVE_INVESTORS_SITE = ACTIVE_INVESTORS_SITE_ID ? INVESTORS_SITES[ACTIVE_INVESTORS_SITE_ID] : null
export const INVESTORS_SITE_FORCED_BY_ENV = isInvestorsSiteForcedByEnv()

function getInvestorsProjects(projectIds: readonly InvestorsProjectId[] | undefined): InvestorsProject[] {
	return projectIds
		? projectIds
				.map((projectId) => ALL_INVESTORS_PROJECTS.find((project) => project.id === projectId))
				.filter((project): project is InvestorsProject => !!project)
		: []
}

export const INVESTORS_PROJECTS: InvestorsProject[] = getInvestorsProjects(ACTIVE_INVESTORS_SITE?.projectIds)
export const INVESTORS_LANDING_PROJECTS: InvestorsProject[] = getInvestorsProjects(
	ACTIVE_INVESTORS_SITE?.landingProjectIds ?? ACTIVE_INVESTORS_SITE?.projectIds
)

export const INVESTORS_PROTOCOL_IDS: string[] = INVESTORS_PROJECTS.map((p) => p.id)
export const INVESTORS_LANDING_PROTOCOL_IDS: string[] = INVESTORS_LANDING_PROJECTS.map((p) => p.id)
export const DEFAULT_INVESTORS_PROTOCOL_ID =
	ACTIVE_INVESTORS_SITE?.defaultProjectId ?? INVESTORS_PROJECTS[0]?.id ?? null
export const INVESTORS_COMING_SOON_PROJECTS: InvestorsProject[] = getInvestorsProjects(
	ACTIVE_INVESTORS_SITE?.comingSoonProjectIds
)
export const SHOW_INVESTORS_COMING_SOON_PROJECT = INVESTORS_COMING_SOON_PROJECTS.length > 0

export function isInvestorsEnabled(): boolean {
	return !!ACTIVE_INVESTORS_SITE
}

export function isActiveInvestorsHost(host: string | null | undefined): boolean {
	if (!ACTIVE_INVESTORS_SITE) return false

	if (INVESTORS_SITE_FORCED_BY_ENV) {
		return true
	}

	const hostname = normalizeHost(host)
	if (!hostname) return false

	if (hostname === 'localhost' || hostname === '127.0.0.1') {
		return true
	}

	return ACTIVE_INVESTORS_SITE.hosts.some((allowedHost) => allowedHost === hostname)
}

export function getInvestorsProject(protocol: string): InvestorsProject | undefined {
	return INVESTORS_PROJECTS.find((project) => project.id === protocol)
}

export function getInvestorsLandingProjectHref(projectId: InvestorsProjectId): string {
	if (INVESTORS_PROTOCOL_IDS.includes(projectId)) {
		return `/${projectId}`
	}

	const investorsHost = INVESTORS_SITES.investors.hosts[0]
	const isInvestorsDomainProject = INVESTORS_SITES.investors.projectIds.some(
		(investorsProjectId) => investorsProjectId === projectId
	)

	if (investorsHost && isInvestorsDomainProject) {
		return `https://${investorsHost}/${projectId}`
	}

	return `/${projectId}`
}

export function isInvestorsLandingProjectExternal(projectId: InvestorsProjectId): boolean {
	return getInvestorsLandingProjectHref(projectId).startsWith('https://')
}
