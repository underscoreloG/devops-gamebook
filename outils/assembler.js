/* Assemble les sources de site/ en un seul fichier HTML autonome.
   Usage : node outils/assembler.js
   Produit : jeu.html (à ouvrir ou à partager), site/index.html (version de travail) et site/artifact.html (version publiée). */
'use strict';
const fs = require('fs');
const path = require('path');

const racine = path.join(__dirname, '..');
const site = path.join(racine, 'site');
const lire = (f) => fs.readFileSync(path.join(site, f), 'utf8');
const numero = (f) => Number(f.match(/\d+/)[0]);

const trier = (liste) => liste.sort((x, y) => numero(x) - numero(y));
const chapitres = trier(fs.readdirSync(site).filter((f) => /^chapitre-\d+\.js$/.test(f)));
const dossierEn = path.join(site, 'en');
const chapters = fs.existsSync(dossierEn)
  ? trier(fs.readdirSync(dossierEn).filter((f) => /^chapter-\d+\.js$/.test(f))).map((f) => 'en/' + f)
  : [];
const fichiers = ['commun.js'].concat(chapitres, chapters, 'moteur.js');

const TITRE = 'Friday, 4:42 PM';
const POLICES = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;800&amp;family=IBM+Plex+Mono:wght@400;600&amp;family=Literata:ital,wght@0,400;0,600;1,400&amp;display=swap">';
const APP = '<div id="app"></div>\n<noscript><p style="padding:1rem">This gamebook needs JavaScript to follow your choices.</p></noscript>\n';
const page = (tete, corps) => '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
  + '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
  + tete + '</head>\n<body>\n' + corps + '</body>\n</html>\n';

const teteInline = '<title>' + TITRE + '</title>\n' + POLICES + '\n<style>\n' + lire('style.css') + '</style>\n';
const corpsInline = APP + fichiers.map((f) => '<script>\n' + lire(f) + '</script>').join('\n') + '\n';
const teteLiens = '<title>' + TITRE + '</title>\n' + POLICES + '\n<link rel="stylesheet" href="style.css">\n';
const corpsLiens = APP + fichiers.map((f) => '<script src="' + f + '"></script>').join('\n') + '\n';

const autonome = page(teteInline, corpsInline);
fs.writeFileSync(path.join(racine, 'jeu.html'), autonome);
fs.writeFileSync(path.join(site, 'artifact.html'), teteInline + corpsInline);
fs.writeFileSync(path.join(site, 'index.html'), page(teteLiens, corpsLiens));
console.log('jeu.html : ' + Math.round(Buffer.byteLength(autonome) / 1024) + ' Ko, ' + chapitres.length + ' chapitres FR, ' + chapters.length + ' chapters EN');
