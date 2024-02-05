const { execSync } = require('child_process')
const commitHash = execSync('git rev-parse --short HEAD').toString().trim()

module.exports = {
	apps: [
		{
			script: 'server.js',
			instances: 16,
			name: 'dla-' + commitHash,
			exec_mode: 'cluster'
		}
	]
}
