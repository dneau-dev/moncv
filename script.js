/* =========================================================================
 * CONFIG GÉNÉRALE
 * ========================================================================= */

const CONFIG = {
  STORAGE_KEYS: {
    THEME: 'cv-theme',
    ANALYTICS: 'cv-analytics-events',
  },
  MAX_ANALYTICS_EVENTS: 100,
};

// Version du CV (à mettre à jour quand tu modifies ton CV)
const CV_VERSION = '2025-01-01';

// Zoom PDF
const PDF_ZOOM = {
  MIN: 0.8,
  MAX: 2,
  STEP: 0.1,
  DEFAULT: 1,
};
let currentPdfZoom = PDF_ZOOM.DEFAULT;

// Statistiques visite (temps passé)
let visitStartTime = Date.now();

// Konami code pour l'easter egg
const KONAMI_CODE = [
  'ArrowUp','ArrowUp','ArrowDown','ArrowDown',
  'ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'
];
let konamiIndex = 0;

// Éléments globaux
let scrollProgressBar = null;
let backToTopButton = null;
let isReadingMode = false;
let isPresentationMode = false;
let downloadSuggested = false;

/* =========================================================================
 * UTILITAIRES
 * ========================================================================= */

function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function getPdfElement() {
  // Adapte cette sélection à ton HTML :
  // par exemple .pdf-container, iframe, embed, object…
  return document.querySelector('.pdf-container') ||
         document.querySelector('iframe') ||
         document.querySelector('embed') ||
         document.querySelector('object');
}

/* =========================================================================
 * TOASTS
 * ========================================================================= */

let toastContainer = null;

function createToastContainer() {
  if (toastContainer) return;
  toastContainer = document.createElement('div');
  toastContainer.id = 'toast-container';
  document.body.appendChild(toastContainer);
}

function showToast(message, type = 'info', duration = 4000) {
  createToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  toastContainer.appendChild(toast);

  const remove = () => {
    if (toast && toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  };

  setTimeout(remove, duration);
}

/* =========================================================================
 * ANALYTICS (LOCAL)
 * ========================================================================= */

function loadAnalyticsEvents() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.ANALYTICS);
    if (!raw) return [];
    const events = JSON.parse(raw);
    if (!Array.isArray(events)) return [];
    return events;
  } catch {
    return [];
  }
}

function saveAnalyticsEvents(events) {
  try {
    localStorage.setItem(
      CONFIG.STORAGE_KEYS.ANALYTICS,
      JSON.stringify(events.slice(-CONFIG.MAX_ANALYTICS_EVENTS))
    );
  } catch {
    // ignore
  }
}

function trackEvent(category, action, label = null) {
  const events = loadAnalyticsEvents();
  const event = {
    time: new Date().toISOString(),
    category,
    action,
    label,
  };
  events.push(event);
  saveAnalyticsEvents(events);

  // Compat GA éventuelle
  if (window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
    });
  }
}

function getAnalytics() {
  return loadAnalyticsEvents();
}

function trackVisitDuration() {
  const durationMs = Date.now() - visitStartTime;
  const seconds = Math.round(durationMs / 1000);
  trackEvent('page', 'duration', `${seconds}s`);
}

/* =========================================================================
 * CLIPBOARD
 * ========================================================================= */

function copyToClipboard(text, event) {
  if (!text) return;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => {
        showToast('Copié dans le presse-papiers.', 'success');
        trackEvent('clipboard', 'copy', text);
      })
      .catch(() => {
        fallbackCopyToClipboard(text);
      });
  } else {
    fallbackCopyToClipboard(text);
  }
}

function fallbackCopyToClipboard(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    document.execCommand('copy');
    showToast('Copié dans le presse-papiers.', 'success');
    trackEvent('clipboard', 'copy_fallback', text);
  } catch {
    showToast('Impossible de copier.', 'error');
  } finally {
    document.body.removeChild(textarea);
  }
}

/* =========================================================================
 * MENU CONTACT / SHARE
 * ========================================================================= */

function toggleMenu() {
  const menu = document.getElementById('contact-menu');
  if (!menu) return;
  const isOpen = menu.classList.toggle('open');
  trackEvent('menu', 'toggle_contact', isOpen ? 'open' : 'close');
}

function closeAllDropdowns() {
  const dropdowns = document.querySelectorAll('.dropdown-menu.open');
  dropdowns.forEach(d => d.classList.remove('open'));
}

function toggleShareMenu() {
  const menu = document.getElementById('share-menu');
  if (!menu) return;
  const isOpen = menu.classList.toggle('open');
  trackEvent('menu', 'toggle_share', isOpen ? 'open' : 'close');
}

/* =========================================================================
 * PLEIN ÉCRAN
 * ========================================================================= */

function isFullScreen() {
  return !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}

function requestFullScreen(elem) {
  if (elem.requestFullscreen) return elem.requestFullscreen();
  if (elem.webkitRequestFullscreen) return elem.webkitRequestFullscreen();
  if (elem.mozRequestFullScreen) return elem.mozRequestFullScreen();
  if (elem.msRequestFullscreen) return elem.msRequestFullscreen();
}

function exitFullScreen() {
  if (document.exitFullscreen) return document.exitFullscreen();
  if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
  if (document.mozCancelFullScreen) return document.mozCancelFullScreen();
  if (document.msExitFullscreen) return document.msExitFullscreen();
}

function toggleFullScreen() {
  const target = document.documentElement;
  if (!isFullScreen()) {
    requestFullScreen(target);
    trackEvent('fullscreen', 'enter');
  } else {
    exitFullScreen();
    trackEvent('fullscreen', 'exit');
  }
}

/* =========================================================================
 * THÈME SOMBRE / CLAIR
 * ========================================================================= */

function getSystemPrefersDark() {
  return window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.setAttribute(
      'aria-label',
      theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'
    );
  }
}

function initTheme() {
  let theme = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME);
  if (!theme) {
    theme = getSystemPrefersDark() ? 'dark' : 'light';
  }
  applyTheme(theme);
}

function toggleTheme() {
  const current = document.body.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, next);
  trackEvent('theme', 'toggle', next);
  showToast(
    next === 'dark' ? 'Mode sombre activé.' : 'Mode clair activé.',
    'success'
  );
}

/* =========================================================================
 * PDF : CHARGEMENT, ZOOM, IMPRESSION
 * ========================================================================= */

function checkPDFLoading() {
  const pdf = getPdfElement();
  if (!pdf) {
    showToast('CV PDF introuvable.', 'error');
    trackEvent('pdf', 'missing');
    return;
  }

  // Suivant le type d’élément, on peut écouter load/error
  pdf.addEventListener('load', () => {
    trackEvent('pdf', 'load', 'success');
  });
  pdf.addEventListener('error', () => {
    trackEvent('pdf', 'load', 'error');
    showToast('Erreur de chargement du CV PDF.', 'error');
  });
}

function applyPdfZoom() {
  const pdf = getPdfElement();
  if (!pdf) return;

  pdf.style.transformOrigin = 'top center';
  pdf.style.transform = `scale(${currentPdfZoom})`;

  const wrapper = pdf.parentElement;
  if (wrapper) {
    wrapper.style.overflow = 'auto';
  }
}

function setPdfZoom(newZoom) {
  currentPdfZoom = Math.max(
    PDF_ZOOM.MIN,
    Math.min(PDF_ZOOM.MAX, newZoom)
  );
  applyPdfZoom();
  trackEvent('pdf', 'zoom', currentPdfZoom.toFixed(2));
}

function zoomInPdf() {
  setPdfZoom(currentPdfZoom + PDF_ZOOM.STEP);
}

function zoomOutPdf() {
  setPdfZoom(currentPdfZoom - PDF_ZOOM.STEP);
}

function resetPdfZoom() {
  setPdfZoom(PDF_ZOOM.DEFAULT);
}

function printPDF() {
  const pdf = getPdfElement();
  if (!pdf) {
    showToast('CV PDF introuvable.', 'error');
    return;
  }
  // Si utilisable, on laisse la fenêtre/imprimante standard
  window.print();
  trackEvent('pdf', 'print');
}

/* =========================================================================
 * PARTAGE
 * ========================================================================= */

function shareOnSocial(platform) {
  const url = window.location.href;
  const title = document.title || "Mon CV";

  let shareUrl = '';
  if (platform === 'linkedin') {
    shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  } else if (platform === 'twitter') {
    shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
  } else if (platform === 'facebook') {
    shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  } else if (platform === 'email') {
    shareUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;
  }

  if (shareUrl) {
    window.open(shareUrl, '_blank', 'noopener');
    trackEvent('share', 'click', platform);
  }
}

/* =========================================================================
 * MODE LECTURE / PRÉSENTATION
 * ========================================================================= */

function toggleReadingMode() {
  isReadingMode = !isReadingMode;
  document.body.classList.toggle('reading-mode', isReadingMode);
  trackEvent('ui', 'reading_mode', isReadingMode ? 'on' : 'off');
  showToast(
    isReadingMode ? 'Mode lecture activé.' : 'Mode lecture désactivé.',
    'success'
  );
}

function togglePresentationMode() {
  isPresentationMode = !isPresentationMode;
  document.body.classList.toggle('presentation-mode', isPresentationMode);
  trackEvent('ui', 'presentation_mode', isPresentationMode ? 'on' : 'off');
  showToast(
    isPresentationMode ? 'Mode présentation activé.' : 'Mode présentation désactivé.',
    'success'
  );
}

/* =========================================================================
 * SCROLL : BARRE DE PROGRESSION + RETOUR HAUT
 * ========================================================================= */

function initScrollUI() {
  // Barre de progression
  scrollProgressBar = document.createElement('div');
  scrollProgressBar.id = 'scroll-progress-bar';
  document.body.appendChild(scrollProgressBar);

  // Bouton retour en haut
  backToTopButton = document.createElement('button');
  backToTopButton.id = 'back-to-top';
  backToTopButton.className = 'control-button';
  backToTopButton.title = 'Retour en haut';
  backToTopButton.innerHTML = '<i class="fas fa-arrow-up"></i>';
  backToTopButton.onclick = () => {
    // Pas de smooth scroll
    window.scrollTo(0, 0);
  };
  backToTopButton.style.display = 'none';
  document.body.appendChild(backToTopButton);

  updateScrollUI();
}

function updateScrollUI() {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

  if (scrollProgressBar) {
    scrollProgressBar.style.width = progress + '%';
  }

  if (backToTopButton) {
    backToTopButton.style.display = scrollTop > 200 ? 'block' : 'none';
  }
}

/* =========================================================================
 * QR CODE (MODALE SIMPLE)
 * ========================================================================= */

function openQrModal() {
  let modal = document.getElementById('qr-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'qr-modal';
    modal.className = 'qr-modal';

    modal.innerHTML = `
      <div class="qr-modal-content">
        <button class="qr-close" aria-label="Fermer">&times;</button>
        <h2>QR Code de mon CV</h2>
        <img id="qr-image" alt="QR Code CV" />
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.qr-close').onclick = closeQrModal;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeQrModal();
    });
  }

  const img = modal.querySelector('#qr-image');
  // Mets ici l’URL de ton image QR code
  const qrImageUrl = ''; 
  if (qrImageUrl) {
    img.src = qrImageUrl;
  }

  modal.style.display = 'flex';
  trackEvent('ui', 'qr', 'open');
}

function closeQrModal() {
  const modal = document.getElementById('qr-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

/* =========================================================================
 * CONNEXION / BATTERIE
 * ========================================================================= */

window.addEventListener('online', () => {
  showToast('Connexion rétablie.', 'success');
  trackEvent('network', 'status', 'online');
});

window.addEventListener('offline', () => {
  showToast('Vous êtes hors ligne.', 'error');
  trackEvent('network', 'status', 'offline');
});

function initBatterySaver() {
  if (!navigator.getBattery) return;

  navigator.getBattery().then((battery) => {
    function handleBattery() {
      if (!battery.charging && battery.level < 0.2) {
        if (document.body.getAttribute('data-theme') !== 'dark') {
          applyTheme('dark');
          localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, 'dark');
          trackEvent('ui', 'battery_saver', 'dark_forced');
          showToast('Mode sombre activé (batterie faible).', 'success');
        }
      }
    }

    handleBattery();
    battery.addEventListener('levelchange', handleBattery);
    battery.addEventListener('chargingchange', handleBattery);
  });
}

/* =========================================================================
 * VERSION DU CV
 * ========================================================================= */

function checkCvVersion() {
  const STORAGE_KEY = 'cv-last-version';
  const lastVersion = localStorage.getItem(STORAGE_KEY);

  if (lastVersion && lastVersion !== CV_VERSION) {
    showToast('Nouveau CV disponible depuis votre dernière visite.', 'success');
  }

  localStorage.setItem(STORAGE_KEY, CV_VERSION);
}

/* =========================================================================
 * RECOMMANDATIONS (SUGGESTION DE TÉLÉCHARGEMENT)
 * ========================================================================= */

function initSmartSuggestions() {
  setTimeout(() => {
    if (downloadSuggested) return;
    const events = getAnalytics();
    const hasDownloaded = events.some(
      (e) => e.category === 'pdf' && e.action === 'download'
    );
    if (!hasDownloaded) {
      showToast(
        'Vous pouvez télécharger mon CV en PDF avec le bouton dédié.',
        'success'
      );
      trackEvent('ui', 'suggestion', 'download_pdf');
      downloadSuggested = true;
    }
  }, 45000);
}

/* =========================================================================
 * EXPORT ANALYTICS
 * ========================================================================= */

function exportAnalyticsAsJson() {
  const data = getAnalytics();
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'cv-analytics.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  trackEvent('analytics', 'export', 'json');
  showToast('Export des analytics en JSON lancé.', 'success');
}

/* =========================================================================
 * RACCOURCIS CLAVIER
 * ========================================================================= */

function handleLetterShortcuts(event) {
  const activeTag = document.activeElement && document.activeElement.tagName;
  if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

  const key = event.key.toLowerCase();

  // Menu contact : C
  if (key === 'c') {
    toggleMenu();
    return;
  }

  // Télécharger PDF : D (cherche un lien avec download)
  if (key === 'd') {
    const downloadLink = document.querySelector('a[download]');
    if (downloadLink) {
      downloadLink.click();
      trackEvent('pdf', 'download', 'shortcut');
    }
    return;
  }

  // Imprimer : P
  if (key === 'p') {
    event.preventDefault();
    printPDF();
    return;
  }

  // Thème : T
  if (key === 't') {
    toggleTheme();
    return;
  }

  // Partage : S
  if (key === 's') {
    toggleShareMenu();
    return;
  }

  // Mode lecture : F
  if (key === 'f') {
    toggleReadingMode();
    return;
  }

  // Mode présentation : M
  if (key === 'm') {
    togglePresentationMode();
    return;
  }

  // Aide raccourcis : ?
  if (event.key === '?') {
    showShortcutsHelp();
    return;
  }
}

function handleKeydownShortcuts(event) {
  // Ctrl + / Ctrl - / Ctrl 0 pour le zoom PDF
  if (event.ctrlKey) {
    if (event.key === '+') {
      event.preventDefault();
      zoomInPdf();
      return;
    }
    if (event.key === '-') {
      event.preventDefault();
      zoomOutPdf();
      return;
    }
    if (event.key === '0') {
      event.preventDefault();
      resetPdfZoom();
      return;
    }
  }

  handleLetterShortcuts(event);
}

function showShortcutsHelp() {
  const message = [
    'Raccourcis :',
    'C: Contact',
    'D: Télécharger le PDF',
    'P: Imprimer',
    'T: Thème',
    'S: Partager',
    'F: Mode lecture',
    'M: Mode présentation',
    'Ctrl+ / Ctrl- / Ctrl0: Zoom PDF'
  ].join(' | ');
  showToast(message, 'success', 8000);
}

/* =========================================================================
 * EASTER EGG (KONAMI)
 * ========================================================================= */

function handleKonamiCode(event) {
  if (event.key === KONAMI_CODE[konamiIndex]) {
    konamiIndex++;
    if (konamiIndex === KONAMI_CODE.length) {
      konamiIndex = 0;
      triggerEasterEgg();
    }
  } else {
    konamiIndex = 0;
  }
}

function triggerEasterEgg() {
  showToast('Easter egg débloqué ! Merci pour votre curiosité.', 'success');
  trackEvent('ui', 'easter_egg', 'konami');
}

/* =========================================================================
 * BARRE DE CONTRÔLE HAUT (SI TU EN AS UNE)
 * ========================================================================= */

function addEnhancedControls() {
  // On suppose une barre avec id="top-controls" et une zone à droite
  // Adapte si différent
  const controlsBar = document.getElementById('top-controls');
  if (!controlsBar) return;

  let controlsRight = controlsBar.querySelector('.controls-right');
  if (!controlsRight) {
    controlsRight = document.createElement('div');
    controlsRight.className = 'controls-right';
    controlsBar.appendChild(controlsRight);
  }

  const pdfButton = controlsRight.querySelector('.pdf-button') || controlsRight.lastChild;

  // Zoom -
  const zoomOutButton = document.createElement('button');
  zoomOutButton.className = 'control-button';
  zoomOutButton.title = 'Zoom -';
  zoomOutButton.onclick = zoomOutPdf;
  zoomOutButton.innerHTML = '<i class="fas fa-search-minus"></i>';

  // Zoom reset
  const zoomResetButton = document.createElement('button');
  zoomResetButton.className = 'control-button';
  zoomResetButton.title = 'Zoom 100%';
  zoomResetButton.onclick = resetPdfZoom;
  zoomResetButton.innerHTML = '<i class="fas fa-search"></i>';

  // Zoom +
  const zoomInButton = document.createElement('button');
  zoomInButton.className = 'control-button';
  zoomInButton.title = 'Zoom +';
  zoomInButton.onclick = zoomInPdf;
  zoomInButton.innerHTML = '<i class="fas fa-search-plus"></i>';

  // Mode lecture
  const readingButton = document.createElement('button');
  readingButton.className = 'control-button';
  readingButton.title = 'Mode lecture';
  readingButton.onclick = toggleReadingMode;
  readingButton.innerHTML = '<i class="fas fa-book-open"></i>';

  // Impression
  const printButton = document.createElement('button');
  printButton.className = 'control-button';
  printButton.title = 'Imprimer';
  printButton.onclick = printPDF;
  printButton.innerHTML = '<i class="fas fa-print"></i>';

  // Thème
  const themeButton = document.createElement('button');
  themeButton.id = 'theme-toggle';
  themeButton.className = 'control-button';
  themeButton.title = 'Changer de thème';
  themeButton.onclick = toggleTheme;
  themeButton.innerHTML = '<i class="fas fa-moon"></i>';

  // Plein écran
  const fullscreenButton = document.createElement('button');
  fullscreenButton.className = 'control-button';
  fullscreenButton.title = 'Plein écran';
  fullscreenButton.onclick = toggleFullScreen;
  fullscreenButton.innerHTML = '<i class="fas fa-expand"></i>';

  // Partage (ouvre le menu de partage)
  const shareButton = document.createElement('button');
  shareButton.className = 'control-button';
  shareButton.title = 'Partager';
  shareButton.onclick = toggleShareMenu;
  shareButton.innerHTML = '<i class="fas fa-share-alt"></i>';

  // Insertion
  const refNode = pdfButton || null;
  controlsRight.insertBefore(zoomOutButton, refNode);
  controlsRight.insertBefore(zoomResetButton, refNode);
  controlsRight.insertBefore(zoomInButton, refNode);
  controlsRight.insertBefore(readingButton, refNode);
  controlsRight.insertBefore(printButton, refNode);
  controlsRight.insertBefore(themeButton, refNode);
  controlsRight.insertBefore(fullscreenButton, refNode);
  controlsRight.insertBefore(shareButton, refNode);
}

/* =========================================================================
 * INIT GLOBALE
 * ========================================================================= */

document.addEventListener('DOMContentLoaded', () => {
  console.log('Initialisation CV…');

  // Thème
  initTheme();

  // PDF
  checkPDFLoading();
  applyPdfZoom();

  // Barre contrôles
  addEnhancedControls();

  // Scroll
  initScrollUI();
  window.addEventListener('scroll', debounce(updateScrollUI, 100));

  // Batterie
  initBatterySaver();

  // Version CV
  checkCvVersion();

  // Suggestion smart
  initSmartSuggestions();

  // Analytics : chargement page
  trackEvent('page', 'load', window.location.href);

  // Message de bienvenue
  setTimeout(() => {
    showToast('Bienvenue sur mon CV !', 'success');
  }, 500);
});

// Durée de visite
window.addEventListener('beforeunload', () => {
  trackVisitDuration();
});

// Gestion clavier global
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeAllDropdowns();
    return;
  }
  handleKeydownShortcuts(event);
  handleKonamiCode(event);
});

/* =========================================================================
 * EXPORT POUR HTML
 * ========================================================================= */

window.copyToClipboard = copyToClipboard;
window.toggleMenu = toggleMenu;
window.toggleShareMenu = toggleShareMenu;
window.toggleFullScreen = toggleFullScreen;
window.toggleTheme = toggleTheme;
window.printPDF = printPDF;
window.shareOnSocial = shareOnSocial;
window.getAnalytics = getAnalytics;
window.zoomInPdf = zoomInPdf;
window.zoomOutPdf = zoomOutPdf;
window.resetPdfZoom = resetPdfZoom;
window.toggleReadingMode = toggleReadingMode;
window.togglePresentationMode = togglePresentationMode;
window.exportAnalyticsAsJson = exportAnalyticsAsJson;
window.openQrModal = openQrModal;
