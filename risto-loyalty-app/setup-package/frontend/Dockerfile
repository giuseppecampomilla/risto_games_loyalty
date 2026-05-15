# Stage 1: Build
FROM node:18-alpine as build-stage

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Queste variabili verranno iniettate durante la build o tramite script
ARG VITE_API_BASE_URL
ARG VITE_MULTIPLAYER_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_MULTIPLAYER_URL=$VITE_MULTIPLAYER_URL

RUN npm run build

# Stage 2: Production
FROM nginx:stable-alpine

COPY --from=build-stage /app/dist /usr/share/nginx/html
# Copiamo una configurazione nginx custom se necessaria
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
