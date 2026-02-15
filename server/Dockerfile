# Base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

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
