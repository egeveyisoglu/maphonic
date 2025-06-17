import { pinsData } from './pinsData.js'; // pinsData'yı içe aktar

// Mapbox initialization
mapboxgl.accessToken = 'pk.eyJ1IjoiZWdlMWZkIiwiYSI6ImNtYjVqd2NybDI3MWkybXIwMDE5aXMzbHEifQ.q6fhsHdsZ08wrzi-x6zwIA';
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/outdoors-v12',
  center: [0, 0],
  zoom: 1
});

function createPinElement() {
  const el = document.createElement('div');
  el.className = 'custom-pin';
  el.style.backgroundImage = 'url(assets/explore-map/custom-pin/pin.svg)';
  return el;
}

function createEndPinElement() {
  const el = document.createElement('div');
  el.className = 'end-pin';
  return el;
}

const markers = {};

pinsData.forEach(pin => {
  const marker = new mapboxgl.Marker({ element: createPinElement(), offset: [0, -20] })
    .setLngLat(pin.coordinates)
    .setPopup(new mapboxgl.Popup().setText(pin.title).on('open', () => {
      const closeBtn = document.querySelector('.mapboxgl-popup-close-button');
      if (closeBtn) closeBtn.removeAttribute('aria-hidden');
    }))
    .addTo(map);
  markers[pin.id] = marker;
  marker.getElement().addEventListener('click', () => {
    if (window.innerWidth <= 576 && map.getZoom()) {
      map.flyTo({
        center: pin.coordinates,
        zoom: 15,
        essential: true
      });
      map.once('moveend', () => {
        showInfoPanel(pin);
      });
    } else {
      showInfoPanel(pin);
      map.flyTo({
        center: pin.coordinates,
        zoom: 15,
        essential: true
      });
    }
  });
});

pinsData.forEach(pin => {
  if (pin.endPoint) {
    const popupContent = `
      <div>
        <p>${pin.title} Endpoint</p>
        <a href="#" class="go-to-start" data-pin-id="${pin.id}" style="color: #1e90ff; text-decoration: underline;">Go to Starting Point</a>
      </div>
    `;
    const endMarker = new mapboxgl.Marker({ element: createEndPinElement() })
      .setLngLat(pin.endPoint)
      .setPopup(new mapboxgl.Popup().setHTML(popupContent).on('open', () => {
        const closeBtn = document.querySelector('.mapboxgl-popup-close-button');
        if (closeBtn) closeBtn.removeAttribute('aria-hidden');
      }))
      .addTo(map);
    endMarker.getElement().addEventListener('click', () => {
      map.flyTo({
        center: pin.endPoint,
        zoom: 15,
        essential: true
      });
      if (infoPanel.classList.contains('visible')) {
        if (morningAudioPlayer) {
          morningAudioPlayer.stop();
          cancelAnimationFrame(morningAnimationFrameId);
        }
        if (eveningAudioPlayer) {
          eveningAudioPlayer.stop();
          cancelAnimationFrame(eveningAnimationFrameId);
        }
        if (videoEl) videoEl.pause();
        resetAudioUI('morning');
        resetAudioUI('evening');
        infoPanel.classList.remove('visible');
        infoPanel.setAttribute('aria-hidden', 'true');
        infoPanel.inert = true;
        mapDiv.classList.remove('shrink');
      }
    });
  }
});

function highlightPin(pinId) {
  Object.values(markers).forEach(marker => {
    marker.getElement().classList.remove('highlighted');
  });
  if (markers[pinId]) {
    markers[pinId].getElement().classList.add('highlighted');
    setTimeout(() => {
      markers[pinId].getElement().classList.remove('highlighted');
    }, 1500);
  }
}

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('go-to-start')) {
    e.preventDefault();
    const pinId = e.target.getAttribute('data-pin-id');
    const pin = pinsData.find(p => p.id === pinId);
    if (pin && markers[pinId]) {
      markers[pinId].getElement().classList.add('hidden');
      map.flyTo({
        center: pin.coordinates,
        zoom: 17,
        essential: true
      });
      map.once('moveend', () => {
        showInfoPanel(pin);
        highlightPin(pinId);
        setTimeout(() => {
          markers[pinId].getElement().classList.remove('hidden');
        }, 1500);
      });
    }
  }
});

async function drawRoute() {
  for (let index = 0; index < pinsData.length; index++) {
    const pin = pinsData[index];
    if (pin.endPoint) {
      const start = pin.coordinates;
      const end = pin.endPoint;
      const coordinates = `${start[0]},${start[1]};${end[0]},${end[1]}`;
      const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coordinates}?geometries=geojson&access_token=${mapboxgl.accessToken}`;
      try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          let routeCoords = data.routes[0].geometry.coordinates;
          routeCoords = [
            start,
            ...routeCoords.slice(1, -1),
            end
          ];
          const route = {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: routeCoords
            }
          };
          const sourceId = `route-${index}`;
          const layerId = `route-layer-${index}`;
          map.addSource(sourceId, {
            type: 'geojson',
            data: route
          });
          map.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#1e90ff',
              'line-width': 4
            }
          });
        }
      } catch (error) {
        console.error('Error drawing route:', error);
      }
    }
  }
}

const infoPanel = document.getElementById('infoPanel');
const titleEl = document.getElementById('title');
const photoImageEl = document.getElementById('photoImage');
const illustrationImageEl = document.getElementById('illustrationImage');
const photoPrevBtn = document.getElementById('photoPrevBtn');
const photoNextBtn = document.getElementById('photoNextBtn');
const illustrationPrevBtn = document.getElementById('illustrationPrevBtn');
const illustrationNextBtn = document.getElementById('illustrationNextBtn');
const descriptionEl = document.getElementById('description');
const morningAudioPlayerContainer = document.getElementById('morningAudioPlayer');
const morningAudioPlayPause = document.getElementById('morningAudioPlayPause');
const morningAudioProgressBar = document.getElementById('morningAudioProgressBar');
const morningAudioProgress = document.getElementById('morningAudioProgress');
const morningAudioTime = document.getElementById('morningAudioTime');
const morningAudioError = document.getElementById('morningAudioError');
const eveningAudioPlayerContainer = document.getElementById('eveningAudioPlayer');
const eveningAudioPlayPause = document.getElementById('eveningAudioPlayPause');
const eveningAudioProgressBar = document.getElementById('eveningAudioProgressBar');
const eveningAudioProgress = document.getElementById('eveningAudioProgress');
const eveningAudioTime = document.getElementById('eveningAudioTime');
const eveningAudioError = document.getElementById('eveningAudioError');
const closeBtn = document.getElementById('closeBtn');
const mapDiv = document.getElementById('map');
const toggleLabelsBtn = document.getElementById('toggleLabelsBtn');
const imageModal = document.getElementById('imageModal');
const modalImageEl = document.getElementById('modalImage');
const modalPrevBtn = document.getElementById('modalPrevBtn');
const modalNextBtn = document.getElementById('modalNextBtn');
const videoEl = document.getElementById('videoPlayer');
const videoContainer = document.getElementById('videoContainer');
const videoError = document.getElementById('videoError');
const photoGallery = document.getElementById('photoGallery');
const illustrationGallery = document.getElementById('illustrationGallery');
const photoTitle = document.getElementById('photoTitle');
const illustrationTitle = document.getElementById('illustrationTitle');
const videoTitle = document.getElementById('videoTitle');
const morningAudioTitle = document.getElementById('morningAudioTitle');
const eveningAudioTitle = document.getElementById('eveningAudioTitle');

let currentPinId = null, currentPhotos = [], currentIllustrations = [], currentPhotoIndex = 0, currentIllustrationIndex = 0, currentVideo = null;
let morningAudioPlayer = null, eveningAudioPlayer = null;
let morningAnimationFrameId = null, eveningAnimationFrameId = null;
let isPhotoModal = true;
let zoomLevel = 1;
let isDragging = false;
let startX, startY, translateX = 0, translateY = 0;
let prevZoomLevel = 1;
let lastUpdateTime = 0;

function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

function resetAudioUI(audioType) {
  const playPause = audioType === 'morning' ? morningAudioPlayPause : eveningAudioPlayPause;
  const progress = audioType === 'morning' ? morningAudioProgress : eveningAudioProgress;
  const timeDisplay = audioType === 'morning' ? morningAudioTime : eveningAudioTime;

  playPause.innerHTML = '<i class="fas fa-play"></i>';
  progress.style.width = '0%';
  timeDisplay.textContent = '0:00 / 0:00';
  if (audioType === 'morning' && morningAnimationFrameId) {
    cancelAnimationFrame(morningAnimationFrameId);
    morningAnimationFrameId = null;
  } else if (audioType === 'evening' && eveningAnimationFrameId) {
    cancelAnimationFrame(eveningAnimationFrameId);
    eveningAnimationFrameId = null;
  }
}

function setupAudioPlayer(audioSrc, player, playPauseBtn, progressBar, progress, timeDisplay, errorDisplay, audioType) {
  if (!audioSrc) {
    console.log(`[${new Date().toISOString()}] No ${audioType} audio file defined for pin: ${currentPinId}`);
    resetAudioUI(audioType);
    return null;
  }

  console.log(`[${new Date().toISOString()}] Attempting to load ${audioType} audio for pin ${currentPinId}: ${audioSrc}`);
  player = new Howl({
    src: [audioSrc],
    format: ['mp3'],
    html5: true,
    onload: () => {
      console.log(`[${new Date().toISOString()}] ${audioType} audio loaded successfully for: ${audioSrc}`);
      errorDisplay.classList.add('hidden');
      timeDisplay.textContent = `0:00 / ${formatTime(player.duration())}`;
      playPauseBtn.onclick = () => {
        if (player.playing()) {
          player.pause();
        } else {
          if (audioType === 'morning' && eveningAudioPlayer && eveningAudioPlayer.playing()) {
            eveningAudioPlayer.pause();
            eveningAudioPlayPause.innerHTML = '<i class="fas fa-play"></i>';
          } else if (audioType === 'evening' && morningAudioPlayer && morningAudioPlayer.playing()) {
            morningAudioPlayer.pause();
            morningAudioPlayPause.innerHTML = '<i class="fas fa-play"></i>';
          }
          player.play();
        }
      };
      player.on('play', () => {
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        if (audioType === 'morning') {
          cancelAnimationFrame(morningAnimationFrameId);
          morningAnimationFrameId = requestAnimationFrame(() => updateProgress(player, progress, timeDisplay, audioType));
        } else {
          cancelAnimationFrame(eveningAnimationFrameId);
          eveningAnimationFrameId = requestAnimationFrame(() => updateProgress(player, progress, timeDisplay, audioType));
        }
      });
      player.on('pause', () => {
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        if (audioType === 'morning') {
          cancelAnimationFrame(morningAnimationFrameId);
        } else {
          cancelAnimationFrame(eveningAnimationFrameId);
        }
      });
      player.on('end', () => {
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        progress.style.width = '0%';
        timeDisplay.textContent = `0:00 / ${formatTime(player.duration())}`;
        if (audioType === 'morning') {
          cancelAnimationFrame(morningAnimationFrameId);
        } else {
          cancelAnimationFrame(eveningAnimationFrameId);
        }
      });
      player.on('stop', () => {
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        progress.style.width = '0%';
        timeDisplay.textContent = `0:00 / ${formatTime(player.duration())}`;
        if (audioType === 'morning') {
          cancelAnimationFrame(morningAnimationFrameId);
        } else {
          cancelAnimationFrame(eveningAnimationFrameId);
        }
      });
      progressBar.onclick = (e) => {
        if (player) {
          const rect = progressBar.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const width = rect.width;
          const seekTime = (clickX / width) * player.duration();
          player.seek(seekTime);
          progress.style.width = `${(seekTime / player.duration()) * 100}%`;
          timeDisplay.textContent = `${formatTime(seekTime)} / ${formatTime(player.duration())}`;
        }
      };
    },
    onloaderror: (id, error) => {
      console.error(`[${new Date().toISOString()}] ${audioType} audio load error for ${audioSrc}:`, error);
      errorDisplay.classList.remove('hidden');
      errorDisplay.textContent = `Failed to load ${audioType} audio. Please try again later.`;
      resetAudioUI(audioType);
    },
    onplayerror: (id, error) => {
      console.error(`[${new Date().toISOString()}] ${audioType} audio play error for ${audioSrc}:`, error);
      errorDisplay.classList.remove('hidden');
      errorDisplay.textContent = `Error playing ${audioType} audio. Please check your connection.`;
      resetAudioUI(audioType);
    }
  });
  return player;
}

function updateProgress(player, progress, timeDisplay, audioType) {
  if (player && player.playing()) {
    const currentTime = performance.now();
    if (currentTime - lastUpdateTime >= 100) {
      const progressPercent = (player.seek() / player.duration()) * 100;
      progress.style.width = `${progressPercent}%`;
      timeDisplay.textContent = `${formatTime(player.seek())} / ${formatTime(player.duration())}`;
      lastUpdateTime = currentTime;
    }
    if (audioType === 'morning') {
      morningAnimationFrameId = requestAnimationFrame(() => updateProgress(player, progress, timeDisplay, audioType));
    } else {
      eveningAnimationFrameId = requestAnimationFrame(() => updateProgress(player, progress, timeDisplay, audioType));
    }
  }
}

function showInfoPanel(pin) {
  if (pin.id !== currentPinId) {
    currentPinId = pin.id;
    titleEl.textContent = '';
    photoImageEl.src = '';
    photoImageEl.style.display = 'none';
    illustrationImageEl.src = '';
    illustrationImageEl.style.display = 'none';
    descriptionEl.textContent = '';
    videoEl.querySelector('source').src = '';
    videoEl.load();
    videoError.classList.add('hidden');
    photoGallery.classList.add('hidden');
    illustrationGallery.classList.add('hidden');
    videoContainer.classList.add('hidden');
    if (morningAudioPlayer) {
      morningAudioPlayer.stop();
      cancelAnimationFrame(morningAnimationFrameId);
      morningAudioPlayer = null;
    }
    if (eveningAudioPlayer) {
      eveningAudioPlayer.stop();
      cancelAnimationFrame(eveningAnimationFrameId);
      eveningAudioPlayer = null;
    }
    resetAudioUI('morning');
    resetAudioUI('evening');
    morningAudioPlayerContainer.classList.add('hidden');
    eveningAudioPlayerContainer.classList.add('hidden');
    morningAudioError.classList.add('hidden');
    eveningAudioError.classList.add('hidden');
    titleEl.textContent = pin.title;
    currentPhotos = pin.photos || [];
    currentIllustrations = pin.illustrations || [];
    currentVideo = pin.video || null;
    currentPhotoIndex = 0;
    currentIllustrationIndex = 0;

    morningAudioPlayer = setupAudioPlayer(pin.morningAudio, morningAudioPlayer, morningAudioPlayPause, morningAudioProgressBar, morningAudioProgress, morningAudioTime, morningAudioError, 'morning');
    eveningAudioPlayer = setupAudioPlayer(pin.eveningAudio, eveningAudioPlayer, eveningAudioPlayPause, eveningAudioProgressBar, eveningAudioProgress, eveningAudioTime, eveningAudioError, 'evening');

    if (currentPhotos.length) {
      updatePhotoGallery();
      photoGallery.classList.remove('hidden');
      photoTitle.classList.remove('hidden');
    } else {
      photoGallery.classList.add('hidden');
      photoTitle.classList.add('hidden');
    }

    if (currentIllustrations.length) {
      updateIllustrationGallery();
      illustrationGallery.classList.remove('hidden');
      illustrationTitle.classList.remove('hidden');
    } else {
      illustrationGallery.classList.add('hidden');
      illustrationTitle.classList.add('hidden');
    }

    if (currentVideo) {
      updateVideoPlayer();
      videoContainer.classList.remove('hidden');
      videoTitle.classList.remove('hidden');
    } else {
      videoContainer.classList.add('hidden');
      videoTitle.classList.add('hidden');
    }

    descriptionEl.textContent = pin.description;

    morningAudioPlayerContainer.classList.toggle('hidden', !pin.morningAudio);
    morningAudioTitle.classList.toggle('hidden', !pin.morningAudio);
    eveningAudioPlayerContainer.classList.toggle('hidden', !pin.eveningAudio);
    eveningAudioTitle.classList.toggle('hidden', !pin.eveningAudio);

    // Sadece bir ses varsa "Audio", her ikisi varsa "Morning Audio" ve "Evening Audio"
    const hasBothAudios = pin.morningAudio && pin.eveningAudio;
    morningAudioTitle.textContent = hasBothAudios ? 'Morning Audio' : 'Audio';
    eveningAudioTitle.textContent = hasBothAudios ? 'Evening Audio' : 'Audio';
  }
  infoPanel.classList.add('visible');
  infoPanel.setAttribute('aria-hidden', 'false');
  infoPanel.inert = false;
  mapDiv.classList.add('shrink');
}

function updatePhotoGallery() {
  if (!currentPhotos.length) {
    photoGallery.classList.add('hidden');
    photoTitle.classList.add('hidden');
    return;
  }
  photoGallery.classList.add('loading');
  photoImageEl.style.display = 'none';
  const img = new Image();
  img.src = currentPhotos[currentPhotoIndex];
  console.log(`[${new Date().toISOString()}] Loading photo: ${img.src}`);
  img.onload = () => {
    photoImageEl.src = img.src;
    photoImageEl.alt = `Photo ${currentPhotoIndex+1}`;
    photoImageEl.style.display = 'block';
    photoGallery.classList.remove('loading');
  };
  img.onerror = () => {
    console.error(`[${new Date().toISOString()}] Photo load error: ${img.src}`);
    photoImageEl.src = 'https://via.placeholder.com/150';
    photoImageEl.alt = 'Failed to load photo';
    photoImageEl.style.display = 'block';
    photoGallery.classList.remove('loading');
  };
  photoPrevBtn.disabled = currentPhotoIndex === 0;
  photoNextBtn.disabled = currentPhotoIndex === currentPhotos.length - 1;
}

function updateIllustrationGallery() {
  if (!currentIllustrations.length) {
    illustrationGallery.classList.add('hidden');
    illustrationTitle.classList.add('hidden');
    return;
  }
  illustrationGallery.classList.add('loading');
  illustrationImageEl.style.display = 'none';
  const img = new Image();
  img.src = currentIllustrations[currentIllustrationIndex];
  console.log(`[${new Date().toISOString()}] Loading illustration: ${img.src}`);
  img.onload = () => {
    illustrationImageEl.src = img.src;
    illustrationImageEl.alt = `Illustration ${currentIllustrationIndex+1}`;
    illustrationImageEl.style.display = 'block';
    illustrationGallery.classList.remove('loading');
  };
  img.onerror = () => {
    console.error(`[${new Date().toISOString()}] Illustration load error: ${img.src}`);
    illustrationImageEl.src = 'https://via.placeholder.com/150';
    illustrationImageEl.alt = 'Failed to load illustration';
    illustrationImageEl.style.display = 'block';
    illustrationGallery.classList.remove('loading');
  };
  illustrationPrevBtn.disabled = currentIllustrationIndex === 0;
  illustrationNextBtn.disabled = currentIllustrationIndex === currentIllustrations.length - 1;
}

function updateModalImage() {
  zoomLevel = 1;
  translateX = 0;
  translateY = 0;
  prevZoomLevel = 1;
  modalImageEl.style.transform = `scale(${zoomLevel}) translate(${translateX}px, ${translateY}px)`;
  const currentIndex = isPhotoModal ? currentPhotoIndex : currentIllustrationIndex;
  const currentArray = isPhotoModal ? currentPhotos : currentIllustrations;

  // Set a temporary placeholder to avoid flickering
  modalImageEl.src = 'https://via.placeholder.com/150';
  modalImageEl.alt = 'Loading image...';

  const img = new Image();
  img.src = currentArray[currentIndex];
  console.log(`[${new Date().toISOString()}] Loading modal image: ${img.src}`);
  img.onload = () => {
    modalImageEl.src = img.src;
    modalImageEl.alt = `${isPhotoModal ? 'Photo' : 'Illustration'} ${currentIndex+1}`;
  };
  img.onerror = () => {
    console.error(`[${new Date().toISOString()}] Modal image load error: ${img.src}`);
    modalImageEl.src = 'https://via.placeholder.com/150';
    modalImageEl.alt = 'Failed to load image';
  };

  modalPrevBtn.disabled = currentIndex === 0;
  modalNextBtn.disabled = currentIndex === (currentArray.length - 1);
}

function updateVideoPlayer() {
  if (!currentVideo) {
    videoContainer.classList.add('hidden');
    videoTitle.classList.add('hidden');
    videoError.classList.add('hidden');
    return;
  }
  videoError.classList.add('hidden');
  const source = videoEl.querySelector('source');
  source.src = currentVideo;
  videoEl.load();
  videoEl.onerror = () => {
    console.error(`[${new Date().toISOString()}] Video load error: ${currentVideo}`);
    videoError.classList.remove('hidden');
    videoError.textContent = 'Failed to load video. Please try again later.';
    videoContainer.classList.add('hidden');
  };
}

photoPrevBtn.addEventListener('click', () => {
  if (currentPhotoIndex > 0) {
    currentPhotoIndex--;
    updatePhotoGallery();
    if (imageModal.classList.contains('visible')) updateModalImage();
  }
});
photoNextBtn.addEventListener('click', () => {
  if (currentPhotoIndex < currentPhotos.length - 1) {
    currentPhotoIndex++;
    updatePhotoGallery();
    if (imageModal.classList.contains('visible')) updateModalImage();
  }
});
illustrationPrevBtn.addEventListener('click', () => {
  if (currentIllustrationIndex > 0) {
    currentIllustrationIndex--;
    updateIllustrationGallery();
    if (imageModal.classList.contains('visible')) updateModalImage();
  }
});
illustrationNextBtn.addEventListener('click', () => {
  if (currentIllustrationIndex < currentIllustrations.length - 1) {
    currentIllustrationIndex++;
    updateIllustrationGallery();
    if (imageModal.classList.contains('visible')) updateModalImage();
  }
});

photoImageEl.addEventListener('click', () => {
  isPhotoModal = true;
  updateModalImage();
  imageModal.classList.add('visible');
});
illustrationImageEl.addEventListener('click', () => {
  isPhotoModal = false;
  updateModalImage();
  imageModal.classList.add('visible');
});

modalPrevBtn.addEventListener('click', () => {
  if (isPhotoModal) {
    if (currentPhotoIndex > 0) {
      currentPhotoIndex--;
      updatePhotoGallery();
      updateModalImage();
    }
  } else {
    if (currentIllustrationIndex > 0) {
      currentIllustrationIndex--;
      updateIllustrationGallery();
      updateModalImage();
    }
  }
});

modalNextBtn.addEventListener('click', () => {
  if (isPhotoModal) {
    if (currentPhotoIndex < currentPhotos.length - 1) {
      currentPhotoIndex++;
      updatePhotoGallery();
      updateModalImage();
    }
  } else {
    if (currentIllustrationIndex < currentIllustrations.length - 1) {
      currentIllustrationIndex++;
      updateIllustrationGallery();
      updateModalImage();
    }
  }
});

modalImageEl.addEventListener('wheel', (e) => {
  e.preventDefault();
  const delta = e.deltaY * -0.01;
  const newZoomLevel = Math.min(Math.max(1, zoomLevel + delta), 5);
  if (newZoomLevel < zoomLevel) {
    translateX = 0;
    translateY = 0;
  }
  zoomLevel = newZoomLevel;
  prevZoomLevel = zoomLevel;
  modalImageEl.style.transform = `scale(${zoomLevel}) translate(${translateX}px, ${translateY}px)`;
});

modalImageEl.addEventListener('mousedown', (e) => {
  if (zoomLevel > 1) {
    e.preventDefault();
    isDragging = true;
    startX = e.clientX - translateX * zoomLevel;
    startY = e.clientY - translateY * zoomLevel;
    modalImageEl.classList.add('dragging');
  }
});

document.addEventListener('mousemove', (e) => {
  if (isDragging) {
    let newTranslateX = (e.clientX - startX) / zoomLevel;
    let newTranslateY = (e.clientY - startY) / zoomLevel;
    const rect = modalImageEl.getBoundingClientRect();
    const maxTranslateX = (rect.width * zoomLevel * 0.5) / zoomLevel;
    const maxTranslateY = (rect.height * zoomLevel * 0.5) / zoomLevel;
    translateX = Math.min(Math.max(newTranslateX, -maxTranslateX), maxTranslateX);
    translateY = Math.min(Math.max(newTranslateY, -maxTranslateY), maxTranslateY);
    modalImageEl.style.transform = `scale(${zoomLevel}) translate(${translateX}px, ${translateY}px)`;
  }
});

document.addEventListener('mouseup', () => {
  if (isDragging) {
    isDragging = false;
    modalImageEl.classList.remove('dragging');
  }
});

imageModal.addEventListener('click', (e) => {
  if (!modalImageEl.contains(e.target) && !modalPrevBtn.contains(e.target) && !modalNextBtn.contains(e.target)) {
    imageModal.classList.remove('visible');
    zoomLevel = 1;
    translateX = 0;
    translateY = 0;
    prevZoomLevel = 1;
    modalImageEl.style.transform = `scale(${zoomLevel}) translate(${translateX}px, ${translateY}px)`;
  }
});

closeBtn.addEventListener('click', () => {
  if (morningAudioPlayer) {
    morningAudioPlayer.stop();
    cancelAnimationFrame(morningAnimationFrameId);
  }
  if (eveningAudioPlayer) {
    eveningAudioPlayer.stop();
    cancelAnimationFrame(eveningAnimationFrameId);
  }
  if (videoEl) videoEl.pause();
  resetAudioUI('morning');
  resetAudioUI('evening');
  infoPanel.classList.remove('visible');
  infoPanel.setAttribute('aria-hidden', 'true');
  infoPanel.inert = true;
  mapDiv.classList.remove('shrink');
  mapDiv.focus();
});

document.addEventListener('click', (e) => {
  if (!infoPanel.contains(e.target) && !e.target.closest('.custom-pin') && !e.target.closest('.end-pin') && !e.target.closest('#toggleLabelsBtn') && !e.target.closest('.mapboxgl-ctrl-geocoder') && !e.target.closest('#morningAudioProgressBar') && !e.target.closest('#eveningAudioProgressBar') && !e.target.closest('.go-to-start') && !imageModal.contains(e.target)) {
    if (infoPanel.classList.contains('visible')) {
      if (morningAudioPlayer) {
        morningAudioPlayer.stop();
        cancelAnimationFrame(morningAnimationFrameId);
      }
      if (eveningAudioPlayer) {
        eveningAudioPlayer.stop();
        cancelAnimationFrame(eveningAnimationFrameId);
      }
      if (videoEl) videoEl.pause();
      resetAudioUI('morning');
      resetAudioUI('evening');
      infoPanel.classList.remove('visible');
      infoPanel.setAttribute('aria-hidden', 'true');
      infoPanel.inert = true;
      mapDiv.classList.remove('shrink');
      mapDiv.focus();
    }
  }
});

let labelsVisible = true;
toggleLabelsBtn.addEventListener('click', () => {
  labelsVisible = !labelsVisible;
  map.setLayoutProperty('poi-label', 'visibility', labelsVisible ? 'visible' : 'none');
  toggleLabelsBtn.textContent = labelsVisible ? 'Hide Map Labels' : 'Show Map Labels';
  toggleLabelsBtn.classList.toggle('outline', !labelsVisible);
});

const geocoder = new MapboxGeocoder({
  accessToken: mapboxgl.accessToken,
  mapboxgl: mapboxgl,
  placeholder: 'Search for a place...',
  marker: false
});

map.addControl(geocoder, 'top-left');

geocoder.on('result', (e) => {
  const coords = e.result.center;
  map.flyTo({
    center: coords,
    zoom: 15,
    essential: true
  });
});

map.on('load', () => {
  try {
    map.resize();
    drawRoute();
  } catch (error) {
    console.error('Error during map load:', error);
    if (error.message.includes('fog.js')) {
      console.warn('Fog effect failed to initialize. Consider removing fog.js or checking compatibility.');
    }
  }
});

map.on('click', (e) => {
  const coordinates = e.lngLat;
  console.log(`Tıklanan Koordinatlar: Enlem: ${coordinates.lat}, Boylam: ${coordinates.lng}`);
});

window.addEventListener('resize', () => map.resize());

document.addEventListener("DOMContentLoaded", () => {
  gsap.registerPlugin(ScrollTrigger);

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    if (link.getAttribute('href') === currentPage) link.classList.add('active');
  });

  gsap.utils.toArray("[data-animate]").forEach((element) => {
    gsap.fromTo(
      element,
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: "power2.out",
        scrollTrigger: {
          trigger: element,
          start: "top 80%",
          toggleActions: "play none none none",
        },
      }
    );
  });

  const hamburger = document.getElementById("hamburger");
  const navLinks = document.getElementById("navLinks");

  hamburger.addEventListener("click", () => {
    const isExpanded = hamburger.getAttribute("aria-expanded") === "true";
    hamburger.setAttribute("aria-expanded", !isExpanded);
    navLinks.classList.toggle("open");
  });

  function closeMenu() {
    hamburger.setAttribute("aria-expanded", "false");
    navLinks.classList.remove("open");
  }

  navLinks.addEventListener("transitionend", () => {
    if (!navLinks.classList.contains("open")) {
      map.resize();
    }
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });
});