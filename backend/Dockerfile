FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json ./
RUN npm install
COPY src ./src
EXPOSE 8080
CMD ["npm", "run", "start"]
