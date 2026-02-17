import fs from 'fs'
import path from 'path'

const robotsFilePath = path.join('public', 'robots.txt')
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://defillama.com'
const normalizedSiteUrl = siteUrl.replace(/\/$/, '')

const shouldAllowIndexing = process.env.ROBOTS_ALLOW_INDEXING === 'true'

const robotsContents = shouldAllowIndexing
	? `User-agent: *
Allow: /

# Sitemap
Sitemap: ${normalizedSiteUrl}/sitemap.xml
`
	: `User-agent: *
Disallow: /
`

fs.writeFileSync(robotsFilePath, robotsContents, 'utf8')

console.log(
	`robots.txt generated (${shouldAllowIndexing ? 'indexing allowed' : 'indexing blocked'}). ` +
		`ROBOTS_ALLOW_INDEXING=${process.env.ROBOTS_ALLOW_INDEXING ?? 'unset'}`
)
