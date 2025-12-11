// ============================================
// CONFIGURATION ET CONSTANTES
// ============================================
const CONFIG = {
    TOAST_DURATION: 3000,
    DEBOUNCE_DELAY: 300,
    STORAGE_KEYS: {
        THEME: 'cv-theme-preference',
        ANALYTICS: 'cv-analytics-data'
    }
};

// ============================================
// SYSTÈME DE TOAST (NOTIFICATIONS)
// ============================================
function showToast(message, type = 'success') {
    // Supprimer les anciens toasts
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);

    // Forcer le reflow pour l'animation CSS
    toast.offsetHeight;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, CONFIG.TOAST_DURATION);
}

// ============================================
// COPIE DANS LE PRESSE-PAPIERS AMÉLIORÉE
// ============================================
async function copyToClipboard(text, event) {
    try {
        await navigator.clipboard.writeText(text);
        
        const iconElement = event.target.closest('a').querySelector('i');
        const originalClass = iconElement.className;
        const originalColor = iconElement.style.color;

        iconElement.className = "fas fa-check";
        iconElement.style.color = "#34C759";

        showToast(`Copié : ${text}`, 'success');
        trackEvent('contact', 'copy', text);

        setTimeout(() => {
            iconElement.className = originalClass;
            iconElement.style.color = originalColor;
        }, 1500);
    } catch (err) {
        console.error('Erreur copie :', err);
        
        // Fallback pour les anciens navigateurs
        fallbackCopyToClipboard(text);
        showToast('Copié (mode compatibilité)', 'success');
    }
}

function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
    } catch (err) {
        console.error('Fallback copie échouée:', err);
    }
    
    document.body.removeChild(textArea);
}

// ============================================
// GESTION DU MENU DÉROULANT
// ============================================
function toggleMenu() {
    const dropdown = document.getElementById("contactDropdown");
    dropdown.classList.toggle("show");
    
    // Accessibilité : focus sur le premier lien
    if (dropdown.classList.contains('show')) {
        const firstLink = dropdown.querySelector('a');
        if (firstLink) {
            setTimeout(() => firstLink.focus(), 100);
        }
    }
}

function closeAllDropdowns() {
    const dropdowns = document.getElementsByClassName("dropdown-content");
    for (let dropdown of dropdowns) {
        if (dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
        }
    }
}

// Fermer le menu avec Échap (accessibilité)
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeAllDropdowns();
    }
});

// Fermer le menu si on clique en dehors
window.onclick = function(event) {
    if (!event.target.matches('.control-button') && !event.target.closest('.control-button')) {
        closeAllDropdowns();
    }
};

// ============================================
// GESTION DU PLEIN ÉCRAN AMÉLIORÉE
// ============================================
function toggleFullScreen() {
    const button = event.currentTarget;
    const icon = button.querySelector('i');
    
    if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement) {
        // Entrer en plein écran
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
            elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
        
        trackEvent('ui', 'fullscreen', 'enter');
    } else {
        // Sortir du plein écran
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        
        trackEvent('ui', 'fullscreen', 'exit');
    }
}

// Mettre à jour l'icône selon l'état du plein écran
function updateFullscreenIcon() {
    const button = document.querySelector('button[onclick*="toggleFullScreen"]');
    if (!button) return;
    
    const icon = button.querySelector('i');
    if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement) {
        icon.className = 'fas fa-compress';
        button.title = 'Quitter le plein écran';
    } else {
        icon.className = 'fas fa-expand';
        button.title = 'Plein écran';
    }
}

// Écouter les changements d'état du plein écran
document.addEventListener('fullscreenchange', updateFullscreenIcon);
document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);
document.addEventListener('mozfullscreenchange', updateFullscreenIcon);
document.addEventListener('MSFullscreenChange', updateFullscreenIcon);

// ============================================
// MODE SOMBRE / CLAIR
// ============================================
function initTheme() {
    const savedTheme = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    applyTheme(newTheme);
    localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, newTheme);
    trackEvent('ui', 'theme', newTheme);
    
    showToast(`Mode ${newTheme === 'dark' ? 'sombre' : 'clair'} activé`, 'success');
}

function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    
    const themeButton = document.getElementById('theme-toggle');
    if (themeButton) {
        const icon = themeButton.querySelector('i');
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        themeButton.title = theme === 'dark' ? 'Mode clair' : 'Mode sombre';
    }
}

// ============================================
// FONCTION D'IMPRESSION
// ============================================
function printPDF() {
    const pdfObject = document.querySelector('.pdf-container');
    
    if (pdfObject && pdfObject.contentWindow) {
        try {
            pdfObject.contentWindow.print();
            trackEvent('pdf', 'print', 'success');
        } catch (err) {
            console.error('Erreur impression:', err);
            showToast('Impossible d\'imprimer. Téléchargez le PDF.', 'error');
        }
    } else {
        window.print();
        trackEvent('pdf', 'print', 'fallback');
    }
}

// ============================================
// PARTAGE SUR RÉSEAUX SOCIAUX
// ============================================
function shareOnSocial(platform) {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(document.title);
    
    const urls = {
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
        twitter: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
        email: `mailto:?subject=${title}&body=Consultez ce CV : ${url}`
    };
    
    if (urls[platform]) {
        if (platform === 'email') {
            window.location.href = urls[platform];
        } else {
            window.open(urls[platform], '_blank', 'width=600,height=400');
        }
        trackEvent('share', platform, url);
    }
}

function toggleShareMenu() {
    const shareMenu = document.getElementById('shareDropdown');
    if (shareMenu) {
        shareMenu.classList.toggle('show');
    }
}

// ============================================
// DÉTECTION DU CHARGEMENT DU PDF
// ============================================
function checkPDFLoading() {
    const pdfObject = document.querySelector('.pdf-container');
    
    if (pdfObject) {
        pdfObject.addEventListener('load', () => {
            console.log('PDF chargé avec succès');
            trackEvent('pdf', 'load', 'success');
        });
        
        pdfObject.addEventListener('error', () => {
            console.error('Erreur de chargement du PDF');
            showToast('Erreur de chargement du PDF', 'error');
            trackEvent('pdf', 'load', 'error');
        });
    }
}

// ============================================
// ANALYTICS ET TRACKING
// ============================================
function trackEvent(category, action, label) {
    const event = {
        category,
        action,
        label,
        timestamp: new Date().toISOString()
    };
    
    // Sauvegarder dans localStorage
    const analytics = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.ANALYTICS) || '[]');
    analytics.push(event);
    
    // Garder seulement les 100 derniers événements
    if (analytics.length > 100) {
        analytics.shift();
    }
    
    localStorage.setItem(CONFIG.STORAGE_KEYS.ANALYTICS, JSON.stringify(analytics));
    
    // Si Google Analytics est présent
    if (typeof gtag !== 'undefined') {
        gtag('event', action, {
            'event_category': category,
            'event_label': label
        });
    }
    
    console.log('Événement tracké:', event);
}

function getAnalytics() {
    return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.ANALYTICS) || '[]');
}

// Tracker le téléchargement du PDF
document.addEventListener('DOMContentLoaded', () => {
    const downloadLink = document.querySelector('a[download]');
    if (downloadLink) {
        downloadLink.addEventListener('click', () => {
            trackEvent('pdf', 'download', downloadLink.href);
            showToast('Téléchargement du PDF...', 'success');
        });
    }
});

// ============================================
// DEBOUNCING UTILITY
// ============================================
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// ============================================
// AJOUT DES NOUVEAUX BOUTONS
// ============================================
function addEnhancedControls() {
    const controlsRight = document.querySelector('.controls-group:last-child');
    
    if (!controlsRight) return;
    
    // Bouton Mode Sombre/Clair
    const themeButton = document.createElement('button');
    themeButton.id = 'theme-toggle';
    themeButton.className = 'control-button';
    themeButton.onclick = toggleTheme;
    themeButton.title = 'Mode sombre';
    themeButton.innerHTML = '<i class="fas fa-moon"></i>';
    
    // Bouton Impression
    const printButton = document.createElement('button');
    printButton.className = 'control-button';
    printButton.onclick = printPDF;
    printButton.title = 'Imprimer';
    printButton.innerHTML = '<i class="fas fa-print"></i>';
    
    // Bouton Partage
    const shareContainer = document.createElement('div');
    shareContainer.className = 'dropdown';
    shareContainer.innerHTML = `
        <button onclick="toggleShareMenu()" class="control-button" title="Partager">
            <i class="fas fa-share-alt"></i>
        </button>
        <div id="shareDropdown" class="dropdown-content">
            <a href="#" onclick="shareOnSocial('linkedin'); return false;">
                <i class="fab fa-linkedin"></i>
                <span class="info-text">LinkedIn</span>
            </a>
            <a href="#" onclick="shareOnSocial('twitter'); return false;">
                <i class="fab fa-twitter"></i>
                <span class="info-text">Twitter</span>
            </a>
            <a href="#" onclick="shareOnSocial('facebook'); return false;">
                <i class="fab fa-facebook"></i>
                <span class="info-text">Facebook</span>
            </a>
            <a href="#" onclick="shareOnSocial('email'); return false;">
                <i class="fas fa-envelope"></i>
                <span class="info-text">Email</span>
            </a>
        </div>
    `;
    
    // Insérer les boutons avant le bouton PDF
    const pdfButton = controlsRight.querySelector('.primary');
    controlsRight.insertBefore(themeButton, pdfButton);
    controlsRight.insertBefore(printButton, pdfButton);
    controlsRight.insertBefore(shareContainer, pdfButton);
}

// ============================================
// NETTOYAGE DES BARRES DE CONTRÔLE DUPLIQUÉES
// ============================================
function cleanupDuplicateControlBars() {
    const controlBars = document.querySelectorAll('.custom-controls');
    if (controlBars.length > 1) {
        for (let i = 1; i < controlBars.length; i++) {
            controlBars[i].remove();
        }
    }
}

// ============================================
// GESTION DU RESIZE (DEBOUNCED)
// ============================================
const handleResize = debounce(() => {
    console.log('Fenêtre redimensionnée');
    trackEvent('ui', 'resize', `${window.innerWidth}x${window.innerHeight}`);
}, CONFIG.DEBOUNCE_DELAY);

window.addEventListener('resize', handleResize);

// ============================================
// INITIALISATION AU CHARGEMENT DE LA PAGE
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initialisation du CV amélioré...');
    
    // Nettoyage
    cleanupDuplicateControlBars();
    
    // Ajouter les nouveaux contrôles
    addEnhancedControls();
    
    // Initialiser le thème
    initTheme();
    
    // Vérifier le chargement du PDF
    checkPDFLoading();
    
    // Tracker le chargement de la page
    trackEvent('page', 'load', window.location.href);
    
    console.log('✅ Initialisation terminée');
    
    // Afficher un message de bienvenue
    setTimeout(() => {
        showToast('Bienvenue sur mon CV !', 'success');
    }, 500);
});

// ============================================
// GESTION DE LA VISIBILITÉ DE LA PAGE
// ============================================
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        trackEvent('page', 'hidden', 'user_left');
    } else {
        trackEvent('page', 'visible', 'user_returned');
    }
});

// ============================================
// EXPORT DES FONCTIONS GLOBALES
// ============================================
window.copyToClipboard = copyToClipboard;
window.toggleMenu = toggleMenu;
window.toggleFullScreen = toggleFullScreen;
window.toggleTheme = toggleTheme;
window.printPDF = printPDF;
window.shareOnSocial = shareOnSocial;
window.toggleShareMenu = toggleShareMenu;
window.getAnalytics = getAnalytics;
