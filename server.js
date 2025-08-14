// 1. Importar las herramientas que acabamos de instalar
const express = require('express');
const path = require('path'); // Herramienta de Node para trabajar con rutas de archivos
const cors = require('cors');
const axios = require('axios'); // <-- ¡AÑADE ESTA LÍNEA!

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
    // Obtenemos el parámetro 'date' que nos enviará el frontend
    // Ejemplo: /api/schedule?date=2024-05-20
    const { date } = req.query;

    // Si no nos envían una fecha, devolvemos un error
    if (!date) {
      return res.status(400).json({ error: 'El parámetro de fecha es requerido' });
    }

    // Construimos la URL de la API de la MLB con la fecha recibida
    const mlbApiUrl = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${date}&hydrate=team,venue,probablePitcher,linescore`;

    // Usamos axios para hacer la petición a la API de la MLB
    console.log(`Pidiendo datos a la MLB para la fecha: ${date}`);
    const apiResponse = await axios.get(mlbApiUrl);

    // Enviamos la respuesta de la MLB de vuelta a nuestro frontend
    res.json(apiResponse.data);

  } catch (error) {
    // Si algo sale mal (ej: la API de MLB falla), capturamos el error
    console.error('Error al contactar la API de la MLB:', error.message);
    res.status(500).json({ error: 'No se pudieron obtener los datos de la API de MLB' });
  }
});

// Ruta para obtener los detalles de un juego específico (live feed)
app.get('/api/gamefeed/:gamePk', async (req, res) => {
  try {
    // Obtenemos el ID del juego desde los parámetros de la URL
    const { gamePk } = req.params; // Usamos req.params porque :gamePk está en la ruta

    const mlbApiUrl = `https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`;

    console.log(`Pidiendo detalles para el juego: ${gamePk}`);
    const apiResponse = await axios.get(mlbApiUrl);

    res.json(apiResponse.data);

  } catch (error) {
    console.error(`Error al obtener detalles del juego ${req.params.gamePk}:`, error.message);
    res.status(500).json({ error: 'No se pudieron obtener los detalles del juego' });
  }
});

// Ruta para obtener detalles de múltiples jugadores por sus IDs
app.get('/api/people', async (req, res) => {
  try {
    // Obtenemos los IDs de los jugadores desde el query parameter 'personIds'
    const { personIds } = req.query;

    if (!personIds) {
      return res.status(400).json({ error: 'Se requieren IDs de personas' });
    }

    const mlbApiUrl = `https://statsapi.mlb.com/api/v1/people?personIds=${personIds}&hydrate=currentTeam,stats(type=season,season=${new Date().getFullYear()}),draftYear`;

    console.log(`Pidiendo detalles para los jugadores: ${personIds.substring(0, 50)}...`); // Mostramos solo los primeros para no saturar la consola
    const apiResponse = await axios.get(mlbApiUrl);

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