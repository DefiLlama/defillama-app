import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'
import typescriptParser from '@typescript-eslint/parser'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
	baseDirectory: __dirname
})

const eslintConfig = [
	...compat.extends('next/core-web-vitals', 'next/typescript', 'prettier'),
	{
		ignores: ['node_modules/**', '.next/**', 'out/**', 'build/**', 'next-env.d.ts']
	},
	{
		rules: {
			'react/no-unescaped-entities': 0,
			'@next/next/no-img-element': 0,
			'@typescript-eslint/no-explicit-any': 0,
			'prefer-const': 0
		}
	},
	{
		files: ['**/*.js', '**/*.jsx'],
		rules: {
			'no-undef': 1,
			'no-unused-vars': 1
		}
	},
	{
		files: ['**/*.ts', '**/*.tsx'],
		languageOptions: {
			parser: typescriptParser
		},
		rules: {
			'no-undef': 0, // TypeScript handles this
			'no-unused-vars': 0, // Disable base rule for TypeScript files
			'@typescript-eslint/no-unused-vars': 1 // Use TypeScript-specific rule instead
		}
	}
]

export default eslintConfig
