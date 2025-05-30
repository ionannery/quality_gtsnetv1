// QUALITY_GTSNET-BACKEND/backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos do frontend
// __dirname aqui é '.../QUALITY_GTSNET-BACKEND/backend'
// '../frontend' sobe um nível para 'QUALITY_GTSNET-BACKEND/' e entra em 'frontend/'
app.use(express.static(path.join(__dirname, '../frontend')));

// Rotas da API
app.use('/api', apiRoutes);

// Rota principal para servir o index.html do frontend
// (assumindo que 'index.html' é sua página principal na raiz de 'frontend/')
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// Se você quiser rotas diretas para outras páginas (opcional, pois o express.static geralmente lida com isso):
// app.get('/pega-script', (req, res) => {
//   res.sendFile(path.join(__dirname, '../frontend', 'pega-script.html'));
// });
// app.get('/loteria', (req, res) => {
//   res.sendFile(path.join(__dirname, '../frontend', 'loteria.html'));
// });


app.listen(PORT, () => {
  console.log(`Servidor backend rodando na porta ${PORT}`);
  console.log(`Acesse o frontend em http://localhost:${PORT}`);
});