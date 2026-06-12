import { describe, expect, it } from 'vitest'
import { EXCEL_SHEETS_AUTH_ORIGIN, resolveSheetsAuthRedirect } from '../sheetsAuth'

describe('sheets auth helpers', () => {
	it('keeps same-site redirects for internal auth callbacks', () => {
		expect(resolveSheetsAuthRedirect('/sheets/auth/callback')).toBe('/sheets/auth/callback')
	})

	it('allows the published Google Sheets Apps Script callback', () => {
		expect(
			resolveSheetsAuthRedirect(
				'https://script.google.com/macros/d/1QqeBzdso-_WVCAamI1F0uKUhzYGFX9KbG8ufLVJ2AKupWAblK9agpcl4/usercallback'
			)
		).toBe('https://script.google.com/macros/d/1QqeBzdso-_WVCAamI1F0uKUhzYGFX9KbG8ufLVJ2AKupWAblK9agpcl4/usercallback')
	})

	it('blocks unrecognized external redirects', () => {
		expect(resolveSheetsAuthRedirect('https://evil.example/callback')).toBeUndefined()
		expect(
			resolveSheetsAuthRedirect('https://script.google.com/macros/d/attacker-controlled-script/usercallback')
		).toBeUndefined()
	})

	it('uses the first redirect value from repeated query params', () => {
		expect(resolveSheetsAuthRedirect(['/sheets/auth/callback', 'https://evil.example/callback'])).toBe(
			'/sheets/auth/callback'
		)
	})

	it('targets the hosted Excel add-in origin for popup auth', () => {
		expect(EXCEL_SHEETS_AUTH_ORIGIN).toBe('https://excel.llama.fi')
	})
})
