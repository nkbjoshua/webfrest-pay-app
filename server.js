// Tiny static server for the production build (dist/spa) with history-mode fallback.
const path = require('path');
const express = require('express');
const app = express();
const dir = path.join(__dirname, 'dist', 'spa');
app.use(express.static(dir, { maxAge: '1h', index: false }));
app.get('*', (_req, res) => res.sendFile(path.join(dir, 'index.html')));
app.listen(process.env.PORT || 9500, () => console.log('Webfrest Pay app on', process.env.PORT || 9500));
