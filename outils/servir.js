/* Petit serveur local pour jouer dans un navigateur.
   Usage : node outils/servir.js  puis ouvrir http://localhost:4642 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4642;
const site = path.join(__dirname, '..', 'site');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

http.createServer((req, res) => {
  const chemin = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const fichier = path.join(site, path.normalize(chemin));
  const nom = path.basename(fichier);
  if (!fichier.startsWith(site + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(fichier, (err, contenu) => {
    if (err) { res.writeHead(404); res.end('Introuvable'); return; }
    res.writeHead(200, { 'Content-Type': (TYPES[path.extname(nom)] || 'text/plain') + '; charset=utf-8' });
    res.end(contenu);
  });
}).listen(PORT, () => console.log('Jeu disponible sur http://localhost:' + PORT));
