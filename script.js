
console.log("Lets write JavaScript");

let currentSong = new Audio();
let songs = [];
let currFolder = "";
let currentTrack = "";

// Convert seconds into MM:SS format
function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return "00:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    const formattedMinutes = String(minutes).padStart(2, "0");
    const formattedSeconds = String(remainingSeconds).padStart(2, "0");

    return `${formattedMinutes}:${formattedSeconds}`;
}


// Convert folder path into URL-safe path
function encodeFolderPath(folder) {
    return folder.split("/").map(encodeURIComponent).join("/");
}


// Get songs from songs.json
async function getSongs(folder) {
    currFolder = folder;

    let folderPath = encodeFolderPath(folder);

    try {
        let response = await fetch(`/${folderPath}/songs.json`);

        if (!response.ok) {
            throw new Error("songs.json not found");
        }

        songs = await response.json();

        console.log("Songs found:", songs);

        // Show songs in the library
        let songUL = document
            .querySelector(".songList")
            .getElementsByTagName("ul")[0];

        songUL.innerHTML = "";

        for (const song of songs) {
            songUL.innerHTML += `
                <li>
                    <img class="invert" width="34" src="img/music.svg" alt="">

                    <div class="info">
                        <div>${song.replace(/128 Kbps/gi, "").replace(/\.mp3$/i, "").trim()}</div>
                        <div>Sanyam</div>
                    </div>

                    <div class="playnow">
                        <span>Play Now</span>
                        <img class="invert" src="img/play.svg" alt="">
                    </div>
                </li>
            `;
        }

        // Play selected song from library
        Array.from(songUL.getElementsByTagName("li")).forEach((e, index) => {
            e.addEventListener("click", () => {
                playMusic(songs[index]);
            });
        });

        return songs;

    } catch (error) {
        console.error("Error loading songs:", error);
        songs = [];
        return songs;
    }
}


// Play music
const playMusic = (track, pause = false) => {

    currentTrack = track;

    let folderPath = encodeFolderPath(currFolder);

    currentSong.src = `/${folderPath}/${encodeURIComponent(track)}`;

    currentSong.load();

    document.querySelector(".songinfo").textContent = track;
    document.querySelector(".songtime").textContent = "00:00 / 00:00";

    if (!pause) {
        currentSong.play()
            .then(() => {
                document.getElementById("play").src = "img/pause.svg";
            })
            .catch(error => {
                console.error("Playback error:", error);
            });
    } else {
        document.getElementById("play").src = "img/play.svg";
    }
};


// Display albums using albums.json
async function displayAlbums() {

    console.log("Displaying albums");

    try {

        // Fetch album names
        let response = await fetch("/songs/albums.json");

        if (!response.ok) {
            throw new Error("albums.json not found");
        }

        let albums = await response.json();

        let cardContainer = document.querySelector(".cardContainer");

        cardContainer.innerHTML = "";

        // Load album information
        for (const folder of albums) {

            try {

                let folderPath = encodeURIComponent(folder);

                let response = await fetch(
                    `/songs/${folderPath}/info.json`
                );

                if (!response.ok) {
                    console.log("Album info not found:", folder);
                    continue;
                }

                let info = await response.json();

                cardContainer.innerHTML += `
                    <div data-folder="${folder}" class="card">

                        <div class="play">
                            <svg width="16" height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg">

                                <path d="M5 20V4L19 12L5 20Z"
                                    stroke="#141B34"
                                    fill="#000"
                                    stroke-width="1.5"
                                    stroke-linejoin="round" />

                            </svg>
                        </div>

                        <img src="/songs/${folderPath}/cover.jpg" alt="">

                        <h2>${info.title}</h2>

                        <p>${info.description}</p>

                    </div>
                `;

            } catch (error) {
                console.error("Album loading error:", folder, error);
            }
        }


        // Attach click events to album cards
        Array.from(document.querySelectorAll(".card")).forEach(e => {

            e.addEventListener("click", async () => {

                console.log("Fetching songs from:", e.dataset.folder);

                let loadedSongs = await getSongs(
                    `songs/${e.dataset.folder}`
                );

                if (loadedSongs.length > 0) {
                    playMusic(loadedSongs[0]);
                }

            });

        });

    } catch (error) {
        console.error("Error displaying albums:", error);
    }
}



// Load every song from every album
async function loadAllSongs() {

    if (searchCatalogLoaded) {
        return;
    }

    const results = document.getElementById("searchResults");

    results.textContent = "Loading all songs...";

    try {

        // Get all album folder names
        const response = await fetch("/songs/albums.json");

        if (!response.ok) {
            throw new Error("Could not load albums.json");
        }

        const albums = await response.json();

        allSongs = [];

        // Fetch songs.json from every album
        const albumPromises = albums.map(async (folder) => {

            const folderPath = `songs/${folder}`;

            const encodedPath = encodeFolderPath(folderPath);

            try {

                const response = await fetch(
                    `/${encodedPath}/songs.json`
                );

                if (!response.ok) {
                    console.error("Could not load:", folder);
                    return;
                }

                const albumSongs = await response.json();

                if (!Array.isArray(albumSongs)) {
                    return;
                }

                albumSongs.forEach(song => {

                    allSongs.push({
                        name: song,
                        folder: folder,
                        folderPath: folderPath,
                        albumSongs: albumSongs
                    });

                });

            } catch (error) {
                console.error("Album error:", folder, error);
            }

        });

        await Promise.all(albumPromises);

        searchCatalogLoaded = true;

        console.log("All songs loaded:", allSongs);

        // Show all songs immediately
        renderSearchResults("");

    } catch (error) {

        console.error("Search loading error:", error);

        results.textContent = "Unable to load songs.";

    }

}


// Display search results
function renderSearchResults(query = "") {

    const results = document.getElementById("searchResults");

    const title = document.getElementById("searchTitle");

    results.innerHTML = "";

    const searchText = query.trim().toLowerCase();

    // Search both song name and album name
    const filteredSongs = allSongs.filter(song => {

        return (
            song.name.toLowerCase().includes(searchText) ||
            song.folder.toLowerCase().includes(searchText)
        );

    });

    title.textContent = searchText
        ? `Search Results (${filteredSongs.length})`
        : `All Songs (${allSongs.length})`;

    if (filteredSongs.length === 0) {

        const message = document.createElement("p");

        message.className = "no-results";

        message.textContent = "No songs found. Try another search.";

        results.appendChild(message);

        return;
    }

    // Create song rows
    filteredSongs.forEach(song => {

        const songRow = document.createElement("div");

        songRow.className = "search-result";

        const info = document.createElement("div");

        info.className = "result-info";

        const songName = document.createElement("span");

        songName.className = "result-name";

        songName.textContent = song.name.replace(/128 Kbps/gi, "").replace(/\.mp3$/i, "").trim();

        const albumName = document.createElement("span");

        albumName.className = "result-album";

        albumName.textContent = song.folder;

        const playIcon = document.createElement("img");

        playIcon.className = "result-play invert";

        playIcon.src = "img/play.svg";

        playIcon.alt = "Play";

        info.appendChild(songName);

        info.appendChild(albumName);

        songRow.appendChild(info);

        songRow.appendChild(playIcon);

        // Play selected song
        songRow.addEventListener("click", () => {

            // Set the correct album playlist
            songs = song.albumSongs;

            currFolder = song.folderPath;

            // Play selected track
            playMusic(song.name);

        });

        results.appendChild(songRow);

    });

}


// Search input functionality
function setupSearch() {

    const searchInput = document.getElementById("searchInput");

    searchInput.addEventListener("input", () => {

        renderSearchResults(searchInput.value);

    });

}


// Switch between Home and Search
function setupNavigation() {

    const homeNav = document.getElementById("homeNav");

    const searchNav = document.getElementById("searchNav");

const homePage = document.querySelector(".home-content");
    const searchPage = document.querySelector(".searchPage");


    // Home button
    homeNav.addEventListener("click", () => {

        homePage.classList.remove("hidden");

        searchPage.classList.add("hidden");

    });


    // Search button
    searchNav.addEventListener("click", async () => {

        homePage.classList.add("hidden");

        searchPage.classList.remove("hidden");

        // Load all songs on first click
        await loadAllSongs();

        // Show all songs even when search is empty
        renderSearchResults(
            document.getElementById("searchInput").value
        );

        document.getElementById("searchInput").focus();

    });

}

// Main function
async function main() {

    // Load default playlist
    await getSongs("songs/ncs");

    // Load first song without autoplay
    if (songs.length > 0) {
        playMusic(songs[0], true);
    }

    // Display albums
    await displayAlbums();
    // Setup search functionality
setupSearch();

// Setup Home and Search navigation
setupNavigation();


    // Play / Pause button
    const playButton = document.getElementById("play");

    playButton.addEventListener("click", () => {

        if (currentSong.paused) {

            currentSong.play()
                .then(() => {
                    playButton.src = "img/pause.svg";
                })
                .catch(error => console.error("Playback error:", error));

        } else {

            currentSong.pause();
            playButton.src = "img/play.svg";

        }

    });



    // Update song time and seekbar
    currentSong.addEventListener("timeupdate", () => {

        document.querySelector(".songtime").textContent =
            `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`;

        let percent = 0;

        if (Number.isFinite(currentSong.duration) && currentSong.duration > 0) {
            percent = (currentSong.currentTime / currentSong.duration) * 100;
        }

        document.querySelector(".circle").style.left = percent + "%";

    });



    // Automatically play next song when current song ends
    currentSong.addEventListener("ended", () => {

        let index = songs.indexOf(currentTrack);

        if (index !== -1 && index < songs.length - 1) {

            playMusic(songs[index + 1]);

        } else {

            playButton.src = "img/play.svg";

        }

    });



    // Seekbar functionality
    document.querySelector(".seekbar").addEventListener("click", (e) => {

        if (!Number.isFinite(currentSong.duration) || currentSong.duration <= 0) {
            return;
        }

        let rect = e.currentTarget.getBoundingClientRect();

        let percent = ((e.clientX - rect.left) / rect.width) * 100;

        percent = Math.max(0, Math.min(100, percent));

        document.querySelector(".circle").style.left = percent + "%";

        currentSong.currentTime = (currentSong.duration * percent) / 100;

    });



    // Hamburger menu
    document.querySelector(".hamburger").addEventListener("click", () => {

        document.querySelector(".left").style.left = "0";

    });



    // Close menu
    document.querySelector(".close").addEventListener("click", () => {

        document.querySelector(".left").style.left = "-120%";

    });



    // Previous song
    document.getElementById("previous").addEventListener("click", () => {

        let index = songs.indexOf(currentTrack);

        if (index > 0) {

            playMusic(songs[index - 1]);

        }

    });



    // Next song
    document.getElementById("next").addEventListener("click", () => {

        let index = songs.indexOf(currentTrack);

        if (index !== -1 && index < songs.length - 1) {

            playMusic(songs[index + 1]);

        }

    });



    // Volume control
    const volumeInput = document
        .querySelector(".range")
        .getElementsByTagName("input")[0];

    const volumeIcon = document.querySelector(".volume>img");

    volumeInput.addEventListener("change", (e) => {

        let volume = Number(e.target.value) / 100;

        currentSong.volume = volume;

        if (volume > 0) {

            volumeIcon.src = "img/volume.svg";

        } else {

            volumeIcon.src = "img/mute.svg";

        }

    });



    // Mute / Unmute
    volumeIcon.addEventListener("click", () => {

        if (currentSong.volume > 0) {

            currentSong.volume = 0;

            volumeInput.value = 0;

            volumeIcon.src = "img/mute.svg";

        } else {

            currentSong.volume = 0.1;

            volumeInput.value = 10;

            volumeIcon.src = "img/volume.svg";

        }

    });

}


// Start application
main();
