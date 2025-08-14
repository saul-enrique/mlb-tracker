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
    const countryToNationalityCode = {
       "USA": "USA", "United States": "USA", "Dominican Republic": "DOM",
       "Venezuela": "VEN", "Puerto Rico": "PUR", "Cuba": "CUB", "Mexico": "MEX",
       "Japan": "JPN", "Korea": "KOR", "Korea, Republic of": "KOR", "Canada": "CAN",
       "Panama": "PAN", "Colombia": "COL", "Curacao": "CUR", "Aruba": "ARU",
       "Netherlands": "NED", "Australia": "AUS", "Taiwan": "TWN", "Nicaragua": "NIC"
    };
    const nationalityCodeToCountry = Object.fromEntries(
       Object.entries(countryToNationalityCode)
         .filter(([country, code]) => !/^[A-Z]{3}$/.test(country))
         .map(([country, code]) => [code, country])
    );
    nationalityCodeToCountry['USA'] = 'USA';


    /**
     * Fetches games for the selected date and initiates the display process.
     */
    async function searchGames() {
        const selectedDate = document.getElementById('game-date')?.value;
        const selectedNationality = document.getElementById('nationality')?.value;
        if (!selectedDate) {
            console.error("Date input element not found");
            return;
        }

        const resultsSection = document.getElementById('results-section');
        const noResultsDiv = document.getElementById('no-results');
        const loadingDiv = document.getElementById('loading');
        const gamesContainer = document.getElementById('games-container');

        // UI Updates: Prepare for new search
        if (gamesContainer) gamesContainer.innerHTML = '';
        if (resultsSection) resultsSection.classList.add('hidden');
        if (noResultsDiv) noResultsDiv.classList.add('hidden');
        if (loadingDiv) loadingDiv.classList.remove('hidden');

        try {
            // Fetch schedule, explicitly asking for probablePitcher and linescore
            const scheduleUrl = `/api/schedule?date=${selectedDate}`;
            const response = await fetch(scheduleUrl);
            if (!response.ok) throw new Error(`Network Error: ${response.status} ${response.statusText}`);
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            if (loadingDiv) loadingDiv.classList.add('hidden');

            if (!data.dates || data.dates.length === 0 || !data.dates[0].games || data.dates[0].games.length === 0) {
                if (noResultsDiv) {
                    noResultsDiv.classList.remove('hidden');
                    noResultsDiv.querySelector('h3').textContent = 'No se Encontraron Partidos';
                    noResultsDiv.querySelector('p').textContent = 'Intenta con otra fecha o cambia el filtro de nacionalidad.';
                }
                return;
            }

            const games = data.dates[0].games;
            displayGames(games, selectedNationality);

        } catch (error) {
            console.error('Error searching games:', error);
            if (loadingDiv) loadingDiv.classList.add('hidden');
            if (noResultsDiv) {
                noResultsDiv.classList.remove('hidden');
                noResultsDiv.querySelector('h3').textContent = 'Error al Cargar Datos';
                noResultsDiv.querySelector('p').textContent = `Hubo un problema al conectar con la API (${error.message}). Inténtalo de nuevo.`;
            }
        }
    }

    /**
     * Displays the list of games and triggers fetching player nationality data.
     * Shows final score immediately if available.
     * @param {Array} games - Array of game objects from the API.
     * @param {string} selectedNationality - The selected nationality code from the dropdown (e.g., "VEN").
     */
    function displayGames(games, selectedNationality) {
        const container = document.getElementById('games-container');
        const resultsSection = document.getElementById('results-section');
        const resultsCountDiv = document.getElementById('results-count');
        const noResultsDiv = document.getElementById('no-results');

        if (!container || !resultsSection || !resultsCountDiv || !noResultsDiv) {
            console.error("One or more result container elements not found");
            return;
        }
        container.innerHTML = '';
        resultsCountDiv.textContent = `${games.length} Partido${games.length !== 1 ? 's' : ''}`;

        if (games.length === 0) {
            noResultsDiv.classList.remove('hidden');
            resultsSection.classList.add('hidden');
            return;
        }

        games.forEach(game => {
            const gameCard = document.createElement('div');
            gameCard.id = `game-${game.gamePk}`;
            const abstractState = game.status?.abstractGameState; // Final, Live, Preview
            const borderColor = abstractState === 'Live' ? 'border-mlb-red' : 'border-mlb-blue';
            gameCard.className = `bg-gray-800 rounded-xl shadow-lg-dark overflow-hidden border-l-4 ${borderColor} hover:shadow-xl-dark transition duration-300 flex flex-col border border-gray-700`;

            // Game details
            const homeTeam = game.teams.home?.team?.name ?? 'Equipo Local';
            const awayTeam = game.teams.away?.team?.name ?? 'Equipo Visitante';
            const stadium = game.venue?.name ?? 'Estadio Desconocido';
            const awayPitcherName = game.teams.away?.probablePitcher?.fullName ?? 'Por Determinar';
            const homePitcherName = game.teams.home?.probablePitcher?.fullName ?? 'Por Determinar';
            const awayPitcherId = game.teams.away?.probablePitcher?.id ?? 0;
            const homePitcherId = game.teams.home?.probablePitcher?.id ?? 0;
            const gameState = game.status?.detailedState || 'Programado';
            const boxscoreUrl = `https://www.mlb.com/gameday/${game.gamePk}`;

            // Time formatting
            let gameTime = 'Hora no disp.';
            let timeZoneUsed = '';
            try { /* ... Time formatting logic ... */
                 const gameDate = new Date(game.gameDate);
                 gameTime = gameDate.toLocaleTimeString(navigator.language || 'es-ES', { hour: '2-digit', minute: '2-digit' });
                 try {
                   const timeString = gameDate.toLocaleTimeString(navigator.language || 'es-ES', {timeZoneName:'short'});
                   const tzMatch = timeString.match(/\b([A-Z]{2,})\b/);
                   timeZoneUsed = tzMatch ? tzMatch[1] : '';
                 } catch(tzError){ /* Ignore timezone error */ }
            } catch(e) { /* ... Fallback time formatting ... */
                 console.warn(`Could not format local date ${game.gameDate}: ${e}`);
                 try {
                   gameTime = `${new Date(game.gameDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' })}`;
                   timeZoneUsed = 'ET';
                 } catch (e2) { /* Give up */ }
            }

            // Initial Score Display Logic
            let initialScoreHtml = '';
            // Check if game is Final and initial linescore data is available
            if (abstractState === 'Final' && game.linescore?.teams) {
                const awayRuns = game.linescore.teams.away?.runs ?? '-';
                const homeRuns = game.linescore.teams.home?.runs ?? '-';
                initialScoreHtml = `
                    <div class="flex justify-end items-center space-x-2 mt-2">
                         <span class="text-xs text-gray-400">${awayTeam.split(' ').pop()}</span>
                         <span class="text-lg font-semibold text-gray-200">${awayRuns}</span>
                         <span class="text-gray-500">-</span>
                         <span class="text-lg font-semibold text-gray-200">${homeRuns}</span>
                         <span class="text-xs text-gray-400">${homeTeam.split(' ').pop()}</span>
                    </div>
                `;
            }


            // Set the inner HTML of the game card
            gameCard.innerHTML = `
                <div class="p-5 flex-grow">
                    <div class="flex justify-between items-start mb-2 gap-2">
                        <div class="flex-1 min-w-0">
                            <div class="text-xs sm:text-sm text-gray-400 mb-1 flex items-center flex-wrap gap-x-2 gap-y-1">
                                <span class="whitespace-nowrap"><i class="far fa-clock mr-1 text-mlb-red opacity-90"></i> ${gameTime} ${timeZoneUsed}</span>
                                <span class="hidden sm:inline text-gray-600">•</span>
                                <span class="whitespace-nowrap truncate" title="${stadium}"><i class="fas fa-map-marker-alt mr-1 text-mlb-red opacity-90"></i> ${stadium}</span>
                            </div>
                            <h3 class="text-lg md:text-xl font-bold text-gray-100 leading-tight font-oswald truncate" title="${awayTeam} @ ${homeTeam}">
                                ${awayTeam} <span class="font-normal text-gray-500 mx-1">@</span> ${homeTeam}
                            </h3>
                            <p class="text-xs text-gray-400 mt-1 truncate pitcher-line" title="P: ${awayPitcherName} vs ${homePitcherName}">
                                <i class="fas fa-user-friends mr-1 text-gray-500"></i>
                                P: <span class="pitcher" data-pitcher-id="${awayPitcherId}">${awayPitcherName}</span> vs <span class="pitcher" data-pitcher-id="${homePitcherId}">${homePitcherName}</span>
                            </p>
                        </div>
                        <div class="flex flex-col items-end space-y-1">
                            <div class="bg-mlb-blue text-white px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap shadow-sm flex-shrink-0">
                                ${gameState}
                            </div>
                            <a href="${boxscoreUrl}" target="_blank" rel="noopener noreferrer" title="Ver Boxscore en MLB.com" class="text-gray-500 hover:text-blue-400 transition-colors duration-150">
                                <i class="fas fa-chart-bar text-base"></i>
                            </a>
                        </div>
                    </div>
                    <div id="score-info-${game.gamePk}" class="score-info mt-2">
                        ${initialScoreHtml}
                        ${abstractState === 'Live' ? '<div class="text-center text-xs text-gray-500 animate-pulse">Cargando marcador...</div>' : ''}
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
            container.appendChild(gameCard);
        });

        resultsSection.classList.remove('hidden');

        // Trigger fetching of detailed player and live score data
        if (selectedNationality) {
            fetchAndDisplayPlayersByNationality(games, selectedNationality);
        } else {
            fetchAllNationalities(games);
        }
    }

    /**
     * Fetches detailed player data AND live game data (linescore, status) for a game.
     * @param {string|number} gamePk - The primary key (ID) of the game.
     * @returns {Promise<object|null>} - A promise resolving to an object { players, linescore, gameState } or null on error.
     */
    async function fetchPlayerData(gamePk) {
        try {
            const liveFeedUrl = `/api/gamefeed/${gamePk}`;
            const response = await fetch(liveFeedUrl);
            if (!response.ok) throw new Error(`Error fetching live feed for game ${gamePk} (${response.status})`);
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            // Extract Players
            const awayPlayers = data?.liveData?.boxscore?.teams?.away?.players ?? {};
            const homePlayers = data?.liveData?.boxscore?.teams?.home?.players ?? {};
            const playerIds = [...Object.keys(awayPlayers), ...Object.keys(homePlayers)]
                              .map(id => id.replace('ID', ''));

            let playersData = [];
            if (playerIds.length > 0) {
                const MAX_BATCH_SIZE = 40;
                for (let i = 0; i < playerIds.length; i += MAX_BATCH_SIZE) {
                    const batchIds = playerIds.slice(i, i + MAX_BATCH_SIZE);
                    const peopleUrl = `/api/people?personIds=${batchIds.join(',')}`;
                    try {
                         const peopleResponse = await fetch(peopleUrl);
                         if (!peopleResponse.ok) throw new Error(`Error fetching player details batch ${i / MAX_BATCH_SIZE} (${peopleResponse.status})`);
                         const peopleData = await peopleResponse.json();
                         if (peopleData.error) throw new Error(peopleData.error);
                         if (peopleData.people) {
                             playersData = playersData.concat(peopleData.people);
                         }
                    } catch (batchError) {
                        console.error(`Error fetching player batch ${Math.floor(i / MAX_BATCH_SIZE)} for game ${gamePk}:`, batchError);
                    }
                }
            } else {
                 console.warn(`No player IDs found in boxscore for game ${gamePk}`);
            }

            // Extract Linescore and GameState as well
            const linescore = data?.liveData?.linescore ?? null;
            const gameState = data?.gameData?.status ?? null;

            return { players: playersData, linescore, gameState }; // Return object

        } catch (error) {
            console.error(`Error fetching player/live data for game ${gamePk}:`, error);
            return null; // Return null on failure
        }
    }

    /**
     * Updates the score display section of a game card.
     * @param {string|number} gamePk - The game's primary key.
     * @param {object|null} linescore - The linescore object from the API.
     * @param {object|null} gameState - The status object from the API.
     */
    function updateScoreDisplay(gamePk, linescore, gameState) {
        const scoreContainer = document.getElementById(`score-info-${gamePk}`);
        if (!scoreContainer || !gameState || !linescore) {
            // If container or data is missing, ensure it's empty
            if (scoreContainer) scoreContainer.innerHTML = '';
            return;
        }

        const abstractState = gameState.abstractGameState;

        // Only update display for Live games here (Final is handled initially)
        if (abstractState === 'Live') {
            const awayRuns = linescore.teams?.away?.runs ?? '-';
            const homeRuns = linescore.teams.home?.runs ?? '-';
            const awayHits = linescore.teams?.away?.hits ?? '-';
            const homeHits = linescore.teams.home?.hits ?? '-';
            const awayErrors = linescore.teams?.away?.errors ?? '-';
            const homeErrors = linescore.teams.home?.errors ?? '-';
            const inning = linescore.currentInningOrdinal ?? '';
            const inningState = linescore.inningState ?? ''; // "Top", "Bottom", "Middle", "End"
            const isTop = linescore.isTopInning ?? (inningState === 'Top' || inningState === 'Middle');

            // Simple table-like display for R/H/E
            scoreContainer.innerHTML = `
                <div class="text-xs border border-gray-700 rounded p-1.5 bg-gray-900 bg-opacity-50">
                    <div class="flex justify-between items-center mb-1">
                        <span class="font-semibold ${isTop ? 'text-yellow-400' : ''}">${isTop ? '▲' : '▼'} ${inning}</span>
                        <div class="flex space-x-2 text-gray-400">
                            <span>R</span><span>H</span><span>E</span>
                        </div>
                    </div>
                    <div class="flex justify-between items-center text-sm mb-0.5">
                        <span class="w-1/2 truncate" title="${linescore.teams?.away?.team?.name ?? ''}">${linescore.teams?.away?.team?.name ?? 'Visitante'}</span>
                        <div class="flex space-x-2 font-medium text-gray-200">
                            <span class="w-4 text-center">${awayRuns}</span>
                            <span class="w-4 text-center">${awayHits}</span>
                            <span class="w-4 text-center">${awayErrors}</span>
                        </div>
                    </div>
                    <div class="flex justify-between items-center text-sm">
                         <span class="w-1/2 truncate" title="${linescore.teams?.home?.team?.name ?? ''}">${linescore.teams?.home?.team?.name ?? 'Local'}</span>
                        <div class="flex space-x-2 font-medium text-gray-200">
                            <span class="w-4 text-center">${homeRuns}</span>
                            <span class="w-4 text-center">${homeHits}</span>
                            <span class="w-4 text-center">${homeErrors}</span>
                        </div>
                    </div>
                </div>
            `;
        } else if (abstractState === 'Final') {
            // If initialScoreHtml wasn't available initially, display it now.
            if (!scoreContainer.innerHTML.trim()) { // Only update if it was empty
                 const awayRuns = linescore.teams?.away?.runs ?? '-';
                 const homeRuns = linescore.teams.home?.runs ?? '-';
                 scoreContainer.innerHTML = `
                    <div class="flex justify-end items-center space-x-2 mt-2">
                         <span class="text-xs text-gray-400">${linescore.teams?.away?.team?.name.split(' ').pop() ?? ''}</span>
                         <span class="text-lg font-semibold text-gray-200">${awayRuns}</span>
                         <span class="text-gray-500">-</span>
                         <span class="text-lg font-semibold text-gray-200">${homeRuns}</span>
                         <span class="text-xs text-gray-400">${linescore.teams?.home?.team?.name.split(' ').pop() ?? ''}</span>
                    </div>
                 `;
            }
        }
        else {
            // For Preview, Scheduled, etc., ensure the score area is empty
            scoreContainer.innerHTML = '';
        }
    }


    /**
     * Fetches player/game data and updates UI for a specific nationality filter.
     * @param {Array} games - Array of game objects from the initial schedule call.
     * @param {string} selectedNationalityCode - The code of the selected nationality (e.g., "VEN").
     */
    async function fetchAndDisplayPlayersByNationality(games, selectedNationalityCode) {
        const selectedCountry = nationalityCodeToCountry[selectedNationalityCode];
         if (!selectedCountry && selectedNationalityCode !== 'USA') {
             console.warn(`Nationality code not mapped: ${selectedNationalityCode}`);
             return;
         }

        await Promise.allSettled(games.map(async (game) => {
            const gamePk = game.gamePk;
            const gameCard = document.getElementById(`game-${gamePk}`);
            const nationalityInfoContainer = gameCard?.querySelector(`#nationality-info-${gamePk}`);
            const nationalitiesListContainer = gameCard?.querySelector(`#nationalities-list-${gamePk}`);

            if (!gameCard || !nationalityInfoContainer || !nationalitiesListContainer) return;

            // Clear previous states and show loading for nationality list
            nationalitiesListContainer.innerHTML = '<span class="nationality-placeholder px-2 py-0.5 text-xs rounded-full bg-gray-600 text-gray-400 animate-pulse">Buscando...</span>';
            nationalityInfoContainer.innerHTML = '';
            gameCard.querySelectorAll('.pitcher-highlight').forEach(el => el.classList.remove('pitcher-highlight'));

            // Fetch detailed player data AND live game data
            const fetchedData = await fetchPlayerData(gamePk);
            if (!fetchedData) return; // Skip if fetch failed
            const { players, linescore, gameState } = fetchedData;

            // --- Update Score Display ---
            updateScoreDisplay(gamePk, linescore, gameState); // Call the new function

            // --- Process and Display Players ---
            const playersFromSelectedNationality = players.filter(player => {
                const birthCountry = player.birthCountry;
                return (birthCountry && selectedCountry && birthCountry === selectedCountry) ||
                       (birthCountry && countryToNationalityCode[birthCountry] === selectedNationalityCode);
            });

            // Display the filtered players with images and links
            if (playersFromSelectedNationality.length > 0) {
                const getPlaceholderUrl = (initials) => `https://placehold.co/40x40/4b5563/e5e7eb?text=${initials}&font=oswald`;
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
                                const imageUrl = `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic_headshot.png/w_80,h_80,c_fill,g_face,q_auto:best/v1/people/${p.id}/headshot/67/current`;
                                const nameParts = p.fullName?.split(' ') || ['?'];
                                const initials = (nameParts[0]?.[0] || '') + (nameParts[nameParts.length - 1]?.[0] || '');
                                const placeholderUrl = getPlaceholderUrl(initials.toUpperCase() || 'NA');
                                const fallbackScript = `this.onerror=null; this.src='${placeholderUrl}';`;
                                const playerProfileUrl = `https://www.mlb.com/player/${p.id}`;
                                return `
                                <li class="flex items-center justify-between text-sm">
                                    <div class="flex items-center space-x-2 min-w-0">
                                        <img src="${imageUrl}" alt="[Imagen de ${p.fullName}]" class="w-8 h-8 rounded-full player-img border border-gray-500 flex-shrink-0" onerror="${fallbackScript}" loading="lazy">
                                        <a href="${playerProfileUrl}" target="_blank" rel="noopener noreferrer" class="text-gray-200 hover:text-blue-300 hover:underline truncate" title="${p.fullName} (Ver Perfil)">
                                            ${p.fullName}
                                        </a>
                                    </div>
                                    <span class="text-gray-300 bg-gray-600 px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0">${p.primaryPosition?.abbreviation ?? 'N/A'}</span>
                                </li>
                                `
                            }).join('')}
                        </ul>
                    </div>
                `;
            } else {
                nationalityInfoContainer.innerHTML = `
                    <div class="p-2 bg-gray-700 rounded-lg border border-gray-600 text-center">
                        <p class="text-xs text-gray-500 italic">No hay jugadores de ${getNationalityName(selectedNationalityCode)} en este partido.</p>
                    </div>
                `;
            }

            // --- Highlight Pitchers ---
            const awayPitcherId = game.teams.away?.probablePitcher?.id; // Get ID from initial game data
            const homePitcherId = game.teams.home?.probablePitcher?.id;
            const awayPitcherObj = awayPitcherId ? players.find(p => p.id == awayPitcherId) : null; // Find full object in fetched player data
            const homePitcherObj = homePitcherId ? players.find(p => p.id == homePitcherId) : null;

            if (awayPitcherObj) {
                const awayPitcherNationalityCode = awayPitcherObj.birthCountry ? countryToNationalityCode[awayPitcherObj.birthCountry] : null;
                if (awayPitcherNationalityCode && awayPitcherNationalityCode === selectedNationalityCode) {
                    gameCard.querySelector(`.pitcher[data-pitcher-id="${awayPitcherId}"]`)?.classList.add('pitcher-highlight');
                }
            }
            if (homePitcherObj) {
                const homePitcherNationalityCode = homePitcherObj.birthCountry ? countryToNationalityCode[homePitcherObj.birthCountry] : null;
                if (homePitcherNationalityCode && homePitcherNationalityCode === selectedNationalityCode) {
                     gameCard.querySelector(`.pitcher[data-pitcher-id="${homePitcherId}"]`)?.classList.add('pitcher-highlight');
                }
            }

            // Update the list of all nationalities in the footer
            updateNationalitiesList(players, nationalitiesListContainer, selectedNationalityCode);
        })); // End Promise.allSettled map
    }

    /**
     * Fetches player/game data and updates UI for all games (no nationality filter).
     * @param {Array} games - Array of game objects from the initial schedule call.
     */
     async function fetchAllNationalities(games) {
         await Promise.allSettled(games.map(async (game) => {
            const gamePk = game.gamePk;
            const gameCard = document.getElementById(`game-${gamePk}`);
            const nationalityInfoContainer = gameCard?.querySelector(`#nationality-info-${gamePk}`);
            const nationalitiesListContainer = gameCard?.querySelector(`#nationalities-list-${gamePk}`);

            if (!gameCard || !nationalitiesListContainer) return;

            // Clear previous states and show loading
            nationalitiesListContainer.innerHTML = '<span class="nationality-placeholder px-2 py-0.5 text-xs rounded-full bg-gray-600 text-gray-400 animate-pulse">Buscando...</span>';
            if(nationalityInfoContainer) nationalityInfoContainer.innerHTML = '';
            gameCard.querySelectorAll('.pitcher-highlight').forEach(el => el.classList.remove('pitcher-highlight'));


            // Fetch detailed player data AND live game data
            const fetchedData = await fetchPlayerData(gamePk);
             if (!fetchedData) return; // Skip if fetch failed
            const { players, linescore, gameState } = fetchedData;

            // --- Update Score Display ---
            updateScoreDisplay(gamePk, linescore, gameState); // Call the new function

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
         if (!containerElement) return;
         containerElement.innerHTML = '';

         const nationalitiesInGame = {};
         players.forEach(player => {
             const country = player.birthCountry;
             if (country) {
                 const code = countryToNationalityCode[country] || null;
                 if (code) {
                     nationalitiesInGame[code] = (nationalitiesInGame[code] || 0) + 1;
                 } else {
                     console.warn(`Unmapped birth country: ${country} for player ${player.fullName}`);
                 }
             }
         });

         if (Object.keys(nationalitiesInGame).length > 0) {
             containerElement.innerHTML = Object.entries(nationalitiesInGame)
                 .sort((a, b) => b[1] - a[1])
                 .map(([code, count]) => {
                     const isHighlighted = code === highlightedCode;
                     const tagClasses = isHighlighted
                       ? 'bg-mlb-blue text-white shadow-sm'
                       : 'bg-gray-600 text-gray-200 hover:bg-gray-500';
                     const fontWeight = isHighlighted ? 'font-semibold' : 'font-normal';
                     return `
                        <span class="px-2 py-0.5 text-[11px] rounded-full ${tagClasses} ${fontWeight} transition-colors duration-150">
                            ${getNationalityName(code)} (${count})
                        </span>
                     `;
                 }).join('');
         } else {
             containerElement.innerHTML = `<span class="text-xs text-gray-500 italic">Nacionalidades no disponibles.</span>`;
         }
    }

    /**
     * Returns a display-friendly name for a given nationality code.
     * @param {string} code - The nationality code (e.g., "VEN").
     * @returns {string} - The display name (e.g., "Venezuela") or the code itself if not found.
     */
    function getNationalityName(code) {
        const nationalitiesMap = new Map([
            ["USA", "EE.UU."], ["DOM", "Rep. Dominicana"], ["VEN", "Venezuela"],
            ["PUR", "Puerto Rico"], ["CUB", "Cuba"], ["MEX", "México"],
            ["JPN", "Japón"], ["KOR", "Corea"], ["CAN", "Canadá"],
            ["PAN", "Panamá"], ["COL", "Colombia"], ["CUR", "Curazao"],
            ["ARU", "Aruba"], ["NED", "Países Bajos"], ["AUS", "Australia"],
            ["TWN", "Taiwán"], ["NIC", "Nicaragua"]
        ]);
        return nationalitiesMap.get(code) || code;
    }

    // --- Initial Load ---
    searchGames();
}); // End DOMContentLoaded listener
