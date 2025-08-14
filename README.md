# MLB Tracker: Agenda de Partidos en Tiempo Real

Este proyecto es una aplicación web que te permite consultar la agenda de partidos de la MLB (Grandes Ligas de Béisbol) para cualquier fecha, con una característica especial: resaltar a los jugadores de una nacionalidad específica. Es la herramienta perfecta para los aficionados al béisbol que desean seguir a sus jugadores y equipos favoritos en tiempo real.

## ✨ Características Principales

- **Agenda de Partidos por Fecha:** Selecciona cualquier fecha para ver la agenda de partidos.
- **Filtro por Nacionalidad:** Destaca los jugadores de un país específico en cada encuentro.
- **Datos en Tiempo Real:** Muestra el estado del partido (en progreso, finalizado, programado) y el marcador en vivo.
- **Arquitectura Cliente-Servidor:** El frontend (cliente) se comunica con un backend personalizado que actúa como un proxy para la API oficial de la MLB.

---

## 🚀 Stack Tecnológico

Este proyecto fue construido utilizando una arquitectura cliente-servidor:

### Frontend (Carpeta `/client`)
- **HTML5**
- **CSS3** con **TailwindCSS** para un diseño moderno y responsivo.
- **JavaScript (Vanilla JS)** para la interactividad y la manipulación del DOM.
- **Font Awesome** para los iconos.

### Backend
- **Node.js:** Entorno de ejecución para el servidor.
- **Express.js:** Framework para construir la API y servir los archivos del frontend.
- **Axios:** Cliente HTTP para realizar peticiones a la API externa de la MLB.
- **CORS:** Para habilitar la comunicación segura entre el frontend y el backend.

---

## 🔧 Instalación y Ejecución Local

Para ejecutar este proyecto en tu propia máquina, sigue estos pasos:

1.  **Clona el repositorio:**
    ```bash
    git clone https://github.com/saul-enrique/mlb-tracker.git
    ```

2.  **Navega al directorio del proyecto:**
    ```bash
    cd mlb-tracker
    ```

3.  **Instala las dependencias del backend:**
    ```bash
    npm install
    ```

4.  **Inicia el servidor:**
    ```bash
    node server.js
    ```

5.  **Abre tu navegador y visita:** `http://localhost:8000`

---
