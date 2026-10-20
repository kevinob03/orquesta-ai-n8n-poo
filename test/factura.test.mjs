import assert from 'node:assert/strict'
import test from 'node:test'
import { Factura } from '../src/domain/Factura.js'

const base = { proveedor_id: 'supplier-id', numero: 'F-001', fecha_emision: '2026-10-20', moneda: 'CRC', subtotal: 10000, impuesto: 1300, total: 11300 }

test('acepta una factura con total determinista', () => {
  assert.deepEqual(new Factura(base).validate(), {})
})

test('rechaza un total que no corresponde a subtotal más impuesto', () => {
  const errors = new Factura({ ...base, total: 11299 }).validate()
  assert.equal(errors.total, 'El total debe ser subtotal + impuesto.')
})

test('rechaza una fecha de emisión futura', () => {
  const errors = new Factura({ ...base, fecha_emision: '2999-01-01' }).validate()
  assert.equal(errors.fecha_emision, 'La fecha de emisión no puede ser futura.')
})
