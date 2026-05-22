import { describe, expect, it } from 'vitest'
import { parseMessageToRenderModel } from '~/containers/LlamaAI/renderModel'
import type { AlertProposedData, Message } from '~/containers/LlamaAI/types'
import { buildRestoredAlerts } from '../restoredAlerts'

const alertIntent = {
	frequency: 'daily' as const,
	hour: 9,
	timezone: 'UTC'
}

function restoredAlertId(result: AlertProposedData[] | undefined) {
	return result?.[0]?.alertId
}

describe('buildRestoredAlerts', () => {
	it('uses the inline alert marker id for historical unsaved alerts', () => {
		const alerts = buildRestoredAlerts({
			content: 'I can schedule that.\n\n[ALERT:aave_daily]',
			messageId: 'message-1',
			metadata: { alertIntent }
		})

		expect(restoredAlertId(alerts)).toBe('aave_daily')
	})

	it('falls back to saveable alert ids when content has no marker', () => {
		const alerts = buildRestoredAlerts({
			content: 'I can schedule that.',
			messageId: 'message-1',
			metadata: { alertIntent, saveableAlertIds: ['x_abc'] }
		})

		expect(restoredAlertId(alerts)).toBe('x_abc')
	})

	it('preserves telegram delivery from persisted metadata', () => {
		const alerts = buildRestoredAlerts({
			content: '[ALERT:telegram_alert]',
			messageId: 'message-1',
			metadata: { alertIntent: { ...alertIntent, deliveryChannel: 'telegram' } }
		})

		expect(alerts?.[0]?.alertIntent.deliveryChannel).toBe('telegram')
	})

	it('keeps legacy fallback behavior when no marker or alert id exists', () => {
		const alerts = buildRestoredAlerts({
			content: 'I can schedule that.',
			messageId: 'message-1',
			metadata: { alertIntent }
		})

		expect(restoredAlertId(alerts)).toBe('restored_message-1')
	})
})

describe('restored alert render model', () => {
	it('renders a saved restored alert inline when the marker and saved id match', () => {
		const alerts = buildRestoredAlerts({
			content: 'Done.\n\n[ALERT:foo]',
			messageId: 'message-1',
			metadata: { alertIntent },
			savedAlertIds: ['foo']
		})
		const message: Message = {
			role: 'assistant',
			id: 'message-1',
			content: 'Done.\n\n[ALERT:foo]',
			alerts,
			savedAlertIds: ['foo']
		}

		const model = parseMessageToRenderModel(message)

		expect(model.blocks).toHaveLength(2)
		expect(model.blocks[0]).toMatchObject({ type: 'markdown' })
		expect(model.blocks[1]).toMatchObject({ type: 'alert', artifactId: 'foo' })
		expect(model.artifactsById.get('foo')).toMatchObject({ type: 'alert', savedAlertIds: ['foo'] })
	})

	it('keeps alert-like action buttons as prompt actions', () => {
		const model = parseMessageToRenderModel({
			role: 'assistant',
			content: '[ACTION:Alert me daily|Alert me daily about ETH fees]'
		})

		expect(model.blocks).toEqual([
			{
				type: 'action-group',
				key: 'actions-0',
				actions: [{ label: 'Alert me daily', message: 'Alert me daily about ETH fees' }]
			}
		])
	})
})
