// 1. Importar las herramientas que acabamos de instalar
const express = require('express');
const path = require('path'); // Herramienta de Node para trabajar con rutas de archivos
const cors = require('cors');
const axios = require('axios');
const NodeCache = require('node-cache'); // <-- AÑADE ESTA LÍNEA

// Inicializamos el caché.
// stdTTL: 300 significa que cada dato guardado expirará automáticamente en 300 segundos (5 minutos).
const myCache = new NodeCache({ stdTTL: 300 }); // <-- AÑADE ESTA LÍNEA

// 2. Crear nuestra aplicación de servidor
const app = express();
const PORT = 8000; // Usaremos el puerto 8000 para el backend

// 3. Configurar el servidor (Middlewares)
// Le permite a nuestro frontend (que se ejecuta en el navegador) hacerle peticiones a este servidor
app.use(cors()); 

// ¡Esta línea es clave! Le dice al servidor que sirva cualquier archivo
// que se encuentre en la carpeta 'client'
app.use(express.static(path.join(__dirname, 'client')));

// 4. Poner el servidor a escuchar peticiones

// ===== INICIO DE LA SECCIÓN DE API (VERSIÓN MEJORADA) =====

// 5. Definición de las rutas de nuestra API
app.get('/api/schedule', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'El parámetro de fecha es requerido' });
    }

    // Creamos una "llave" única para esta petición. Ej: "schedule-2025-08-14"
    const cacheKey = `schedule-${date}`;

    // 1. REVISAMOS EL CACHÉ PRIMERO
    if (myCache.has(cacheKey)) {
      console.log(`✅ ¡CACHE HIT! Sirviendo datos para la fecha: ${date} desde el caché.`);
      // Si los datos existen en el caché, los devolvemos inmediatamente.
      return res.json(myCache.get(cacheKey));
    }

    // 2. SI NO ESTÁ EN EL CACHÉ (CACHE MISS)
    console.log(`❌ CACHE MISS. Pidiendo datos a la MLB para la fecha: ${date}`);
    const mlbApiUrl = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${date}&hydrate=team,venue,probablePitcher,linescore`;
    const apiResponse = await axios.get(mlbApiUrl);
    const data = apiResponse.data;

    // 3. GUARDAMOS LA RESPUESTA FRESCA EN EL CACHÉ
    myCache.set(cacheKey, data);

    // Y enviamos la respuesta al usuario
    res.json(data);

  } catch (error) {
    console.error('Error al contactar la API de la MLB:', error.message);
    res.status(500).json({ error: 'No se pudieron obtener los datos de la API de MLB' });
  }
});

// Ruta para obtener los detalles de un juego específico (live feed)
app.get('/api/gamefeed/:gamePk', async (req, res) => {
  try {
    const { gamePk } = req.params;
    const cacheKey = `gamefeed-${gamePk}`;

    const cachedData = myCache.get(cacheKey);
    if (cachedData) {
      console.log(`¡Datos de juego servidos desde el caché para: ${gamePk}!`);
      return res.json(cachedData);
    }

    const mlbApiUrl = `https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`;
    console.log(`Pidiendo detalles para el juego: ${gamePk} (no estaba en caché)`);
    const apiResponse = await axios.get(mlbApiUrl);

    myCache.set(cacheKey, apiResponse.data);
    console.log(`Datos del juego ${gamePk} guardados en el caché.`);

    res.json(apiResponse.data);

  } catch (error) {
    console.error(`Error al obtener detalles del juego ${req.params.gamePk}:`, error.message);
    res.status(500).json({ error: 'No se pudieron obtener los detalles del juego' });
  }
});

// Ruta para obtener detalles de múltiples jugadores por sus IDs
app.get('/api/people', async (req, res) => {
  try {
    const { personIds } = req.query;
    if (!personIds) {
      return res.status(400).json({ error: 'Se requieren IDs de personas' });
    }

    // Usamos una versión corta de los IDs para la clave del caché
    const cacheKey = `people-${personIds.substring(0, 50)}`;

    const cachedData = myCache.get(cacheKey);
    if (cachedData) {
      console.log(`¡Datos de jugadores servidos desde el caché para: ${personIds.substring(0, 50)}...!`);
      return res.json(cachedData);
    }

    const mlbApiUrl = `https://statsapi.mlb.com/api/v1/people?personIds=${personIds}&hydrate=currentTeam,stats(type=season,season=${new Date().getFullYear()}),draftYear`;
    console.log(`Pidiendo detalles para los jugadores: ${personIds.substring(0, 50)}... (no estaba en caché)`);
    const apiResponse = await axios.get(mlbApiUrl);

    myCache.set(cacheKey, apiResponse.data);
    console.log(`Datos de jugadores para ${personIds.substring(0, 50)}... guardados en el caché.`);

    res.json(apiResponse.data);

  } catch (error) {
    console.error('Error al obtener detalles de los jugadores:', error.message);
    res.status(500).json({ error: 'No se pudieron obtener los detalles de los jugadores' });
  }
});

// ===== FIN DE LA SECCIÓN DE API =====


app.listen(PORT, () => {
  console.log(`¡Servidor listo! Escuchando en http://localhost:${PORT}`);
});