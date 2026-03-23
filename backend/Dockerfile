# Start from the official Node.js image (slim = smaller size)
FROM node:24-slim

# Create a working directory inside the container
WORKDIR /app

# Copy package files first — Docker caches this layer
# so it only re-runs npm install when package.json changes
COPY package*.json ./

# Install only production dependencies (no dev tools needed)
RUN npm ci --omit=dev

# Copy the rest of the backend source code
COPY src/ ./src/

# Tell Docker that this container listens on port 3001
EXPOSE 3001

# The command that runs when the container starts
CMD ["node", "src/index.js"]