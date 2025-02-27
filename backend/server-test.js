const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

// Basic route
app.get('/', (req, res) => {
  res.send('Hello from Azure! Server is working.');
});

// Environment variables check
app.get('/env', (req, res) => {
  res.json({
    nodeEnv: process.env.NODE_ENV,
    mongoDbExists: Boolean(process.env.MONGODB_URI),
    port: PORT
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
}); 