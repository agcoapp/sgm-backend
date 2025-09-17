FROM node:22.7.0-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Vider le cache npm (pour vider le cache)
RUN npm cache clean --force

# Install dependencies
RUN npm install --omit=dev

# Copy source code
COPY . .

# Generate Prisma client with correct binary target for Alpine
ENV PRISMA_CLI_BINARY_TARGETS=linux-musl-openssl-3.0.x
RUN npx prisma generate --schema=./prisma/schema.prisma

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start the application
CMD ["npm", "start"]