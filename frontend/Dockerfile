FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app code
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Run dev server (accessible from outside the container)
CMD ["npm", "run", "dev", "--", "--host"]
