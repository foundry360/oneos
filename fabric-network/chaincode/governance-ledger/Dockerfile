# Use Fabric's official Node.js chaincode environment
FROM hyperledger/fabric-nodeenv:2.5

WORKDIR /usr/src/app

# Copy package files first
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy chaincode source files
COPY index.js server.js connection.json ./

# Expose chaincode server port
EXPOSE 9999

# Start the chaincode server
CMD ["node", "server.js"]
