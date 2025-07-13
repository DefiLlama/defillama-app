import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, rmSync, readdirSync, statSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const PROJECT_ROOT = join(__dirname, '..')
const TEST_RESULTS_DIR = join(PROJECT_ROOT, 'e2e', 'test-results')

console.log('🧹 Cleaning e2e test results...')

if (existsSync(TEST_RESULTS_DIR)) {
	console.log(`📁 Found test results directory: ${TEST_RESULTS_DIR}`)

	// Count files before deletion
	let fileCount = 0
	const countFiles = (dir) => {
		const items = readdirSync(dir)
		for (const item of items) {
			const fullPath = join(dir, item)
			if (statSync(fullPath).isDirectory()) {
				countFiles(fullPath)
			} else {
				fileCount++
			}
		}
	}

	try {
		countFiles(TEST_RESULTS_DIR)
		console.log(`📊 Found ${fileCount} files to delete`)

		// Delete the entire test-results directory
		rmSync(TEST_RESULTS_DIR, { recursive: true, force: true })
		console.log('✅ Successfully deleted test results directory')
	} catch (error) {
		console.error('❌ Error deleting test results:', error.message)
		process.exit(1)
	}
} else {
	console.log('ℹ️  No test results directory found. Nothing to clean.')
}

console.log('🎉 e2e cleanup complete!')
