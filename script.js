/* =========================================================================
 * CV Daniel Neau-Inizan — script optimisé
 * ========================================================================= */

/* --- TOASTS --- */

let toastContainer = null;

const TOAST_ICONS = {
  success: 'fa-circle-check',
  error: 'fa-circle-exclamation',
  info: 'fa-circle-info',
};

function createToastContainer() {
  if (toastContainer) return;
  toastContainer = document.createElement('div');
  toastContainer.id = 'toast-container';
  document.body.appendChild(toastContainer);
}

function showToast(message, type = 'info', duration = 3500) {
  createToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;
  toast.innerHTML = `<i class="fas ${TOAST_ICONS[type] || TOAST_ICONS.info}"></i><span>${message}</span>`;

  toastContainer.appendChild(toast);

  // Force reflow pour permettre la transition d'entrée
  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* --- CLIPBOARD --- */

function copyToClipboard(text, event) {
  if (event) event.preventDefault();
  if (!text) return;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showToast('Copié dans le presse-papiers.', 'success'))
      .catch(() => fallbackCopyToClipboard(text));
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
  } catch {
    showToast('Impossible de copier.', 'error');
  } finally {
    textarea.remove();
  }
}

/* --- MENU CONTACT (dropdown) --- */

function toggleMenu() {
  const menu = document.getElementById('contactDropdown');
  if (!menu) return;
  menu.classList.toggle('show');
}

function closeAllDropdowns() {
  document.querySelectorAll('.dropdown-content.show').forEach((menu) => {
    menu.classList.remove('show');
  });
}

// Fermer le menu si on clique en dehors
document.addEventListener('click', (event) => {
  if (!event.target.closest('.dropdown')) {
    closeAllDropdowns();
  }
});

// Fermer le menu avec Échap
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeAllDropdowns();
});

/* --- PLEIN ÉCRAN --- */

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
  if (!isFullScreen()) {
    requestFullScreen(document.documentElement);
  } else {
    exitFullScreen();
  }
}

/* --- VÉRIFICATION DU PDF --- */

function checkPDFLoading() {
  const pdf = document.querySelector('.pdf-container');
  if (!pdf) return;

  // <object> ne déclenche pas toujours 'error' de façon fiable ;
  // on vérifie aussi que le fichier est bien joignable.
  fetch(pdf.getAttribute('data'), { method: 'HEAD' })
    .then((res) => {
      if (!res.ok) showToast('Le CV PDF est introuvable.', 'error');
    })
    .catch(() => {
      // Erreur réseau/CORS silencieuse : pas bloquant pour l'affichage
    });
}

/* --- RÉSEAU --- */

window.addEventListener('offline', () => {
  showToast('Vous êtes hors ligne.', 'error');
});
window.addEventListener('online', () => {
  showToast('Connexion rétablie.', 'success');
});

/* --- INIT --- */

document.addEventListener('DOMContentLoaded', () => {
  checkPDFLoading();
});

/* --- EXPORT POUR LE HTML (attributs onclick) --- */

window.copyToClipboard = copyToClipboard;
window.toggleMenu = toggleMenu;
window.toggleFullScreen = toggleFullScreen;
