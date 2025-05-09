import { Parser } from 'expr-eval'
import type { IProtocol } from './types'

export function evaluateFormula(formula: string, row: IProtocol): { value: number | string, error?: string } {
  try {
    const parser = new Parser()
    const context = flattenObject(row)
    const value = parser.evaluate(formula, context)
    return { value }
  } catch (e: any) {
    if (typeof e.message === 'string' && /undefined variable/i.test(e.message)) {
      return { value: '' }
    }
    return { value: 'Err', error: e.message }
  }
}

function flattenObject(obj: any, prefix = '', res: any = {}) {
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue
    const value = obj[key]
    const newKey = prefix ? `${prefix}_${key}` : key
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      flattenObject(value, newKey, res)
    } else {
      res[newKey] = value
    }
  }
  return res
} 
