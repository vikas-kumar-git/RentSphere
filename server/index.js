import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { MongoClient, ServerApiVersion } from 'mongodb'

const app = express()
const port = Number(process.env.PORT || 4000)
const mongoUri = process.env.MONGODB_URI
const databaseName = process.env.MONGODB_DB_NAME || 'tenant_rent_mvp'
const collectionName = process.env.MONGODB_COLLECTION_NAME || 'records'
const clientOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const developmentOriginPatterns = [
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
  /^http:\/\/0\.0\.0\.0:\d+$/,
]

if (!mongoUri) {
  throw new Error('Missing MONGODB_URI. Add it to your .env file before starting the API server.')
}

const client = new MongoClient(mongoUri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

let collectionPromise

function createHttpError(message, statusCode) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function getCorsOrigin(origin, callback) {
  const isConfiguredOrigin = clientOrigins.includes(origin)
  const isDevelopmentOrigin =
    process.env.NODE_ENV !== 'production' &&
    typeof origin === 'string' &&
    developmentOriginPatterns.some((pattern) => pattern.test(origin))

  if (!origin || clientOrigins.length === 0 || isConfiguredOrigin || isDevelopmentOrigin) {
    callback(null, true)
    return
  }

  callback(createHttpError('Request origin is not allowed by CORS.', 403))
}

function assertString(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw createHttpError(`${fieldName} is required.`, 400)
  }

  return value.trim()
}

function assertNumber(value, fieldName) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw createHttpError(`${fieldName} must be a valid number.`, 400)
  }

  return value
}

function sanitizeRecordPayload(payload, recordId) {
  if (!payload || typeof payload !== 'object') {
    throw createHttpError('Record payload is required.', 400)
  }

  if (payload.id && String(payload.id) !== recordId) {
    throw createHttpError('Record id does not match the request URL.', 400)
  }

  const status = assertString(payload.status, 'status')

  if (!['Paid', 'Partial', 'Unpaid'].includes(status)) {
    throw createHttpError('status must be Paid, Partial, or Unpaid.', 400)
  }

  return {
    _id: recordId,
    tenantName: assertString(payload.tenantName, 'tenantName'),
    roomNo: assertString(payload.roomNo, 'roomNo'),
    month: assertString(payload.month, 'month'),
    fromDate: assertString(payload.fromDate, 'fromDate'),
    toDate: assertString(payload.toDate, 'toDate'),
    meterFrom: assertNumber(payload.meterFrom, 'meterFrom'),
    meterTo: assertNumber(payload.meterTo, 'meterTo'),
    units: assertNumber(payload.units, 'units'),
    bill: assertNumber(payload.bill, 'bill'),
    rent: assertNumber(payload.rent, 'rent'),
    total: assertNumber(payload.total, 'total'),
    paid: assertNumber(payload.paid, 'paid'),
    due: assertNumber(payload.due, 'due'),
    status,
  }
}

function toTenantRecord(document) {
  return {
    id: String(document._id),
    tenantName: document.tenantName,
    roomNo: document.roomNo,
    month: document.month,
    fromDate: document.fromDate,
    toDate: document.toDate,
    meterFrom: document.meterFrom,
    meterTo: document.meterTo,
    units: document.units,
    bill: document.bill,
    rent: document.rent,
    total: document.total,
    paid: document.paid,
    due: document.due,
    status: document.status,
  }
}

async function getCollection() {
  if (!collectionPromise) {
    collectionPromise = client.connect().then(async (connectedClient) => {
      const collection = connectedClient.db(databaseName).collection(collectionName)
      await collection.createIndex({ month: -1, tenantName: 1 })
      return collection
    })
  }

  return collectionPromise
}

function asyncHandler(handler) {
  return async (request, response, next) => {
    try {
      await handler(request, response)
    } catch (error) {
      next(error)
    }
  }
}

app.use(
  cors({
    origin: getCorsOrigin,
  }),
)
app.use(express.json({ limit: '1mb' }))

app.get(
  '/api/health',
  asyncHandler(async (_request, response) => {
    const collection = await getCollection()
    await collection.db.admin().ping()
    response.json({ ok: true, database: databaseName, collection: collectionName })
  }),
)

app.get(
  '/api/records',
  asyncHandler(async (_request, response) => {
    const collection = await getCollection()
    const records = await collection.find({}).sort({ month: -1, tenantName: 1 }).toArray()
    response.json(records.map(toTenantRecord))
  }),
)

app.put(
  '/api/records/:id',
  asyncHandler(async (request, response) => {
    const recordId = String(request.params.id)
    const collection = await getCollection()
    const document = sanitizeRecordPayload(request.body, recordId)

    await collection.replaceOne({ _id: recordId }, document, { upsert: true })

    response.json(toTenantRecord(document))
  }),
)

app.delete(
  '/api/records/:id',
  asyncHandler(async (request, response) => {
    const collection = await getCollection()
    await collection.deleteOne({ _id: String(request.params.id) })
    response.status(204).send()
  }),
)

app.delete(
  '/api/records',
  asyncHandler(async (_request, response) => {
    const collection = await getCollection()
    await collection.deleteMany({})
    response.status(204).send()
  }),
)

app.use((error, _request, response, _next) => {
  console.error(error)
  const statusCode =
    error && typeof error === 'object' && 'statusCode' in error && typeof error.statusCode === 'number'
      ? error.statusCode
      : 500

  response.status(statusCode).json({
    error: error instanceof Error ? error.message : 'Unexpected server error.',
  })
})

const server = app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`)
})

async function shutdown() {
  await client.close()

  server.close(() => {
    process.exit(0)
  })
}

process.on('SIGINT', () => {
  void shutdown()
})

process.on('SIGTERM', () => {
  void shutdown()
})
