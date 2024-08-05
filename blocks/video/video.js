import { decorateIcons } from '../../scripts/aem.js';

const VIDEO_JS_SCRIPT = 'https://vjs.zencdn.net/8.3.0/video.min.js';
const VIDEO_JS_CSS = 'https://vjs.zencdn.net/8.3.0/video-js.min.css';
let videoJsScriptPromise;

function scriptExists(src) {
  const scripts = document.head.getElementsByTagName('script');

  return [...scripts].some((script) => script.src === src);
}

function parseConfig(block) {
  const isAutoPlay = block.classList.contains('autoplay');

  if (block.classList.contains('hero')) {
    const posterImage = block.querySelector(':scope > div > div:first-child picture');
    const videoUrl = block.querySelector(':scope > div > div:first-child a').href;
    const title = block.querySelector(':scope > div > div:nth-child(2) > h1')?.textContent;
    const description = block.querySelector(':scope > div > div:nth-child(2) > p')?.textContent;
    const button = block.querySelector(':scope > div > div:nth-child(2) > p:last-child > a');

    return {
      type: 'hero',
      videoUrl,
      isAutoPlay,
      title,
      description,
      button,
      posterImage,
    };
  }

  if (block.classList.contains('inline')) {
    const cards = [...block.children].map((child) => {
      const posterImage = block.querySelector(':scope > div:first-child picture');
      const videoUrl = child.querySelector(':scope > div:first-child a').href;
      const title = child.querySelector(':scope > div:nth-child(2) > h1')?.textContent;
      const description = child.querySelector(':scope > div:nth-child(2) > p')?.textContent;

      return {
        videoUrl,
        isAutoPlay,
        title,
        description,
        posterImage,
      };
    });

    return {
      type: 'cards',
      cards,
    };
  }

  const videoUrl = block.querySelector(':scope div p:first-child a').href;
  const posterImage = block.querySelector(':scope div p:nth-child(2)')?.firstElementChild;

  return {
    type: 'modal',
    videoUrl,
    posterImage,
  };
}

async function loadVideoJs() {
  if (scriptExists(VIDEO_JS_SCRIPT)) {
    return videoJsScriptPromise;
  }

  let resolvePromise;
  videoJsScriptPromise = new Promise((resolve) => {
    resolvePromise = resolve;
  });

  const css = document.createElement('link');
  css.setAttribute('href', VIDEO_JS_CSS);
  css.setAttribute('rel', 'stylesheet');

  const mainScript = document.createElement('script');
  mainScript.setAttribute('src', VIDEO_JS_SCRIPT);
  mainScript.setAttribute('async', 'true');
  mainScript.onload = () => resolvePromise();

  const header = document.querySelector('head');
  header.append(css);
  header.append(mainScript);

  return videoJsScriptPromise;
}

function createPlayButton(container, player) {
  const pauseIcon = document.createElement('span');
  pauseIcon.classList.add('icon');
  pauseIcon.classList.add('icon-pause');

  const playIcon = document.createElement('span');
  playIcon.classList.add('icon');
  playIcon.classList.add('icon-play');

  const button = document.createElement('button');
  button.classList.add('custom-play-button');
  button.addEventListener('click', () => {
    if (player.paused()) {
      player.play();
    } else {
      player.pause();
    }
  });

  button.append(pauseIcon);
  button.append(playIcon);

  function updateIcons(isPaused) {
    if (isPaused) {
      playIcon.style.display = '';
      pauseIcon.style.display = 'none';
      button.setAttribute('aria-label', 'Play video');
    } else {
      playIcon.style.display = 'none';
      pauseIcon.style.display = '';
      button.setAttribute('aria-label', 'Pause video');
    }
  }

  player.on('play', () => {
    updateIcons(false);
  });
  player.on('pause', () => {
    updateIcons(true);
  });

  decorateIcons(button);
  updateIcons(player.paused());

  container.append(button);
}

function setupAutopause(videoElement, player) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        player.play();
      } else {
        player.pause();
      }
    });
  }, {
    threshold: [0.5],
  });

  observer.observe(videoElement);
}

function isImageFormatSupported(format) {
  if (['image/jpeg', 'image/png'].includes(format)) {
    return true;
  }

  const elem = document.createElement('canvas');
  if (elem.getContext && elem.getContext('2d')) {
    return elem.toDataURL(format).indexOf(`data:${format}`) === 0;
  }

  return false;
}

function getPosterImage(posterElement) {
  const img = posterElement.querySelector('img');
  const sources = posterElement.querySelectorAll('source');
  if (!sources || !img) {
    return null;
  }

  const supportedSources = [...sources].filter((source) => {
    const format = source.getAttribute('type');
    const media = source.getAttribute('media');
    return isImageFormatSupported(format) && (window.matchMedia(media).matches || !media);
  });

  if (supportedSources.length === 0) {
    return img.src;
  }

  return supportedSources[0].srcset;
}

function setupPlayer(url, videoContainer, config) {
  const videoElement = document.createElement('video');
  videoElement.classList.add('video-js');
  videoElement.id = `video-${Math.random().toString(36).substr(2, 9)}`;

  videoContainer.append(videoElement);

  const poster = config.poster ? getPosterImage(config.poster) : null;
  const videojsConfig = {
    ...config,
    preload: poster && !config.autoplay ? 'none' : 'auto',
    poster,
  };

  if (config.autoplay) {
    videojsConfig.muted = true;
    videojsConfig.loop = true;
    // Video will autoplay when the user scrolls it in the viewport
    // Refer setupAutopause function
    videojsConfig.autoplay = false;
  }

  // eslint-disable-next-line no-undef
  const player = videojs(videoElement, videojsConfig);
  player.src(url);

  if (config.hasCustomPlayButton) {
    createPlayButton(videoContainer, player);
  }

  if (config.autoplay) {
    setupAutopause(videoElement, player);
  }
}

function decorateVideoCard(container, config) {
  const videoContainer = document.createElement('div');
  videoContainer.classList.add('video-container');

  const article = document.createElement('article');
  article.classList.add('video-card');
  article.append(videoContainer);

  if (config.title || config.description) {
    const content = document.createElement('div');
    content.classList.add('video-card-content');

    if (config.title) {
      const title = document.createElement('h3');
      title.classList.add('video-card-title');
      title.textContent = config.title;
      content.append(title);
    }

    if (config.description) {
      const description = document.createElement('p');
      description.classList.add('video-card-description');
      description.textContent = config.description;
      content.append(description);
    }

    article.append(content);
  }

  setupPlayer(config.videoUrl, videoContainer, {
    autoplay: config.isAutoPlay,
    hasCustomPlayButton: true,
    fill: true,
    poster: config.posterImage,
  });

  container.append(article);
}

function decorateHeroBlock(block, config) {
  const container = document.createElement('div');
  container.classList.add('video-hero');

  const content = document.createElement('div');
  content.classList.add('video-hero-content');

  if (config.title) {
    const title = document.createElement('h1');
    title.classList.add('video-hero-title');
    title.textContent = config.title;
    content.append(title);
  }

  if (config.description) {
    const description = document.createElement('p');
    description.classList.add('video-hero-description');
    description.textContent = config.description;
    content.append(description);
  }

  if (config.button) {
    config.button.classList.add('video-hero-button');
    content.append(config.button);
  }

  container.append(content);

  block.innerHTML = '';
  block.append(container);

  setupPlayer(config.videoUrl, container, {
    autoplay: config.isAutoPlay,
    hasCustomPlayButton: true,
    fill: true,
    poster: config.posterImage,
  });
}

function decorateVideoCards(block, config) {
  const gridContainer = document.createElement('ul');
  gridContainer.classList.add('video-card-grid');

  block.innerHTML = '';
  block.append(gridContainer);

  config.cards.forEach((videoConfig) => {
    const gridItem = document.createElement('li');
    gridItem.classList.add('video-card-grid-item');
    gridContainer.append(gridItem);

    decorateVideoCard(gridItem, videoConfig);
  });
}

function closeModal() {
  const dialog = document.querySelector('.video-modal-dialog');
  dialog.querySelector('.video-container').innerHTML = '';

  // eslint-disable-next-line no-use-before-define
  window.removeEventListener('click', handleOutsideClick);
  // eslint-disable-next-line no-use-before-define
  window.removeEventListener('keydown', handleEscapeKey);

  dialog.close();
  document.body.style.overflow = '';
}

function handleOutsideClick(event) {
  const modal = document.querySelector('.video-modal-dialog');
  if (event.target === modal) {
    closeModal();
  }
}

function handleEscapeKey(event) {
  if (event.key === 'Escape') {
    closeModal();
  }
}

async function openModal(config) {
  await loadVideoJs();

  const dialog = document.querySelector('.video-modal-dialog');
  const container = dialog.querySelector('.video-container');
  setupPlayer(config.videoUrl, container, {
    bigPlayButton: true,
    fluid: true,
    controls: true,
  });

  window.addEventListener('click', handleOutsideClick);
  window.addEventListener('keydown', handleEscapeKey);

  dialog.showModal();
  document.body.style.overflow = 'hidden';
}

function createModal() {
  const modal = document.createElement('dialog');
  modal.classList.add('video-modal-dialog');

  const container = document.createElement('div');
  container.classList.add('video-modal');

  const header = document.createElement('div');
  header.classList.add('video-modal-header');

  const closeIcon = document.createElement('span');
  closeIcon.classList.add('icon');
  closeIcon.classList.add('icon-close');
  const closeBtn = document.createElement('button');
  closeBtn.setAttribute('aria-label', 'Close dialog');
  closeBtn.classList.add('video-modal-close');
  closeBtn.append(closeIcon);
  closeBtn.addEventListener('click', () => {
    closeModal();
  });

  header.append(closeBtn);
  decorateIcons(header);

  container.append(header);

  const content = document.createElement('div');
  content.classList.add('video-modal-content');

  const videoContainer = document.createElement('div');
  videoContainer.classList.add('video-container');
  content.append(videoContainer);

  container.append(content);
  modal.append(container);
  document.body.append(modal);
}

function decorateVideoModal(block, config) {
  const container = document.createElement('div');
  container.classList.add('video-component');

  const posterImage = config.posterImage.cloneNode(true);
  const playButton = document.createElement('button');
  playButton.setAttribute('aria-label', 'Play video');
  playButton.classList.add('video-play-button');

  const playIcon = document.createElement('span');
  playIcon.classList.add('icon');
  playIcon.classList.add('icon-play');
  playButton.append(playIcon);
  decorateIcons(playButton);

  playButton.addEventListener('click', async () => {
    await openModal(config);
  });

  container.append(posterImage);
  container.append(playButton);

  block.innerHTML = '';
  block.append(container);

  const hasVideoModal = document.querySelector('.video-modal-dialog');
  if (!hasVideoModal) {
    createModal();
  }
}

export default async function decorate(block) {
  const config = parseConfig(block);
  if (config.type !== 'modal') {
    await loadVideoJs();
  }

  if (config.type === 'hero') {
    decorateHeroBlock(block, config);
    return;
  }

  if (config.type === 'cards') {
    decorateVideoCards(block, config);
    return;
  }

  decorateVideoModal(block, config);
}
