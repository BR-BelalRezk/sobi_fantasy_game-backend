# SOBI WebSocket Server

A WebSocket server built with Node.js, TypeScript, and the `ws` library.

## Features

- 🚀 WebSocket server using `ws` library
- 📘 TypeScript support
- 🔄 Hot reload in development with `tsx`
- 📦 Simple message handling and broadcasting utilities

## Installation

```bash
npm install
```

## Development

Run the server in development mode with hot reload:

```bash
npm run dev
```

## Production

Build and run the production server:

```bash
npm run build
npm start
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
PORT=8080
```

## Usage

The server listens for WebSocket connections on the configured port (default: 8080).

### Connecting from a Client

```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
  console.log('Connected to server');
  ws.send(JSON.stringify({ type: 'hello', message: 'Hi server!' }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

### Message Format

The server handles messages in JSON format and responds with structured messages:

**Welcome Message:**
```json
{
  "type": "welcome",
  "message": "Connected to WebSocket server",
  "timestamp": "2026-02-01T19:42:00.000Z"
}
```

**Echo Response:**
```json
{
  "type": "echo",
  "data": { "your": "message" },
  "timestamp": "2026-02-01T19:42:00.000Z"
}
```

## Project Structure

```
sobi-server/
├── src/
│   └── index.ts          # Main WebSocket server
├── dist/                 # Compiled JavaScript (generated)
├── .env.example          # Environment variables template
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run production server
- `npm run type-check` - Check TypeScript types without building
