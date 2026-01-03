# Stage 1: Build the application
FROM node:22-alpine AS build-stage

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the app (Vite outputs to 'dist' by default)
RUN npm run build

# Stage 2: Serve the application using Apache (httpd)
FROM httpd:2.4-alpine

# Copy the build output from the build stage to the Apache htdocs directory
COPY --from=build-stage /app/dist/ /usr/local/apache2/htdocs/

# Expose port 80
EXPOSE 80

# Apache runs by default in the image
