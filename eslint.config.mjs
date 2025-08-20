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
			'no-undef': 1,
			'no-unused-vars': 1,
			'react/no-unescaped-entities': 0,
			'@next/next/no-img-element': 0,
			'@typescript-eslint/no-explicit-any': 0,
			'@typescript-eslint/no-unused-vars': 1,
			'prefer-const': 0
		}
	},
	{
		files: ['**/*.ts', '**/*.tsx'],
		languageOptions: {
			parser: typescriptParser
		}
	}
]

export default eslintConfig
