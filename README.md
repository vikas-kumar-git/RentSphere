# tenant-rent-mvp

A tenant rent app built with Vite, React, TypeScript, and a MongoDB Atlas-backed API for online sync.

## Stack

- Frontend: React + Vite
- API: Express
- Database: MongoDB Atlas via the official `mongodb` Node.js driver

## Environment

Create a `.env` file in the project root:

```env
MONGODB_URI=mongodb+srv://YOUR_DB_USER:YOUR_DB_PASSWORD@YOUR_CLUSTER.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=tenant_rent_mvp
MONGODB_COLLECTION_NAME=records
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
```

If you deploy the frontend and backend to different hosts, also set this for the frontend build:

```env
VITE_API_BASE_URL=https://your-api-domain.com
```

## Atlas Setup

1. Create a MongoDB Atlas cluster.
2. Create a database user for the app.
3. Add your current IP address or server IP to Atlas IP Access List.
4. Copy the Node.js driver connection string from Atlas and place it in `MONGODB_URI`.

If this app already had records stored in the browser, the frontend will try to migrate those records into Atlas on the first successful cloud sync.

## Scripts

- `npm install`
- `npm run dev` to start both the API and frontend
- `npm run build` to build the frontend
- `npm run preview` to preview the frontend build
- `npm start` to run the API server

## API Routes

- `GET /api/health`
- `GET /api/records`
- `PUT /api/records/:id`
- `DELETE /api/records/:id`
- `DELETE /api/records`
# RentSphere
