const downloadButton = document.querySelector(".download-video");
const watchButton = document.querySelector(".watch-video");
const offlineDiv = document.querySelector(".offline");
const video = document.querySelector("video");
const message = document.querySelector(".message");

let db = null;
let videoArrayBuffer = null;
let objectStore = null;

if ("serviceWorker" in navigator) {
  console.log("CLIENT: service worker registration in progress.");
  navigator.serviceWorker.register("service-worker.js").then(
    function () {
      console.log("CLIENT: service worker registration complete.");
    },
    function () {
      console.log("CLIENT: service worker registration failure.");
    }
  );
} else {
  console.log("CLIENT: service worker is not supported.");
}

downloadButton.addEventListener("click", async (event) => {
  event.preventDefault();

  console.log("Downloading video");

  const response = await fetch(
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4"
  );
  const arrayBuffer = await response.arrayBuffer();

  console.log("Downloaded video");

  await saveArrayBufferToIndexedDB(arrayBuffer);

  handleMessage(true);

  console.log("Saved video");
});

watchButton.addEventListener("click", async (event) => {
  event.preventDefault();

  showVideo();
});

const handleOffline = async () => {
  getDownloadedVideo();

  offlineDiv.style.display = "block";
  downloadButton.style.display = "none";
  watchButton.style.display = "block";
};

window.addEventListener("offline", handleOffline);

if (!window.navigator.onLine) {
  handleOffline();
} else {
  offlineDiv.style.display = "none";
  watchButton.style.display = "none";
  video.style.display = "none";
}

const handleMessage = (hasDownloaded) => {
  message.textContent = !hasDownloaded
    ? "You haven't downloaded the video yet. Click the button below to download."
    : window.navigator.onLine
    ? "Video is downloaded, turn off your internet to watch it."
    : "";

  downloadButton.style.display = !hasDownloaded ? "block" : "none";
};

getDownloadedVideo().then(handleMessage);

function getDownloadedVideo() {
  return new Promise(async (resolve, reject) => {
    await initDB();

    const request = objectStore.get(1);

    request.onsuccess = (event) => {
      videoArrayBuffer = event.target.result;

      resolve(!!videoArrayBuffer);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

async function saveArrayBufferToIndexedDB(arrayBuffer) {
  await initDB();

  console.log("init db");

  if (!db) {
    return alert("DB is not initialized");
  }

  const transaction = db.transaction("example-video", "readwrite");
  const objectStore = transaction.objectStore("example-video");

  // Create a new record with the array buffer
  const request = objectStore.add(arrayBuffer, 1);

  // Handle record addition success
  request.onsuccess = (event) => {
    console.log("Success", event);
  };

  // Handle record addition error
  request.onerror = (event) => {
    console.error(event.target.error);
  };
}

function initDB() {
  return new Promise((resolve) => {
    if (db) {
      resolve(db);

      return;
    }

    const request = indexedDB.open("example-database", 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      db.createObjectStore("example-video");
    };

    request.onsuccess = (event) => {
      db = event.target.result;

      const transaction = db.transaction("example-video", "readwrite");
      objectStore = transaction.objectStore("example-video");

      resolve(db);
    };

    // Handle database opening error
    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

initDB();

async function showVideo() {
  if (!videoArrayBuffer) {
    return alert(
      "Failed to get video array buffer. Have you downloaded the video?"
    );
  }

  const blob = new Blob([videoArrayBuffer], {
    type: "video/mp4",
  });
  const url = URL.createObjectURL(blob);

  video.src = url;
  video.style.display = "block";
}
