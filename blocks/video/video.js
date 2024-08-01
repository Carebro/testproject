import { decorateIcons } from '../../scripts/aem.js';

let videoJsScriptPromise;

function scriptExists(src) {
  const scripts = document.head.getElementsByTagName('script');

  return [...scripts].some((script) => script.src === src);
}

function parseConfig(block) {
  const isAutoPlay = block.classList.contains('autoplay');

  if (block.classList.contains('hero')) {
    const videoUrl = block.querySelector(':scope > div > div:first-child').textContent;
    const title = block.querySelector(':scope > div > div:nth-child(2) > h1')?.textContent;
    const description = block.querySelector(':scope > div > div:nth-child(2) > p')?.textContent;
    const button = block.querySelector(':scope > div > div:nth-child(2) > p:last-child')?.textContent;

    return {
      type: 'hero',
      videoUrl,
      isAutoPlay,
      title,
      description,
      button,
    };
  }

  if (block.classList.contains('inline')) {
    const cards = [...block.children].map((child) => {
      const videoUrl = child.querySelector(':scope > div:first-child').textContent;
      const title = child.querySelector(':scope > div:nth-child(2) > h1')?.textContent;
      const description = child.querySelector(':scope > div:nth-child(2) > p')?.textContent;

      return {
        videoUrl,
        isAutoPlay,
        title,
        description,
      };
    });

    return {
      type: 'cards',
      cards,
    };
  }

  const videoUrl = block.querySelector(':scope div p:first-child').textContent;
  const posterImage = block.querySelector(':scope div p:nth-child(2)')?.firstElementChild;

  return {
    type: 'modal',
    videoUrl,
    posterImage,
  };
}

async function loadVideoJs() {
  const videoJsScrriptUrl = 'https://vjs.zencdn.net/8.3.0/video.min.js';
  const videoJsCssUrl = 'https://vjs.zencdn.net/8.3.0/video-js.min.css';
  if (scriptExists(videoJsScrriptUrl)) {
    return videoJsScriptPromise;
  }

  let resolvePromise;
  videoJsScriptPromise = new Promise((resolve) => {
    resolvePromise = resolve;
  });

  const css = document.createElement('link');
  css.setAttribute('href', videoJsCssUrl);
  css.setAttribute('rel', 'stylesheet');

  const mainScript = document.createElement('script');
  mainScript.setAttribute('src', videoJsScrriptUrl);
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

  function updateIcons(isPaused) {
    if (isPaused) {
      playIcon.style.display = '';
      pauseIcon.style.display = 'none';
    } else {
      playIcon.style.display = 'none';
      pauseIcon.style.display = '';
    }
  }

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

function setupPlayer(videoContainer, config) {
  const videoElement = document.createElement('video');
  videoElement.classList.add('video-js');
  videoElement.id = `video-${Math.random().toString(36).substr(2, 9)}`;

  videoContainer.append(videoElement);

  // eslint-disable-next-line no-undef
  const player = videojs(videoElement, {
    controls: config.controls,
    bigPlayButton: config.bigPlayButton,
    autoplay: config.autoplay,
    muted: config.autoplay,
    fluid: true,
    loop: config.autoplay,
  });

  player.src(config.url);

  if (config.hasCustomPlayButton) {
    createPlayButton(videoContainer, player);
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

  setupPlayer(videoContainer, {
    url: config.videoUrl,
    autoplay: config.isAutoPlay,
    hasCustomPlayButton: true,
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
    const button = document.createElement('button');
    button.classList.add('video-hero-button');
    button.textContent = config.button;
    content.append(button);
  }

  container.append(content);

  block.innerHTML = '';
  block.append(container);

  setupPlayer(container, {
    url: config.videoUrl,
    autoplay: config.isAutoPlay,
    hasCustomPlayButton: true,
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
  const modal = document.querySelector('.video-modal');
  modal.querySelector('.video-container').innerHTML = '';

  // eslint-disable-next-line no-use-before-define
  window.removeEventListener('click', handleOutsideClick);
  // eslint-disable-next-line no-use-before-define
  window.removeEventListener('keydown', handleEscapeKey);

  modal.style.display = 'none';
  document.body.style.overflow = '';
}

function handleOutsideClick(event) {
  const modal = document.querySelector('.video-modal');
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

  const modal = document.querySelector('.video-modal');
  const container = modal.querySelector('.video-container');
  setupPlayer(container, {
    url: config.videoUrl,
    autoplay: false,
    controls: true,
    bigPlayButton: true,
  });

  window.addEventListener('click', handleOutsideClick);
  window.addEventListener('keydown', handleEscapeKey);

  modal.style.display = '';
  document.body.style.overflow = 'hidden';
}

function createModal() {
  const modal = document.createElement('div');
  modal.classList.add('video-modal');
  modal.style.display = 'none';

  const modalHeader = document.createElement('div');
  modalHeader.classList.add('video-modal-header');

  const closeIcon = document.createElement('span');
  closeIcon.classList.add('icon');
  closeIcon.classList.add('icon-close');
  closeIcon.addEventListener('click', () => {
    closeModal();
  });

  modalHeader.append(closeIcon);
  decorateIcons(modalHeader);

  modal.append(modalHeader);

  const modalContent = document.createElement('div');
  modalContent.classList.add('video-modal-content');

  const videoContainer = document.createElement('div');
  videoContainer.classList.add('video-container');
  modalContent.append(videoContainer);

  modal.append(modalContent);
  document.body.append(modal);
}

function decorateVideoModal(block, config) {
  const container = document.createElement('div');
  container.classList.add('video-component');

  const posterImage = config.posterImage.cloneNode(true);
  const playButton = document.createElement('button');
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

  const hasVideoModal = document.querySelector('.video-modal');
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
