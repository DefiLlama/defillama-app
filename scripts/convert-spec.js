#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const docsDir = path.join(__dirname, '..', 'src', 'docs')

function convertYamlToJson(yamlFile, jsonFile) {
	try {
		console.log(`Converting ${yamlFile} to ${jsonFile}...`)

		// Read the YAML file
		const yamlContent = fs.readFileSync(yamlFile, 'utf8')

		// Parse YAML to JavaScript object
		const data = yaml.load(yamlContent)

		// Convert to JSON with proper formatting
		const jsonContent = JSON.stringify(data, null, '\t')

		// Write to JSON file
		fs.writeFileSync(jsonFile, jsonContent, 'utf8')

		console.log(`✅ Successfully converted ${yamlFile} to ${jsonFile}`)
	} catch (error) {
		console.error(`❌ Error converting ${yamlFile}:`, error.message)
		process.exit(1)
	}
}

// Convert main spec files
convertYamlToJson(path.join(docsDir, 'spec.yaml'), path.join(docsDir, 'resolvedSpec.json'))

convertYamlToJson(path.join(docsDir, 'proSpec.yaml'), path.join(docsDir, 'proSpec.json'))

console.log('🎉 All spec files converted successfully!')
