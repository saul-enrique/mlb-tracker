// Wait for the HTML document to be fully loaded and parsed
document.addEventListener('DOMContentLoaded', function() {
    // Set default date to today in the date input field
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('game-date');
    if (dateInput) {
        dateInput.value = today;
    }

    // Add event listener to the search button
    const searchButton = document.getElementById('search-btn');
    if (searchButton) {
        searchButton.addEventListener('click', searchGames);
    }

    // --- Mappings ---
    // Map API country names/codes to the dropdown codes (e.g., "VEN", "DOM")
    const countryToNationalityCode = {
       "USA": "USA", "United States": "USA",
       "Dominican Republic": "DOM",
       "Venezuela": "VEN",
       "Puerto Rico": "PUR",
       "Cuba": "CUB",
       "Mexico": "MEX",
       "Japan": "JPN",
       "Korea": "KOR", "Korea, Republic of": "KOR",
       "Canada": "CAN",
       "Panama": "PAN",
       "Colombia": "COL",
       "Curacao": "CUR",
       "Aruba": "ARU",
       "Netherlands": "NED",
       "Australia": "AUS",
       "Taiwan": "TWN",
       "Nicaragua": "NIC"
       // Add more mappings as needed based on API responses
    };

    // Create a reverse map from dropdown code to the primary API country name (used for filtering)
    const nationalityCodeToCountry = Object.fromEntries(
       Object.entries(countryToNationalityCode)
         // Exclude keys that are already 3-letter codes to avoid overwriting
         .filter(([country, code]) => !/^[A-Z]{3}$/.test(country))
         .map(([country, code]) => [code, country])
    );
    // Ensure USA mapping exists if needed for direct comparison
    nationalityCodeToCountry['USA'] = 'USA';


    /**
     * Fetches games for the selected date and initiates the display process.
     */
    async function searchGames() {
        const selectedDate = document.getElementById('game-date')?.value;
        const selectedNationality = document.getElementById('nationality')?.value; // Dropdown code (e.g., "VEN")

        // Exit if date input is somehow missing
        if (!selectedDate) {
            console.error("Date input element not found");
            return;
        }

        // Get references to UI elements for showing/hiding states
        const resultsSection = document.getElementById('results-section');
        const noResultsDiv = document.getElementById('no-results');
        const loadingDiv = document.getElementById('loading');
        const gamesContainer = document.getElementById('games-container');

        // --- UI Updates: Prepare for new search ---
        // Clear previous game results
        if (gamesContainer) gamesContainer.innerHTML = '';
        // Hide results and 'no results' sections
        if (resultsSection) resultsSection.classList.add('hidden');
        if (noResultsDiv) noResultsDiv.classList.add('hidden');
        // Show loading indicator
        if (loadingDiv) loadingDiv.classList.remove('hidden');

        try {
            // Construct the API URL for the schedule
            // Uses hydrate=team,venue to try and get related team/venue data in the same request
            const scheduleUrl = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${selectedDate}&hydrate=team,venue`;
            const response = await fetch(scheduleUrl);

            // Check if the API request was successful
            if (!response.ok) {
                // Throw an error with details if the request failed
                throw new Error(`Network Error: ${response.status} ${response.statusText}`);
            }
            // Parse the JSON response from the API
            const data = await response.json();

            // Hide loading indicator now that data is fetched (or failed)
            if (loadingDiv) loadingDiv.classList.add('hidden');

            // Check if the API returned any games for the selected date
            if (!data.dates || data.dates.length === 0 || data.dates[0].games.length === 0) {
                // If no games, show the 'no results' message
                if (noResultsDiv) {
                    noResultsDiv.classList.remove('hidden');
                    // Ensure the message is the default one
                    noResultsDiv.querySelector('h3').textContent = 'No se Encontraron Partidos';
                    noResultsDiv.querySelector('p').textContent = 'Intenta con otra fecha o cambia el filtro de nacionalidad.';
                }
                return; // Stop further processing
            }

            // Extract the list of games from the API response
            const games = data.dates[0].games;

            // Call the function to display the games found
            displayGames(games, selectedNationality);

        } catch (error) {
            // Log the error to the console for debugging
            console.error('Error searching games:', error);
            // Hide loading indicator
            if (loadingDiv) loadingDiv.classList.add('hidden');
            // Show the 'no results' div, but display an error message
            if (noResultsDiv) {
                noResultsDiv.classList.remove('hidden');
                noResultsDiv.querySelector('h3').textContent = 'Error al Cargar Datos';
                noResultsDiv.querySelector('p').textContent = `Hubo un problema al conectar con la API (${error.message}). Inténtalo de nuevo.`;
            }
        }
    }

    /**
     * Displays the list of games and triggers fetching player nationality data.
     * @param {Array} games - Array of game objects from the API.
     * @param {string} selectedNationality - The selected nationality code from the dropdown (e.g., "VEN").
     */
    function displayGames(games, selectedNationality) {
        // Get references to UI elements
        const container = document.getElementById('games-container');
        const resultsSection = document.getElementById('results-section');
        const resultsCountDiv = document.getElementById('results-count');
        const noResultsDiv = document.getElementById('no-results');

        // Exit if essential containers are missing
        if (!container || !resultsSection || !resultsCountDiv || !noResultsDiv) {
            console.error("One or more result container elements not found");
            return;
        }
        // Clear any previous game cards
        container.innerHTML = '';

        // Update the results count display
        resultsCountDiv.textContent = `${games.length} Partido${games.length !== 1 ? 's' : ''}`;

        // Handle the case where the API returned an empty games array (should be caught earlier, but double-check)
        if (games.length === 0) {
            noResultsDiv.classList.remove('hidden');
            resultsSection.classList.add('hidden'); // Hide the results header too
            return;
        }

        // --- Create and Append Game Cards ---
        games.forEach(game => {
            const gameCard = document.createElement('div');
            // Set a unique ID for each card based on the game's primary key
            gameCard.id = `game-${game.gamePk}`;
            // Determine border color based on game state (Live = red, otherwise blue)
            // Use optional chaining (?) to safely access nested properties
            const borderColor = game.status?.abstractGameState === 'Live' ? 'border-mlb-red' : 'border-mlb-blue';
            // Apply Tailwind classes for styling the card
            gameCard.className = `bg-gray-800 rounded-xl shadow-lg-dark overflow-hidden border-l-4 ${borderColor} hover:shadow-xl-dark transition duration-300 flex flex-col border border-gray-700`;

            // Extract game details, providing defaults if data is missing
            const homeTeam = game.teams.home?.team?.name ?? 'Equipo Local';
            const awayTeam = game.teams.away?.team?.name ?? 'Equipo Visitante';
            const stadium = game.venue?.name ?? 'Estadio Desconocido';

            // Format game time, attempting local time first, then falling back to ET
            let gameTime = 'Hora no disp.';
            let timeZoneUsed = '';
            try {
                 const gameDate = new Date(game.gameDate);
                 // Format time using browser's default locale or Spanish fallback
                 gameTime = gameDate.toLocaleTimeString(navigator.language || 'es-ES', { hour: '2-digit', minute: '2-digit' });
                 try {
                   // Attempt to extract timezone abbreviation (e.g., PST, EST)
                   const timeString = gameDate.toLocaleTimeString(navigator.language || 'es-ES', {timeZoneName:'short'});
                   const tzMatch = timeString.match(/\b([A-Z]{2,})\b/); // Regex to find capitalized abbreviation
                   timeZoneUsed = tzMatch ? tzMatch[1] : '';
                 } catch(tzError){ /* Ignore timezone formatting error */ }
            } catch(e) {
                 console.warn(`Could not format local date ${game.gameDate}: ${e}`);
                 try { // Fallback to US English format in Eastern Time
                   gameTime = `${new Date(game.gameDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' })}`;
                   timeZoneUsed = 'ET';
                 } catch (e2) { /* Give up if fallback also fails */ }
            }

            // Get series description or use default
            const seriesDesc = game.seriesDescription || 'Temporada Regular';
            // Get detailed game state or use default
            const gameState = game.status?.detailedState || 'Programado';

            // Set the inner HTML of the game card (COMMENTS REMOVED FROM HERE)
            gameCard.innerHTML = `
                <div class="p-5 flex-grow">
                    <div class="flex justify-between items-start mb-4 gap-2">
                        <div class="flex-1 min-w-0">
                            <div class="text-xs sm:text-sm text-gray-400 mb-1 flex items-center flex-wrap gap-x-2 gap-y-1">
                                <span class="whitespace-nowrap"><i class="far fa-clock mr-1 text-mlb-red opacity-90"></i> ${gameTime} ${timeZoneUsed}</span>
                                <span class="hidden sm:inline text-gray-600">•</span>
                                <span class="whitespace-nowrap truncate" title="${stadium}"><i class="fas fa-map-marker-alt mr-1 text-mlb-red opacity-90"></i> ${stadium}</span>
                            </div>
                            <h3 class="text-lg md:text-xl font-bold text-gray-100 leading-tight font-oswald truncate" title="${awayTeam} @ ${homeTeam}">
                                ${awayTeam} <span class="font-normal text-gray-500 mx-1">@</span> ${homeTeam}
                            </h3>
                        </div>
                        <div class="bg-mlb-blue text-white px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap mt-1 shadow-sm flex-shrink-0">
                            ${gameState}
                        </div>
                    </div>
                    <div id="nationality-info-${game.gamePk}" class="nationality-info mt-4 mb-4 space-y-3">
                        </div>
                </div>
                <div class="px-5 py-3 bg-gradient-to-r from-gray-800 to-gray-700 border-t border-gray-600">
                     <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center">
                         <i class="fas fa-flag mr-2 text-blue-400"></i> Nacionalidades en Partido
                     </h4>
                     <div class="flex flex-wrap gap-1.5" id="nationalities-list-${game.gamePk}">
                         <span class="nationality-placeholder px-2 py-0.5 text-xs rounded-full bg-gray-600 text-gray-400 animate-pulse">
                             Cargando...
                         </span>
                     </div>
                 </div>
            `;
            // Append the newly created card to the main container
            container.appendChild(gameCard);
        });

        // Show the results section now that cards are added
        resultsSection.classList.remove('hidden');

        // --- Trigger fetching of player data ---
        // If a specific nationality was selected, fetch and display only those players
        if (selectedNationality) {
            fetchAndDisplayPlayersByNationality(games, selectedNationality);
        } else {
            // Otherwise, fetch data to display all nationalities present in each game
            fetchAllNationalities(games);
        }
    }

    /**
     * Fetches detailed player data for a given game, including birth country.
     * Uses the v1.1 live feed endpoint which often contains roster info.
     * Fetches full player details in batches using the /people endpoint.
     * @param {string|number} gamePk - The primary key (ID) of the game.
     * @returns {Promise<Array>} - A promise that resolves to an array of player objects or empty array on error.
     */
    async function fetchPlayerData(gamePk) {
        try {
            // Use the v1.1 live feed endpoint, often includes roster data needed
            const liveFeedUrl = `https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`;
            const response = await fetch(liveFeedUrl);
            if (!response.ok) throw new Error(`Error fetching live feed for game ${gamePk} (${response.status})`);
            const data = await response.json();

            // Extract player IDs safely using optional chaining from the boxscore data within the live feed
            const awayPlayers = data?.liveData?.boxscore?.teams?.away?.players ?? {};
            const homePlayers = data?.liveData?.boxscore?.teams?.home?.players ?? {};

            // Combine player IDs from both teams and remove the "ID" prefix
            const playerIds = [...Object.keys(awayPlayers), ...Object.keys(homePlayers)]
                              .map(id => id.replace('ID', ''));

            // If no player IDs found, return empty array
            if (playerIds.length === 0) {
                console.warn(`No player IDs found in boxscore for game ${gamePk}`);
                return [];
            }

            // --- Fetch full player details in batches ---
            // Define max number of IDs per API call to avoid overly long URLs
            const MAX_BATCH_SIZE = 40;
            let allPlayersData = [];
            // Loop through player IDs in chunks (batches)
            for (let i = 0; i < playerIds.length; i += MAX_BATCH_SIZE) {
                const batchIds = playerIds.slice(i, i + MAX_BATCH_SIZE);
                // Construct URL for the /people endpoint with multiple IDs
                // Hydrate requests related data: current team, season stats, draft year
                const peopleUrl = `https://statsapi.mlb.com/api/v1/people?personIds=${batchIds.join(',')}&hydrate=currentTeam,stats(type=season,season=${new Date().getFullYear()}),draftYear`;
                try {
                     const peopleResponse = await fetch(peopleUrl);
                     if (!peopleResponse.ok) throw new Error(`Error fetching player details batch ${i / MAX_BATCH_SIZE} (${peopleResponse.status})`);
                     const peopleData = await peopleResponse.json();
                     // Add the fetched player data to the main array
                     if (peopleData.people) {
                         allPlayersData = allPlayersData.concat(peopleData.people);
                     }
                } catch (batchError) {
                    // Log errors for specific batches but continue processing others
                    console.error(`Error fetching player batch ${Math.floor(i / MAX_BATCH_SIZE)} for game ${gamePk}:`, batchError);
                }
            }
            return allPlayersData; // Return the combined player data

        } catch (error) {
            // Log general errors during player data fetching
            console.error(`Error fetching player data for game ${gamePk}:`, error);
            return []; // Return empty array on failure
        }
    }

    /**
     * Fetches player data for games and updates the UI to show players
     * matching the selected nationality, including their images.
     * @param {Array} games - Array of game objects.
     * @param {string} selectedNationalityCode - The code of the selected nationality (e.g., "VEN").
     */
    async function fetchAndDisplayPlayersByNationality(games, selectedNationalityCode) {
        // Get the full country name corresponding to the selected code (for filtering API data)
        const selectedCountry = nationalityCodeToCountry[selectedNationalityCode];
         // Handle cases where the code might not be mapped (e.g., if USA is used directly)
         if (!selectedCountry && selectedNationalityCode !== 'USA') {
             console.warn(`Nationality code not mapped: ${selectedNationalityCode}`);
             // Optionally clear nationality info in all cards or show a general warning
             return;
         }

        // Process each game concurrently using Promise.allSettled
        // allSettled ensures all promises complete, even if some fail
        await Promise.allSettled(games.map(async (game) => {
            const gamePk = game.gamePk;
            // Find the corresponding game card and containers within it
            const gameCard = document.getElementById(`game-${gamePk}`);
            const nationalityInfoContainer = gameCard?.querySelector(`#nationality-info-${gamePk}`);
            const nationalitiesListContainer = gameCard?.querySelector(`#nationalities-list-${gamePk}`);

            // Skip if the card elements aren't found
            if (!gameCard || !nationalityInfoContainer || !nationalitiesListContainer) return;

            // --- UI Update: Show loading state within the card ---
            nationalitiesListContainer.innerHTML = '<span class="nationality-placeholder px-2 py-0.5 text-xs rounded-full bg-gray-600 text-gray-400 animate-pulse">Buscando...</span>';
            nationalityInfoContainer.innerHTML = ''; // Clear previous specific nationality info

            // Fetch detailed player data for this game
            const players = await fetchPlayerData(gamePk);

            // Filter the fetched players based on the selected nationality
            const playersFromSelectedNationality = players.filter(player => {
                const birthCountry = player.birthCountry;
                // Match if the API birth country matches the expected name OR if the mapped code matches
                return (birthCountry && selectedCountry && birthCountry === selectedCountry) ||
                       (birthCountry && countryToNationalityCode[birthCountry] === selectedNationalityCode);
            });

            // --- Update UI: Display filtered players with images ---
            if (playersFromSelectedNationality.length > 0) {
                // Helper function to generate placeholder image URL with initials
                const getPlaceholderUrl = (initials) => `https://placehold.co/40x40/4b5563/e5e7eb?text=${initials}&font=oswald`; // Dark bg, light text

                // Set the HTML for the specific nationality info box
                nationalityInfoContainer.innerHTML = `
                    <div class="p-3 bg-gray-700 rounded-lg border border-gray-600 shadow-sm">
                        <div class="flex items-center mb-3">
                            <div class="mr-2 bg-mlb-blue p-1 rounded-full flex-shrink-0 shadow">
                                <i class="fas fa-users text-white text-xs"></i>
                            </div>
                            <h4 class="font-semibold text-blue-300 text-sm uppercase tracking-wide font-oswald">Jugadores de ${getNationalityName(selectedNationalityCode)}</h4>
                        </div>
                        <ul class="space-y-2">
                            ${playersFromSelectedNationality.map(p => {
                                // Construct potential image URL (EXAMPLE PATTERN - MAY NOT WORK)
                                const imageUrl = `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic_headshot.png/w_80,h_80,c_fill,g_face,q_auto:best/v1/people/${p.id}/headshot/67/current`;

                                // Generate initials for fallback image
                                const nameParts = p.fullName?.split(' ') || ['?'];
                                const initials = (nameParts[0]?.[0] || '') + (nameParts[nameParts.length - 1]?.[0] || '');
                                const placeholderUrl = getPlaceholderUrl(initials.toUpperCase() || 'NA');

                                // Fallback script for the onerror event
                                const fallbackScript = `this.onerror=null; this.src='${placeholderUrl}';`;

                                // Create list item HTML with image, name, and position
                                return `
                                <li class="flex items-center justify-between text-sm">
                                    <div class="flex items-center space-x-2 min-w-0">
                                        <img
                                            src="${imageUrl}"
                                            alt="[Imagen de ${p.fullName}]"
                                            class="w-8 h-8 rounded-full player-img border border-gray-500 flex-shrink-0"
                                            onerror="${fallbackScript}"
                                            loading="lazy"
                                        >
                                        <span class="text-gray-200 truncate" title="${p.fullName}">${p.fullName}</span>
                                    </div>
                                    <span class="text-gray-300 bg-gray-600 px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0">${p.primaryPosition?.abbreviation ?? 'N/A'}</span>
                                </li>
                            `}).join('')}
                        </ul>
                    </div>
                `;
            } else {
                // If no players found for the selected nationality in this game
                nationalityInfoContainer.innerHTML = `
                    <div class="p-2 bg-gray-700 rounded-lg border border-gray-600 text-center">
                        <p class="text-xs text-gray-500 italic">No hay jugadores de ${getNationalityName(selectedNationalityCode)} en este partido.</p>
                    </div>
                `;
            }

            // --- Update UI: Display all nationalities present in this game ---
            updateNationalitiesList(players, nationalitiesListContainer, selectedNationalityCode);
        })); // End Promise.allSettled map
    }

    /**
     * Fetches player data for games and updates the UI to show tags for all
     * nationalities present in each game.
     * @param {Array} games - Array of game objects.
     */
     async function fetchAllNationalities(games) {
         // Process each game concurrently
         await Promise.allSettled(games.map(async (game) => {
            const gamePk = game.gamePk;
            const gameCard = document.getElementById(`game-${gamePk}`);
            // We only need the list container here, not the specific nationality info container
            const nationalityInfoContainer = gameCard?.querySelector(`#nationality-info-${gamePk}`);
            const nationalitiesListContainer = gameCard?.querySelector(`#nationalities-list-${gamePk}`);

            if (!gameCard || !nationalitiesListContainer) return; // Skip if elements missing

            // --- UI Update: Show loading state ---
            nationalitiesListContainer.innerHTML = '<span class="nationality-placeholder px-2 py-0.5 text-xs rounded-full bg-gray-600 text-gray-400 animate-pulse">Buscando...</span>';
            // Clear the specific nationality info area if it exists
            if(nationalityInfoContainer) nationalityInfoContainer.innerHTML = '';

            // Fetch player data
            const players = await fetchPlayerData(gamePk);
            // Update the list of nationality tags (no specific code highlighted)
            updateNationalitiesList(players, nationalitiesListContainer, null);
         })); // End Promise.allSettled map
    }

    /**
     * Updates the list of nationality tags in a game card's footer.
     * @param {Array} players - Array of player objects for the game.
     * @param {HTMLElement} containerElement - The container element for the tags.
     * @param {string|null} highlightedCode - The nationality code to highlight, or null.
     */
    function updateNationalitiesList(players, containerElement, highlightedCode) {
         // Exit if container element is missing
         if (!containerElement) return;
         // Clear previous content (e.g., "Cargando...")
         containerElement.innerHTML = '';

         // Count occurrences of each nationality
         const nationalitiesInGame = {};
         players.forEach(player => {
             const country = player.birthCountry;
             if (country) {
                 // Use the mapping to get the standard code (e.g., "DOM")
                 const code = countryToNationalityCode[country] || null;
                 if (code) {
                     // Increment count for this nationality code
                     nationalitiesInGame[code] = (nationalitiesInGame[code] || 0) + 1;
                 } else {
                     // Log if a country from the API isn't in our mapping
                     console.warn(`Unmapped birth country: ${country} for player ${player.fullName}`);
                     // Optional: Could add logic here to display unmapped countries differently
                 }
             }
         });

         // --- Generate and display nationality tags ---
         if (Object.keys(nationalitiesInGame).length > 0) {
             containerElement.innerHTML = Object.entries(nationalitiesInGame)
                 // Sort tags by player count (descending)
                 .sort((a, b) => b[1] - a[1])
                 .map(([code, count]) => {
                     // Determine if this tag should be highlighted
                     const isHighlighted = code === highlightedCode;
                     // Apply different styles for highlighted vs default tags
                     const tagClasses = isHighlighted
                       ? 'bg-mlb-blue text-white shadow-sm' // Highlighted style
                       : 'bg-gray-600 text-gray-200 hover:bg-gray-500'; // Default style
                     const fontWeight = isHighlighted ? 'font-semibold' : 'font-normal';
                     // Create the HTML for the tag
                     return `
                        <span class="px-2 py-0.5 text-[11px] rounded-full ${tagClasses} ${fontWeight} transition-colors duration-150">
                            ${getNationalityName(code)} (${count})
                        </span>
                     `;
                 }).join(''); // Join all tag HTML strings together
         } else {
             // Display message if no nationalities could be determined
             containerElement.innerHTML = `<span class="text-xs text-gray-500 italic">Nacionalidades no disponibles.</span>`;
         }
    }

    /**
     * Returns a display-friendly name for a given nationality code.
     * @param {string} code - The nationality code (e.g., "VEN").
     * @returns {string} - The display name (e.g., "Venezuela") or the code itself if not found.
     */
    function getNationalityName(code) {
        // Map of codes to display names
        const nationalitiesMap = new Map([
            ["USA", "EE.UU."], ["DOM", "Rep. Dominicana"], ["VEN", "Venezuela"],
            ["PUR", "Puerto Rico"], ["CUB", "Cuba"], ["MEX", "México"],
            ["JPN", "Japón"], ["KOR", "Corea"], ["CAN", "Canadá"],
            ["PAN", "Panamá"], ["COL", "Colombia"], ["CUR", "Curazao"],
            ["ARU", "Aruba"], ["NED", "Países Bajos"], ["AUS", "Australia"],
            ["TWN", "Taiwán"], ["NIC", "Nicaragua"]
            // Add more mappings here
        ]);
        // Return the mapped name or the original code if no mapping exists
        return nationalitiesMap.get(code) || code;
    }

    // --- Initial Load ---
    // Perform an initial search when the page loads to show today's games
    searchGames();
}); // End DOMContentLoaded listener
