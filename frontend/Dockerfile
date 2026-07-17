# Frontend Dockerfile - React + Vite
# Multi-stage build for production

# Stage 1: Build stage (dùng slim/glibc thay alpine/musl để tránh lỗi rollup native module)
FROM node:20-slim AS builder

WORKDIR /app

# Accept build argument for API URL
ARG VITE_API_URL=http://localhost:5000/api
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_FACE_DEVICE_KEY=
ENV VITE_FACE_DEVICE_KEY=$VITE_FACE_DEVICE_KEY
ARG VITE_FACE_DEVICE_ID=
ENV VITE_FACE_DEVICE_ID=$VITE_FACE_DEVICE_ID
ARG VITE_DATA_ENTRY_DEVICE_KEY=
ENV VITE_DATA_ENTRY_DEVICE_KEY=$VITE_DATA_ENTRY_DEVICE_KEY

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production stage with Nginx
FROM nginx:alpine AS production

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create a script to replace environment variables at runtime
RUN echo '#!/bin/sh' > /docker-entrypoint.d/40-envsubst-on-index.sh && \
    echo 'if [ -n "$VITE_API_URL" ]; then' >> /docker-entrypoint.d/40-envsubst-on-index.sh && \
    echo '  find /usr/share/nginx/html -type f -name "*.js" -exec sed -i "s|http://localhost:5000/api|$VITE_API_URL|g" {} \;' >> /docker-entrypoint.d/40-envsubst-on-index.sh && \
    echo '  find /usr/share/nginx/html -type f -name "*.js" -exec sed -i "s|http://localhost:3000/api|$VITE_API_URL|g" {} \;' >> /docker-entrypoint.d/40-envsubst-on-index.sh && \
    echo 'fi' >> /docker-entrypoint.d/40-envsubst-on-index.sh && \
    chmod +x /docker-entrypoint.d/40-envsubst-on-index.sh

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/ || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
