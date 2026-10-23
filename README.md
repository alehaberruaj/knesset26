# Knéset 26 · Mi pronóstico

Sitio para pronosticar las elecciones en Israel del 27 de octubre de 2026:

- Reparte las 120 bancas entre los partidos (umbral: 0 o al menos 4 bancas).
- Marca qué partidos forman la coalición. Si suman 61 o más, eliges primer ministro/a y pronosticas el gobierno.
- Si no, el botón **Pronosticar nuevas elecciones** genera ese escenario.
- Descarga la imagen (1080×1350) o compártela; el link guarda tu pronóstico.

Es HTML/CSS/JS estático, sin dependencias. Para probarlo localmente: `python3 -m http.server` y abrir http://localhost:8000.

Los datos de partidos y el promedio de encuestas están al principio de `app.js` (`PARTIES`).

## Publicación

El workflow `.github/workflows/pages.yml` publica el sitio en GitHub Pages en cada push a `main`
(activar en Settings → Pages → Source: GitHub Actions).
