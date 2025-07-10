# Development stage for NestJS
FROM node:18-alpine AS development

WORKDIR /usr/src/app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Debug: check what was built
RUN ls -la dist/

# Expose port
EXPOSE 3010

# Start the application in production mode
CMD ["node", "dist/main.js"]
