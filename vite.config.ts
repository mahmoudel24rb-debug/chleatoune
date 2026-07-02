import { defineConfig } from 'vite';

// Port FIXE : la sauvegarde vit dans le localStorage du navigateur,
// qui est lié à l'origine (localhost:PORT). Sans strictPort, Vite
// change de port quand 5199 est occupé et on « perd » sa sauvegarde
// (elle reste sur l'ancien port). Ici : toujours la même adresse.
export default defineConfig({
  // chemins relatifs : nécessaires pour l'app Electron (file://)
  base: './',
  server: {
    port: 5199,
    strictPort: true,
  },
  preview: {
    port: 5199,
    strictPort: true,
  },
});
