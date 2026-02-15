# Base image
FROM node:18-alpine

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl


# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy prisma schema
COPY prisma ./prisma/

# Install production dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port (Fly.io typically uses 8080 internally, mapping to 80/443 public)
EXPOSE 8080

# Environment variable default (can be overridden)
ENV PORT=8080
ENV NODE_ENV=production

# Start command
CMD ["npm", "start"]
