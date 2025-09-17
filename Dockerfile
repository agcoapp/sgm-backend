FROM node:22.7.0-slim

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

# Generate Prisma client
RUN npx prisma generate

# Create non-root user
RUN groupadd -g 1001 nodejs
RUN useradd -r -u 1001 -g nodejs nodejs

# Change ownership
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start the application
CMD ["npm", "start"]