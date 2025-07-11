const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // permet toutes les origines
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Proxy vers la vraie API
app.get('/status', async (req, res) => {
  try {
    const response = await fetch('http://51.75.118.18:20052/status');
    const data = await response.text();
    res.send(data);
  } catch (e) {
    res.status(500).send('Erreur proxy');
  }
});

const PORT = 4000;
app.listen(PORT, () => console.log(`Proxy démarré sur http://localhost:${PORT}`));
