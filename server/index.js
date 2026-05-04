import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { MongoClient, ServerApiVersion } from 'mongodb'

const app = express()
const apiRouter = express.Router()
const port = Number(process.env.PORT || 4000)
const mongoUri = process.env.MONGODB_URI
const databaseName = process.env.MONGODB_DB_NAME || 'tenant_rent_mvp'
const collectionName = process.env.MONGODB_COLLECTION_NAME || 'records'
const roomsCollectionName = process.env.MONGODB_ROOMS_COLLECTION_NAME || 'rooms'
const vercelOrigins = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
  .filter(Boolean)
  .map((url) => `https://${url}`)
const clientOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
  .concat(vercelOrigins)
const developmentOriginPatterns = [
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
  /^http:\/\/0\.0\.0\.0:\d+$/,
]
const vercelOriginPatterns = [/^https:\/\/[a-z0-9-]+\.vercel\.app$/i]

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
let roomsCollectionPromise

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
  const isVercelOrigin =
    process.env.VERCEL === '1' &&
    typeof origin === 'string' &&
    vercelOriginPatterns.some((pattern) => pattern.test(origin))

  if (!origin || clientOrigins.length === 0 || isConfiguredOrigin || isDevelopmentOrigin || isVercelOrigin) {
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

function optionalString(value) {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmedValue = value.trim()
  return trimmedValue || undefined
}

function sanitizeRecordPayload(payload, recordId) {
  if (!payload || typeof payload !== 'object') {
    throw createHttpError('Record payload is required.', 400)
  }

  if (payload.id && String(payload.id) !== recordId) {
    throw createHttpError('Record id does not match the request URL.', 400)
  }

  const status = assertString(payload.status, 'status')

  if (!['Paid', 'Partial', 'Unpaid', 'Advance'].includes(status)) {
    throw createHttpError('status must be Paid, Partial, Unpaid, or Advance.', 400)
  }

  return {
    _id: recordId,
    roomId: optionalString(payload.roomId),
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
    roomId: document.roomId,
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

function sanitizeRoomPayload(payload, roomId) {
  if (!payload || typeof payload !== 'object') {
    throw createHttpError('Room payload is required.', 400)
  }

  if (payload.id && String(payload.id) !== roomId) {
    throw createHttpError('Room id does not match the request URL.', 400)
  }

  return {
    _id: roomId,
    roomNo: assertString(payload.roomNo, 'roomNo'),
    tenantName: assertString(payload.tenantName, 'tenantName'),
  }
}

function toRoom(document) {
  return {
    id: String(document._id),
    roomNo: document.roomNo,
    tenantName: document.tenantName,
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

async function getRoomsCollection() {
  if (!roomsCollectionPromise) {
    roomsCollectionPromise = client.connect().then(async (connectedClient) => {
      const collection = connectedClient.db(databaseName).collection(roomsCollectionName)
      await collection.createIndex({ roomNo: 1 }, { unique: true })
      return collection
    })
  }

  return roomsCollectionPromise
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

async function upsertRecord(payload, recordId) {
  const collection = await getCollection()
  const document = sanitizeRecordPayload(payload, recordId)

  await collection.replaceOne({ _id: recordId }, document, { upsert: true })

  return toTenantRecord(document)
}

async function upsertRoom(payload, roomId) {
  const collection = await getRoomsCollection()
  const document = sanitizeRoomPayload(payload, roomId)

  await collection.replaceOne({ _id: roomId }, document, { upsert: true })

  return toRoom(document)
}

app.use(
  cors({
    origin: getCorsOrigin,
  }),
)
app.use(express.json({ limit: '1mb' }))

apiRouter.get(
  '/health',
  asyncHandler(async (_request, response) => {
    const collection = await getCollection()
    await collection.db.admin().ping()
    response.json({ ok: true, database: databaseName, collection: collectionName })
  }),
)

apiRouter.get(
  '/rooms',
  asyncHandler(async (_request, response) => {
    const collection = await getRoomsCollection()
    const rooms = await collection.find({}).sort({ roomNo: 1 }).toArray()
    response.json(rooms.map(toRoom))
  }),
)

apiRouter.post(
  '/rooms',
  asyncHandler(async (request, response) => {
    const roomId = assertString(request.body?.id, 'id')
    const room = await upsertRoom(request.body, roomId)

    response.json(room)
  }),
)

apiRouter.put(
  '/rooms/:id',
  asyncHandler(async (request, response) => {
    const roomId = String(request.params.id)
    const room = await upsertRoom(request.body, roomId)

    response.json(room)
  }),
)

apiRouter.post(
  '/rooms/delete',
  asyncHandler(async (request, response) => {
    const roomId = assertString(request.body?.id, 'id')
    const collection = await getRoomsCollection()
    await collection.deleteOne({ _id: roomId })
    response.status(204).send()
  }),
)

apiRouter.get(
  '/records',
  asyncHandler(async (_request, response) => {
    const collection = await getCollection()
    const records = await collection.find({}).sort({ month: -1, tenantName: 1 }).toArray()
    response.json(records.map(toTenantRecord))
  }),
)

apiRouter.post(
  '/records',
  asyncHandler(async (request, response) => {
    const recordId = assertString(request.body?.id, 'id')
    const record = await upsertRecord(request.body, recordId)

    response.json(record)
  }),
)

apiRouter.put(
  '/records/:id',
  asyncHandler(async (request, response) => {
    const recordId = String(request.params.id)
    const record = await upsertRecord(request.body, recordId)

    response.json(record)
  }),
)

apiRouter.post(
  '/records/delete',
  asyncHandler(async (request, response) => {
    const recordId = assertString(request.body?.id, 'id')
    const collection = await getCollection()
    await collection.deleteOne({ _id: recordId })
    response.status(204).send()
  }),
)

apiRouter.delete(
  '/records/:id',
  asyncHandler(async (request, response) => {
    const collection = await getCollection()
    await collection.deleteOne({ _id: String(request.params.id) })
    response.status(204).send()
  }),
)

apiRouter.delete(
  '/records',
  asyncHandler(async (_request, response) => {
    const collection = await getCollection()
    await collection.deleteMany({})
    response.status(204).send()
  }),
)

app.use('/api', apiRouter)
app.use(apiRouter)

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

let server

if (process.env.VERCEL !== '1') {
  server = app.listen(port, () => {
    console.log(`API server running on http://localhost:${port}`)
  })
}

async function shutdown() {
  await client.close()

  if (!server) {
    process.exit(0)
    return
  }

  server.close(() => {
    process.exit(0)
  })
}

if (process.env.VERCEL !== '1') {
  process.on('SIGINT', () => {
    void shutdown()
  })

  process.on('SIGTERM', () => {
    void shutdown()
  })
}

export default app
