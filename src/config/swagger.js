// src/config/swagger.js
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Collaborative Workspace API',
      version: '1.0.0'
    },
    servers: [{ url: 'http://localhost:3000/api/v1' }]
  },
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;
