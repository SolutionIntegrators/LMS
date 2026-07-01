// Pushes a sale into the standalone "SI Digital Product Hub" Airtable base.
// Best-effort: any failure here must NOT break access granting (Supabase is source of truth).

const AIRTABLE_API = 'https://api.airtable.com/v0'
const BASE_ID = 'appDiqNZWv2YPRYTE'
const T_CUSTOMERS = 'tblfUkvC9OEM6HhMx'
const T_PRODUCTS = 'tblaL2e7RG0W18oJU'
const T_SALES = 'tblUqIR6quCX2s6E0'

type Json = Record<string, unknown>

function token() {
  return process.env.AIRTABLE_TOKEN
}

async function at(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${AIRTABLE_API}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) throw new Error(`Airtable ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return res.json()
}

// Escape a value for use inside an Airtable filterByFormula string literal.
function esc(v: string) {
  return v.replace(/'/g, "\\'")
}

async function findRecord(table: string, formula: string): Promise<string | null> {
  const qs = new URLSearchParams({ filterByFormula: formula, maxRecords: '1' })
  const data = await at(`${BASE_ID}/${table}?${qs.toString()}`)
  return data.records?.[0]?.id ?? null
}

async function createRecord(table: string, fields: Json): Promise<string> {
  const data = await at(`${BASE_ID}/${table}`, {
    method: 'POST',
    body: JSON.stringify({ fields, typecast: true }),
  })
  return data.id
}

export interface SaleInput {
  email: string
  fullName?: string | null
  productName: string
  thrivecartId?: string | null
  lmsSlug?: string | null
  amount?: number | null
  source: 'ThriveCart' | 'Zapier' | 'Manual' | 'LMS'
  transactionRef?: string | null
}

export async function pushSaleToAirtable(input: SaleInput): Promise<void> {
  if (!token()) return // not configured — skip silently
  try {
    const email = input.email.trim()
    const today = new Date().toISOString().slice(0, 10)

    // Customer (find by email, else create)
    let customerId = await findRecord(T_CUSTOMERS, `LOWER({Email})='${esc(email.toLowerCase())}'`)
    if (!customerId) {
      customerId = await createRecord(T_CUSTOMERS, {
        Name: input.fullName?.trim() || email,
        Email: email,
        'First Purchase Date': today,
        Origin: input.source,
      })
    }

    // Product (find by ThriveCart ID, else by name, else create)
    let productId: string | null = null
    if (input.thrivecartId) {
      productId = await findRecord(T_PRODUCTS, `{ThriveCart ID}='${esc(String(input.thrivecartId))}'`)
    }
    if (!productId) {
      productId = await findRecord(T_PRODUCTS, `{Product Name}='${esc(input.productName)}'`)
    }
    if (!productId) {
      const fields: Json = { 'Product Name': input.productName, Active: true }
      if (input.thrivecartId) fields['ThriveCart ID'] = String(input.thrivecartId)
      if (input.lmsSlug) fields['LMS Slug'] = input.lmsSlug
      productId = await createRecord(T_PRODUCTS, fields)
    }

    // Sale
    const saleFields: Json = {
      'Sale ID': `${email} - ${input.productName}`,
      'Purchase Date': today,
      Source: input.source,
      'Buyer Email': email,
      Customer: [customerId],
      Product: [productId],
    }
    if (input.amount != null && !Number.isNaN(input.amount)) saleFields['Amount'] = input.amount
    if (input.transactionRef) saleFields['Transaction Ref'] = input.transactionRef

    await createRecord(T_SALES, saleFields)
  } catch (err) {
    // Never throw — log and move on so purchase processing still succeeds.
    console.error('pushSaleToAirtable failed:', err instanceof Error ? err.message : err)
  }
}
