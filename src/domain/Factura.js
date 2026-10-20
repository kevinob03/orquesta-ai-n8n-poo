/** @typedef {{ id?: string, proveedor_id: string, numero: string, fecha_emision: string, moneda: string, subtotal: number, impuesto: number, total: number, estado?: string, created_at?: string }} FacturaData */

export class Factura {
  /** @param {FacturaData} values */
  constructor(values) {
    this.proveedor_id = values.proveedor_id?.trim()
    this.numero = values.numero?.trim()
    this.fecha_emision = values.fecha_emision
    this.moneda = values.moneda || 'CRC'
    this.subtotal = Number(values.subtotal)
    this.impuesto = Number(values.impuesto)
    this.total = Number(values.total)
  }

  validate() {
    const errors = {}
    if (!this.proveedor_id) errors.proveedor_id = 'Selecciona un proveedor.'
    if (!this.numero) errors.numero = 'El número de factura es obligatorio.'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(this.fecha_emision || '')) {
      errors.fecha_emision = 'Indica una fecha válida.'
    } else {
      const now = new Date()
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      if (this.fecha_emision > today) errors.fecha_emision = 'La fecha de emisión no puede ser futura.'
    }
    if (!['CRC', 'USD'].includes(this.moneda)) errors.moneda = 'Moneda no permitida.'
    for (const field of ['subtotal', 'impuesto', 'total']) {
      if (!Number.isFinite(this[field]) || this[field] < 0) errors[field] = 'Indica un monto igual o mayor a cero.'
    }
    if (!errors.total && Math.abs(this.total - (this.subtotal + this.impuesto)) > 0.01) {
      errors.total = 'El total debe ser subtotal + impuesto.'
    }
    return errors
  }

  toInsert() {
    return { proveedor_id: this.proveedor_id, numero: this.numero, fecha_emision: this.fecha_emision, moneda: this.moneda, subtotal: this.subtotal, impuesto: this.impuesto, total: this.total }
  }
}
