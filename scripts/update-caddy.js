#!/usr/bin/env node

import { exec } from 'child_process'
import { readFile, writeFile } from 'fs/promises'

/**
 * Switches the port that Caddy is reverse-proxying for a given domain.
 * @param {number} targetPort
 * @param {string} domain
 */
async function updateCaddy(targetPort, domain) {
	const filePath = '/etc/caddy/Caddyfile'

	try {
		// Read the existing Caddyfile
		let data = await readFile(filePath, 'utf8')

		// Use a regular expression to find the right block and update the port
		const regex = new RegExp(`(${domain} \\{[\\s\\S]*?reverse_proxy :)\\d+(\\s*\\})`)
		data = data.replace(regex, `$1${targetPort}$2`)

		// Write the updated content back to the file
		await writeFile(filePath, data)

		console.log(`Caddyfile updated for ${domain} with port ${targetPort}`)

		exec('caddy reload', (error, _, stderr) => {
			if (error) {
				console.error(`Error reloading Caddy: ${error}`)
				return
			}
			if (stderr) {
				console.error(`Error reloading Caddy: ${stderr}`)
				return
			}
			console.log(`Caddy reloaded.`)
		})
	} catch (error) {
		console.error('Error updating Caddyfile:', error)
	}
}

const args = process.argv.slice(2)
console.log('update-caddy.js', args)
if (args.length !== 2) {
	console.error('Usage: node update-caddy.js <port> <domain>')
	process.exit(1)
}

const [targetPort, domain] = args
updateCaddy(targetPort, domain)
