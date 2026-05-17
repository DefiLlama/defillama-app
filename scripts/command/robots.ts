import fs from 'node:fs/promises'
import path from 'node:path'
import type { LogLike } from './logger'

type GenerateRobotsOptions = {
	env?: NodeJS.ProcessEnv
	logger?: LogLike
	repoRoot?: string
}

export async function generateRobots({
	env = process.env,
	logger = console,
	repoRoot = process.cwd()
}: GenerateRobotsOptions = {}): Promise<void> {
	const robotsFilePath = path.join(repoRoot, 'public', 'robots.txt')
	const siteUrl = env.NEXT_PUBLIC_SITE_URL || 'https://defillama.com'
	const normalizedSiteUrl = siteUrl.replace(/\/$/, '')
	const shouldAllowIndexing = env.ROBOTS_ALLOW_INDEXING === 'true'

	const robotsContents = shouldAllowIndexing
		? `User-agent: *
Allow: /

# Sitemap
Sitemap: ${normalizedSiteUrl}/sitemap.xml
`
		: `User-agent: *
Allow: /.well-known/
Disallow: /
`

	await fs.writeFile(robotsFilePath, robotsContents, 'utf8')
	logger.log(
		`[dev:prepare] robots.txt: generated with ${shouldAllowIndexing ? 'indexing allowed' : 'indexing blocked'} ` +
			`(ROBOTS_ALLOW_INDEXING=${env.ROBOTS_ALLOW_INDEXING ?? 'unset'})`
	)
}
