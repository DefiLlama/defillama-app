import React, { useState, useEffect } from 'react'
import { CustomColumnModal } from './CustomColumnModal'

export interface CustomColumnDef {
  name: string
  formula: string
  formatType: 'auto' | 'number' | 'usd' | 'percent' | 'string' | 'boolean'
}

const STORAGE_KEY = 'customColumnsV1'

function loadCustomColumns(): CustomColumnDef[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveCustomColumns(cols: CustomColumnDef[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cols))
}

export function CustomColumnsManager({ sampleRow, customColumns, setCustomColumns, onClose, editIndex: editIndexProp }: { sampleRow: any, customColumns: CustomColumnDef[], setCustomColumns: (cols: CustomColumnDef[]) => void, onClose?: () => void, editIndex?: number | null }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)

  useEffect(() => {
    if (typeof editIndexProp === 'number') {
      setEditIndex(editIndexProp)
      setModalOpen(true)
    }
  }, [editIndexProp])

  const handleAdd = () => {
    setEditIndex(null)
    setModalOpen(true)
  }

  const handleEdit = (idx: number) => {
    setEditIndex(idx)
    setModalOpen(true)
  }

  const handleDelete = (idx: number) => {
    const next = customColumns.filter((_, i) => i !== idx)
    setCustomColumns(next)
  }

  const handleSave = (def: CustomColumnDef) => {
    let next: CustomColumnDef[]
    if (editIndex === null) {
      next = [...customColumns, def]
    } else {
      next = customColumns.map((col, i) => (i === editIndex ? def : col))
    }
    setCustomColumns(next)
    setModalOpen(false)
  }

  const handleClose = () => {
    setModalOpen(false)
    if (onClose) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative bg-[#1a1b1f] border border-[#39393E] rounded-xl p-6 shadow-xl max-w-md w-full">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-[#39393E]/30 text-[#8a8c90] hover:text-white transition-colors"
          aria-label="Close modal"
        >
          ×
        </button>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Custom Columns</h3>
          <button className="px-3 py-1 rounded bg-blue-600 text-white" onClick={handleAdd}>Add Column</button>
        </div>
        {customColumns.length === 0 ? (
          <div className="text-gray-500 text-sm">No custom columns yet.</div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {customColumns.map((col, idx) => (
              <li key={idx} className="py-2 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-white">{col.name}</span>
                  <span className="ml-2 text-xs text-gray-500">{col.formula}</span>
                  <span className="ml-2 text-xs text-gray-400">[{col.formatType}]</span>
                </div>
                <div className="flex gap-2">
                  <button className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded" onClick={() => handleEdit(idx)}>Edit</button>
                  <button className="px-2 py-1 text-xs bg-red-500 text-white rounded" onClick={() => handleDelete(idx)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {modalOpen && (
          <CustomColumnModal
            open={modalOpen}
            onClose={handleClose}
            onSave={handleSave}
            sampleRow={sampleRow}
            {...(editIndex !== null ? customColumns[editIndex] : {})}
          />
        )}
      </div>
    </div>
  )
} 