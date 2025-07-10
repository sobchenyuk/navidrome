# 🎧 Navidrome Front-Server

NestJS GraphQL microservice for Navidrome tagging module.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run start:dev
```

## 📡 GraphQL Playground

Once running, visit: http://localhost:3005/graphql

## 🔧 Available Scripts

- `npm run start:dev` - Development mode with hot reload
- `npm run start:prod` - Production mode
- `npm run build` - Build for production
- `npm run test` - Run tests

## 📋 GraphQL Schema

### Queries
```graphql
# Get all tracks
tracks(path: String): [Track!]

# Get single track
track(path: String!): Track
```

### Mutations
```graphql
# Update track metadata
updateTags(path: String!, input: TagInput!): Boolean

# Upload cover art
uploadCover(path: String!, coverData: String!): Boolean
```

### Types
```graphql
type Track {
  id: String!
  path: String!
  title: String
  artist: String
  albumArtist: String
  album: String
  year: Int
  trackNumber: Int
  genre: String
  cover: String
}

input TagInput {
  title: String
  artist: String
  albumArtist: String
  album: String
  year: Int
  trackNumber: Int
  genre: String
}
```

## 🐳 Docker Integration

This service runs on port 3005 inside the Docker network and connects to the shared music volume.

## 📚 Libraries Used

- **NestJS** - Node.js framework
- **GraphQL** - API schema and runtime
- **music-metadata** - Reading audio metadata
- **node-id3** - Writing ID3 tags
- **flac-metadata** - FLAC metadata handling
