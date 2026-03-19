import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence, updatePassword, sendPasswordResetEmail, signInWithCustomToken, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- 0. INYECCIÓN DE MANIFIESTO PWA --
const manifest = {
    "name": "IMNUFIT Portal",
    "short_name": "IMNUFIT",
    "start_url": ".",
    "display": "standalone",
    "background_color": "#FBFBFC",
    "theme_color": "#FBFBFC",
    "icons": [{
        "src": "https://imnufit.com/wp-content/uploads/2026/01/IMG_8520.png",
        "sizes": "512x512",
        "type": "image/png",
        "purpose": "any maskable"
    }]
};
const blob = new Blob([JSON.stringify(manifest)], {type: 'application/json'});
const link = document.createElement('link');
link.rel = 'manifest';
link.href = URL.createObjectURL(blob);
document.head.appendChild(link);

// --- 1. CONFIGURACIÓN ---
const firebaseConfig = {
    apiKey: "AIzaSyAJBf7TbP1GuAoA3GsrCG0EJOifEt4YodY",
    authDomain: "imnufit-cad14.firebaseapp.com",
    projectId: "imnufit-cad14",
    storageBucket: "imnufit-cad14.firebasestorage.app",
    messagingSenderId: "65610345018",
    appId: "1:65610345018:web:eac15a30c72084faac6303"
};

const AIRTABLE_PAT = "patZ9QUQVyldn9zKC.afb4fc362eb2f79b1aa10faf3fb3268ea6bca3f57a1362b83f6cc8459a50f0d3"; 
const AIRTABLE_BASE_ID = "appCHcm7XPzeoyBCs"; 
const AIRTABLE_TABLE_NAME = "Pacientes"; 

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'imnufit-official';

const _partA = "AIzaSyCPDuual8XB";
const _partB = "ejuVUPbKecfonbIh6SNolDk";
const apiKey = _partA + _partB;

// Variables Globales
const SPECIALIST_EMAIL = "imnufit@gmail.com";
let isSpecialistMode = false;
let specModeSelection = "sin_programa"; // Por defecto usa lo que diga Airtable
let aiCustomInstructions = ""; 
let cachedAirtableData = null;
let currentAppData = null; 
let chatHistory = [];
let notificationTimer = null;
let inactivityTimeout;
const INACTIVITY_LIMIT = 10 * 60 * 1000; 

// Variables para manejo de imágenes
let currentImageBase64 = null;
let currentImageMime = null;

const CALENDAR_LINK_DEFAULT = "https://calendar.app.google/CE4KjKxPeFiV93GV7";
const PLANES_LINK = "https://imnufit.com/planes-y-precios/";
const WHATSAPP_COMMUNITY_LINK = "https://chat.whatsapp.com/FNoToJXy8HO7iLVhPseQHB";

const PROGRAMAS_INFO = {
    "Adiós Diabetes 2": {
        img: "https://imnufit.com/wp-content/uploads/2024/04/Imagen-de-WhatsApp-2024-04-30-a-las-18.35.48_16bb1ed2.jpg",
        imgWidth: "w-48 md:w-56",
        meses: {
            1: [{ label: "Guía Nutricional - Mes 1", desc: "Desintoxicación", url: "https://imnufit.com/wp-content/uploads/2025/12/Mes-1-Nueva-Edicion.pdf", type: "PDF" }],
            2: [{ label: "Guía Nutricional - Mes 2", desc: "Control Glucémico", url: "https://imnufit.com/wp-content/uploads/2025/12/Mes-2-Nueva-Edicion.pdf", type: "PDF" }],
            3: [{ label: "Guía Nutricional - Mes 3", desc: "Mantenimiento", url: "https://imnufit.com/wp-content/uploads/2025/12/Mes-3-Nueva-Edicion.pdf", type: "PDF" }]
        }
    },
    "Quema Grasa": {
        img: "https://imnufit.com/wp-content/uploads/2022/04/qg.png",
        imgWidth: "w-36 md:w-40",
        monthTitles: { 1: "MES 1 - DEPURACIÓN", 2: "MES 2 - SACIEDAD", 3: "MES 3 - AYUNO INICIAL", 4: "MES 4 - AYUNO 16-18" },
        meses: {
            1: [
                { label: "Guía PDF Descargable", desc: "Objetivo: Eliminar comestibles dañinos.", url: "https://imnufit.com/wp-content/uploads/2025/12/Mes-1-Completo-Depuracion.pdf", type: "PDF" },
                { label: "Video Explicativo", desc: "Resúmen del mes.", url: "https://youtu.be/iO5ihFR8Vrg", type: "VIDEO" }
            ],
            2: [
                { label: "Guía PDF Descargable", desc: "Objetivo: Nutrición densa.", url: "https://imnufit.com/wp-content/uploads/2025/12/Mes-2-Completo-Saciedad.pdf", type: "PDF" },
                { label: "Video Explicativo", desc: "Resúmen del mes.", url: "https://youtu.be/AeIQAgoc0Fc", type: "VIDEO" }
            ],
            3: [
                { label: "Guía PDF Descargable", desc: "Objetivo: Ayuno natural.", url: "https://imnufit.com/wp-content/uploads/2025/12/Mes-3-Completo-Ayuno-Inicial.pdf", type: "PDF" },
                { label: "Video Explicativo", desc: "Resúmen del mes.", url: "https://youtu.be/CTevX300uG8", type: "VIDEO" }
            ],
            4: [
                { label: "Guía PDF Descargable", desc: "Objetivo: Ayuno prolongado.", url: "https://imnufit.com/wp-content/uploads/2025/12/Mes-4-Completo-Ayuno16-18.pdf", type: "PDF" },
                { label: "Video Explicativo", desc: "Resúmen del mes.", url: "https://youtu.be/15VyQaKcOU4", type: "VIDEO" }
            ]
        }
    },
    "SANO": { 
        img: "https://imnufit.com/wp-content/uploads/2023/11/Sano-logo-1-e1755541161822.png", 
        imgWidth: "w-32 md:w-36",
        meses: {
            1: [{ label: "Manual SANO - Mes 1", desc: "Alimentación Consciente", url: "https://imnufit.com/wp-content/uploads/2023/12/SANO-MES-1.pdf", type: "PDF" }],
            2: [{ label: "Manual SANO - Mes 2", desc: "Nuevos Hábitos", url: "https://imnufit.com/wp-content/uploads/2024/02/SANO-Mes-2.pdf", type: "PDF" }]
        }
    }
};

const frasesCreyentes = [
    "Todo lo puedo en Cristo que me fortalece. - Filipenses 4:13", 
    "Nuevas son sus misericordias cada mañana. - Lamentaciones 3:23", 
    "Jehová es mi pastor; nada me faltará. - Salmos 23:1",
    "Jehová es mi fortaleza y mi escudo. - Salmos 28:7", 
    "Fíate de Jehová de todo tu corazón. - Proverbios 3:5", 
    "Mira que te mando que te esfuerces y seas valiente. - Josué 1:9"
];

// --- 2. FUNCIONES DE UTILIDAD ---
window.safeSetText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
window.safeUpdate = (id, fn) => { const el = document.getElementById(id); if (el) fn(el); };

window.notify = (msg, type = 'error') => {
    const t = document.getElementById('notification-toast');
    const c = document.getElementById('notification-content');
    if (t && c) {
        if (notificationTimer) clearTimeout(notificationTimer);
        c.innerHTML = msg;
        const colorClass = type === 'success' ? 'text-emerald-600 border-emerald-100' : 'text-red-600 border-red-100';
        t.className = `fixed top-8 left-1/2 -translate-x-1/2 z-[9999] px-8 py-4 rounded-full shadow-2xl text-[13px] font-semibold bg-white border transform transition-all duration-300 ${colorClass}`;
        t.classList.remove('hidden', 'opacity-0', '-translate-y-10');
        t.classList.add('flex', 'opacity-100', 'translate-y-0');
        notificationTimer = setTimeout(() => {
            t.classList.remove('opacity-100', 'translate-y-0');
            t.classList.add('opacity-0', '-translate-y-10');
            setTimeout(() => { t.classList.add('hidden'); t.classList.remove('flex'); }, 300);
        }, 5000);
    } else { alert(msg); }
};

// --- OPTIMIZACIÓN: THROTTLE PARA INACTIVIDAD ---
let inactivityThrottle = false;
window.resetInactivityTimer = () => {
    if (inactivityThrottle) return;
    inactivityThrottle = true;
    setTimeout(() => { inactivityThrottle = false; }, 2000); 

    if (!auth.currentUser) return;
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(() => {
        window.notify("Sesión cerrada por inactividad", "error");
        window.cerrarSesion();
    }, INACTIVITY_LIMIT);
};

// Escuchar cambios de visibilidad para pausar animaciones (Cool Phone Mode)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        document.body.classList.add('paused-animations');
    } else {
        document.body.classList.remove('paused-animations');
    }
});

['mousemove', 'mousedown', 'click', 'scroll', 'keypress', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, window.resetInactivityTimer, { passive: true });
});

window.showView = (id, save = true) => {
    const views = ['login-view', 'signup-view', 'patient-view', 'membership-view', 'program-detail-view', 'forgot-password-view', 'contact-view', 'mobile-ai-view'];
    views.forEach(v => { const el = document.getElementById(v); if (el) el.classList.toggle('hidden', v !== id); });
    window.scrollTo(0, 0);
    if (save) history.pushState({ viewId: id }, "", "");
};

window.resetUI = () => {
    cachedAirtableData = null; currentAppData = null; chatHistory = []; isSpecialistMode = false;
    window.removeImage();
    window.safeSetText('display-nombre', "..."); window.safeSetText('display-estatus', "...");
    window.safeSetText('display-frase', "..."); window.safeSetText('plan-banner-title', "...");
    window.safeSetText('acc-nombre', "..."); window.safeSetText('acc-email', "--");
    window.safeSetText('acc-pais', "--"); window.safeSetText('acc-telefono', "--"); window.safeSetText('acc-nacimiento', "--");
    document.getElementById('specialist-panel')?.classList.add('hidden');
    document.getElementById('featured-plan-banner')?.classList.add('hidden');
    document.getElementById('restricted-banner')?.classList.add('hidden');
    document.getElementById('card-ai')?.classList.remove('hidden'); 
    window.clearChat();
    // AÑADIDO card-upload AL RESET
    ['card-entrenamientos', 'card-reporte', 'card-citas', 'card-consultas', 'card-community', 'card-install-app-main', 'card-upload'].forEach(id => { 
        document.getElementById(id)?.classList.add('hidden'); 
    });
    clearTimeout(inactivityTimeout);
};

window.formatDateMDY = (dateString) => {
    if (!dateString) return "--";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; 
    return `${String(date.getUTCMonth() + 1).padStart(2, '0')}/${String(date.getUTCDate()).padStart(2, '0')}/${date.getUTCFullYear()}`;
};

window.getGreeting = () => {
    const h = new Date().getHours();
    if (h >= 6 && h < 12) return { text: "Buenos días", icon: "☀️" };
    if (h >= 12 && h < 18) return { text: "Buenas tardes", icon: "☀️" };
    return { text: "Buenas noches", icon: "🌙" };
};

window.getStatusClass = (s) => {
    if (!s) return "bg-slate-50 text-slate-400 border-slate-100";
    const sl = String(s).toLowerCase();
    if (sl.includes("inactivo")) return "bg-rose-50 text-red-600 border-rose-200";
    if (sl.includes("activo") || sl.includes("actívo")) return "bg-emerald-50 text-emerald-600 border-emerald-100";
    return "bg-amber-50 text-amber-600 border-amber-100";
};

window.getProgramKey = (p) => {
    if (!p) return null;
    const pl = p.toLowerCase();
    if (pl.includes("quema grasa")) return "Quema Grasa";
    if (pl.includes("sano")) return "SANO";
    if (pl.includes("adiós diabetes 2") || pl.includes("adios diabetes 2")) return "Adiós Diabetes 2";
    return null;
};

window.parseAIResponse = (text) => {
    if (!text) return "";
    let html = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em class="italic text-slate-600">$1</em>');
    html = html.replace(/\[([^\]]+)\]\(function:([a-zA-Z0-9-]+)\)/g, `<button type="button" onclick="window.handleAIAction('$2')" class="mt-3 flex items-center gap-2 bg-[#2E4982]/10 text-[#2E4982] px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#2E4982] hover:text-white transition-all shadow-sm w-full md:w-auto justify-center md:justify-start"><span>$1</span></button>`);
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, `<a href="$2" target="_blank" class="mt-3 flex items-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-100 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-sm w-full md:w-auto justify-center md:justify-start decoration-0"><span>$1</span></a>`);
    html = html.replace(/^\s*-\s+(.*)$/gm, '<li class="ml-4 list-disc marker:text-[#2E4982] pl-1 mb-1">$1</li>');
    html = html.replace(/(<li.*<\/li>)/s, '<ul class="my-2 space-y-1 text-left">$1</ul>');
    html = html.replace(/\n/g, '<br>');
    return html;
};

window.scrollToBottom = () => {
    const m = document.getElementById('ai-messages-mobile'), d = document.getElementById('ai-messages-desktop');
    if(m) m.scrollTop = m.scrollHeight; if(d) d.scrollTop = d.scrollHeight;
};

// --- FUNCIONES PARA IMÁGENES ---

window.handleImageSelect = (input) => {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_WIDTH = 1024;
                const MAX_HEIGHT = 1024;

                if (width > height) {
                    if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                } else {
                    if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);
                
                const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
                currentImageBase64 = dataUrl.split(',')[1];
                currentImageMime = "image/jpeg";

                const previews = document.querySelectorAll('.image-preview-container');
                previews.forEach(div => {
                    div.innerHTML = `
                        <div class="relative inline-block mt-2">
                            <img src="${dataUrl}" class="h-16 w-auto rounded-xl border border-slate-200 shadow-sm">
                            <button type="button" onclick="window.removeImage()" class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l18 18"></path></svg>
                            </button>
                        </div>`;
                    div.classList.remove('hidden');
                });
            }
            img.src = e.target.result;
        }
        reader.readAsDataURL(file);
    }
};

window.removeImage = () => {
    currentImageBase64 = null;
    currentImageMime = null;
    const previews = document.querySelectorAll('.image-preview-container');
    previews.forEach(div => {
        div.innerHTML = '';
        div.classList.add('hidden');
    });
    document.querySelectorAll('input[type="file"]').forEach(i => i.value = '');
};

window.appendChatMessageToAll = (role, text, imageSrc = null) => {
    const content = role === 'ai' ? window.parseAIResponse(text) : text.replace(/\n/g, '<br>');
    
    let imageHtml = '';
    if (imageSrc) {
        imageHtml = `<div class="mb-2"><img src="${imageSrc}" class="max-w-[200px] max-h-[200px] rounded-xl border border-white/20 shadow-sm"></div>`;
    }

    const html = `
        <div class="flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-6 fade-in text-left">
            <div class="max-w-[85%] px-5 py-4 rounded-[1.4rem] text-[14px] leading-relaxed ${role === 'user' ? 'bg-[#2E4982] text-white rounded-tr-sm' : 'bg-white border border-slate-100 text-slate-600 rounded-tl-sm shadow-sm'}">
                ${imageHtml}
                ${content}
            </div>
        </div>`;
    
    const m = document.getElementById('ai-messages-mobile');
    const d = document.getElementById('ai-messages-desktop');
    if (m) {
        m.insertAdjacentHTML('beforeend', html);
        if(role === 'user') m.scrollTop = m.scrollHeight;
        else { const last = m.lastElementChild; if(last) requestAnimationFrame(() => last.scrollIntoView({behavior:'smooth', block:'start'})); }
    }
    if (d) {
        d.insertAdjacentHTML('beforeend', html);
        if(role === 'user') d.scrollTop = d.scrollHeight;
        else { const last = d.lastElementChild; if(last) requestAnimationFrame(() => last.scrollIntoView({behavior:'smooth', block:'start'})); }
    }
};

window.clearChat = () => {
    chatHistory = [];
    const info = currentAppData?.["Nombre + Edad"] || "Paciente";
    const welcome = `Hola <strong>${info.split(' ')[0]}</strong>, soy tu asistente personal. ¿En qué puedo guiarte hoy?`;
    const html = `<div class="flex justify-center mb-8"><p class="text-xs text-slate-400 font-medium uppercase tracking-widest">Hoy</p></div><div class="flex justify-start fade-in"><div class="max-w-[90%] bg-white border border-slate-100 px-6 py-4 rounded-[1.5rem] rounded-tl-sm text-[15px] leading-relaxed text-slate-600 shadow-sm">${welcome}</div></div>`;
    const m = document.getElementById('ai-messages-mobile'), d = document.getElementById('ai-messages-desktop');
    if(m) m.innerHTML = html; if(d) d.innerHTML = html;
};

window.handleAIAction = (viewId) => { window.closeDesktopAIModal(); if (viewId === 'program-detail-view') window.viewProgramResources(); else window.showView(viewId); };
window.openDesktopAIModal = () => { const m = document.getElementById('ai-modal-overlay'); if(m){ m.classList.remove('hidden'); m.classList.add('flex'); setTimeout(() => { m.classList.remove('opacity-0'); m.querySelector('div')?.classList.remove('scale-95', 'opacity-0'); document.getElementById('ai-input-desktop')?.focus(); }, 10); }};
window.closeDesktopAIModal = () => { const m = document.getElementById('ai-modal-overlay'); if(!m) return; m.classList.add('opacity-0'); m.querySelector('div')?.classList.add('scale-95', 'opacity-0'); setTimeout(() => { m.classList.add('hidden'); m.classList.remove('flex'); window.clearChat(); }, 300); };
window.openAIChat = () => { if (window.innerWidth < 768) { window.showView('mobile-ai-view'); setTimeout(() => document.getElementById('ai-input-mobile')?.focus(), 300); } else window.openDesktopAIModal(); };
window.closeMobileChat = () => { window.showView('patient-view'); window.clearChat(); };
window.openAITrainingModal = () => { document.getElementById('ai-training-modal')?.classList.remove('hidden'); document.getElementById('ai-training-modal')?.classList.add('flex'); };
window.closeAITrainingModal = () => { document.getElementById('ai-training-modal')?.classList.add('hidden'); };

window.currentRecognition = null;
window.isConversationMode = false;
window.currentAudio = null;

window.startVoiceRecognition = (source, isAutoRestart = false) => {
    const input = document.getElementById(source === 'mobile' ? 'ai-input-mobile' : 'ai-input-desktop');
    const btn = document.getElementById(source === 'mobile' ? 'btn-mic-mobile' : 'btn-mic-desktop');

    // Si el paciente toca el botón manualmente para APAGAR el bucle
    if (!isAutoRestart && window.isConversationMode) {
        window.isConversationMode = false;
        if (window.currentRecognition) window.currentRecognition.abort();
        if (window.currentAudio) window.currentAudio.pause();
        
        input.placeholder = source === 'mobile' ? "Escribe o envía una foto..." : "Pregunta...";
        btn.classList.remove('text-red-500', 'animate-pulse');
        btn.classList.add('text-slate-400');
        return;
    }

    // Encender o mantener Modo Conversación
    window.isConversationMode = true;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { window.notify("Tu navegador no soporta voz.", "error"); return; }
    
    const recognition = new SpeechRecognition();
    window.currentRecognition = recognition;
    
    recognition.lang = 'es-ES';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    
    recognition.onstart = () => {
        input.placeholder = "Escuchando... (Modo Manos Libres)";
        btn.classList.add('text-red-500', 'animate-pulse');
        btn.classList.remove('text-slate-400');
    };
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        input.value = transcript;
        window.lastInteractionWasVoice = true; 
        
        // Pausa visual mientras la IA piensa
        input.placeholder = "Procesando...";
        btn.classList.remove('animate-pulse');
        window.currentRecognition = null; 
        
        window.sendMessageToAI(source);
    };
    
    recognition.onerror = (event) => { 
        // Silenciamos errores menores (ej: no hablar) para que el loop no se rompa
    };
    
    recognition.onend = () => {
        // Reiniciar el loop automáticamente si hay silencio prolongado (y la IA no está procesando)
        if (window.isConversationMode && !window.lastInteractionWasVoice) {
            setTimeout(() => { if (window.isConversationMode) window.startVoiceRecognition(source, true); }, 300);
        }
    };
    
    try { recognition.start(); } catch(e) {}
};
window.updateSpecMode = (val) => { specModeSelection = val; window.refreshUIWithData(); window.showView('patient-view'); };

window.showInstallInstructions = () => {
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /ipad|iphone|ipod/.test(ua) && !window.MSStream;
    const isAndroid = /android/.test(ua);
    const isMac = /macintosh|mac os x/.test(ua);
    const isChrome = /chrome/.test(ua) && !/edg/.test(ua);
    const isSafari = /safari/.test(ua) && !isChrome;
    const isChromeIOS = isIOS && /crios/.test(ua);
    
    let msg = "";
    let title = "";
    
    if (isIOS) {
        title = "iPhone / iPad";
        if (isChromeIOS) {
            msg = `
            <div class="text-center space-y-6">
                <div class="bg-slate-50 p-4 rounded-3xl inline-block border border-slate-100 shadow-sm">
                    <svg class="w-10 h-10 text-[#2E4982]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                </div>
                <div><h3 class="text-xl font-bold text-slate-800">${title} (Chrome)</h3></div>
                <div class="text-left bg-slate-50 p-5 rounded-2xl border border-slate-100 text-sm text-slate-600 space-y-4">
                    <p class="flex items-start gap-3">
                        <span class="bg-white border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                        <span>Busca el botón <strong>Compartir</strong> <svg class="w-4 h-4 inline text-[#2E4982] align-text-bottom" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg> arriba, al lado de la barra de dirección.</span>
                    </p>
                    <p class="flex items-start gap-3">
                        <span class="bg-white border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                        <span>Si no lo ves, toca los <strong>tres puntos (...)</strong> y busca "Añadir a pantalla de inicio".</span>
                    </p>
                    <p class="flex items-start gap-3">
                        <span class="bg-white border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                        <span>Confirma pulsando <strong>"Añadir"</strong>.</span>
                    </p>
                </div>
            </div>`;
        } else {
            msg = `
            <div class="text-center space-y-6">
                <div class="bg-slate-50 p-4 rounded-3xl inline-block border border-slate-100 shadow-sm">
                    <svg class="w-10 h-10 text-[#2E4982]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                </div>
                <div><h3 class="text-xl font-bold text-slate-800">${title} (Safari)</h3></div>
                <ol class="text-sm text-slate-600 space-y-3 text-left bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <li class="flex gap-3"><span class="bg-white border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center font-bold text-[10px] shrink-0">1</span> <span>Toca el botón <strong>Compartir</strong> <svg class="w-4 h-4 inline text-[#2E4982] align-text-bottom" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg> <strong>abajo</strong> en la barra central.</span></li>
                    <li class="flex gap-3"><span class="bg-white border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center font-bold text-[10px] shrink-0">2</span> <span>Desliza hacia arriba y selecciona <strong>"Agregar a Inicio"</strong>.</span></li>
                </ol>
            </div>`;
        }
    } else if (isAndroid) {
        msg = `
        <div class="text-center space-y-6">
            <div class="bg-slate-50 p-4 rounded-3xl inline-block border border-slate-100 shadow-sm">
                <svg class="w-10 h-10 text-[#2E4982]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
            </div>
            <div><h3 class="text-xl font-bold text-slate-800">Android</h3></div>
            <ol class="text-sm text-slate-600 space-y-3 text-left bg-slate-50 p-5 rounded-2xl border border-slate-100">
                 <li class="flex gap-3"><span class="bg-white border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center font-bold text-[10px] shrink-0">1</span> <span>Toca el menú de opciones (los tres puntos <span class="font-bold">⋮</span>) arriba a la derecha.</span></li>
                 <li class="flex gap-3"><span class="bg-white border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center font-bold text-[10px] shrink-0">2</span> <span>Selecciona <strong>"Instalar aplicación"</strong> o "Añadir a pantalla de inicio".</span></li>
            </ol>
        </div>`;
    } else {
        if (isMac && isSafari) {
            msg = `
              <div class="text-center space-y-6">
                <div class="bg-slate-50 p-4 rounded-3xl inline-block border border-slate-100 shadow-sm">
                    <svg class="w-10 h-10 text-[#2E4982]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                </div>
                <div><h3 class="text-xl font-bold text-slate-800">Mac (Safari)</h3></div>
                <div class="text-left bg-slate-50 p-5 rounded-2xl border border-slate-100 text-sm text-slate-600 space-y-4">
                    <p class="flex items-start gap-3">
                        <span class="bg-white border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                        <span>Haz clic en el botón <strong>Compartir</strong> <svg class="w-4 h-4 inline text-[#2E4982] align-text-bottom" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg> en la barra de herramientas superior.</span>
                    </p>
                    <p class="flex items-start gap-3">
                         <span class="bg-white border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                         <span>Selecciona <strong>"Agregar al Dock"</strong>.</span>
                    </p>
                </div>
            </div>`;
        } else if (isChrome) {
            msg = `
              <div class="text-center space-y-6">
                <div class="bg-slate-50 p-4 rounded-3xl inline-block border border-slate-100 shadow-sm">
                    <svg class="w-10 h-10 text-[#2E4982]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                </div>
                <div><h3 class="text-xl font-bold text-slate-800">PC / Mac (Chrome)</h3></div>
                <div class="text-left bg-slate-50 p-5 rounded-2xl border border-slate-100 text-sm text-slate-600 space-y-4">
                    <p class="flex items-start gap-3">
                        <span class="bg-white border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                        <span>Haz clic en los <strong>tres puntos verticales (⋮)</strong> arriba a la derecha del navegador.</span>
                    </p>
                    <p class="flex items-start gap-3">
                         <span class="bg-white border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                         <span>Ve a <strong>"Guardar y compartir"</strong> (o "Transmitir, guardar y compartir").</span>
                    </p>
                    <p class="flex items-start gap-3">
                         <span class="bg-white border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                         <span>Haz clic en <strong>"Instalar página como aplicación..."</strong>.</span>
                    </p>
                </div>
            </div>`;
        } else {
              msg = `
              <div class="text-center space-y-6">
                <div class="bg-slate-50 p-4 rounded-3xl inline-block border border-slate-100 shadow-sm">
                    <svg class="w-10 h-10 text-[#2E4982]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                </div>
                <div><h3 class="text-xl font-bold text-slate-800">Instalar App</h3></div>
                <div class="text-left bg-slate-50 p-5 rounded-2xl border border-slate-100 text-sm text-slate-600 space-y-4">
                    <p>Busca la opción <strong>"Instalar"</strong> o <strong>"Agregar a pantalla de inicio"</strong> en el menú de tu navegador.</p>
                </div>
            </div>`;
        }
    }

    const modal = document.getElementById('install-modal');
    const content = document.getElementById('install-modal-content');
    if(modal && content) {
        content.innerHTML = msg + `<button onclick="document.getElementById('install-modal').classList.add('hidden')" class="w-full bg-[#2E4982] text-white py-4 rounded-xl font-bold text-xs uppercase shadow-xl tracking-widest hover:scale-[1.02] transition-transform mt-6">Entendido</button>`;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};

window.syncAIInstructions = async () => {
    if (!auth.currentUser) return;
    const aiDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'ai_config', 'instructions');
    onSnapshot(aiDocRef, (snap) => {
        const textEl = document.getElementById('ai-training-text');
        const infoEl = document.getElementById('ai-last-update');
        if (snap.exists()) {
            const data = snap.data();
            aiCustomInstructions = data.content || "";
            if(textEl && document.activeElement !== textEl) textEl.value = aiCustomInstructions;
            if(infoEl) {
                const date = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleString() : "Desconocido";
                const user = data.updatedBy || "Sistema";
                infoEl.innerHTML = `Última modificación: <strong>${date}</strong><br>Por: ${user}`;
            }
        }
    }, (err) => console.log("AI Sync Active"));
};

window.saveAITraining = async () => {
    const text = document.getElementById('ai-training-text').value;
    const btn = document.getElementById('btn-save-ai-training');
    if (!auth.currentUser) return;
    btn.disabled = true; btn.textContent = "Guardando...";
    try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'ai_config', 'instructions'), { 
            content: text, 
            updatedBy: auth.currentUser?.email, 
            timestamp: new Date() 
        });
        window.notify("Entrenamiento guardado", "success"); 
        window.closeAITrainingModal();
    } catch (e) { window.notify("Error al guardar"); }
    finally { btn.disabled = false; btn.textContent = "Guardar Cambios"; }
};

async function fetchWithRetry(url, options, retries = 3) {
    const backoffs = [1000, 2000, 4000, 8000];
    for (let i = 0; i <= retries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.status === 429) {
                if (i === retries) throw new Error("quota-exceeded");
                await new Promise(r => setTimeout(r, backoffs[i]));
                continue;
            }
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            if (i === retries || error.message === "quota-exceeded") throw error;
            await new Promise(r => setTimeout(r, backoffs[i]));
        }
    }
}

window.sendMessageToAI = async (source) => {
    const input = document.getElementById(source === 'mobile' ? 'ai-input-mobile' : 'ai-input-desktop');
    const userMsg = input?.value.trim();
    
    if (!window.lastInteractionWasVoice) {
        window.isConversationMode = false;
        if (window.currentRecognition) { window.currentRecognition.abort(); window.currentRecognition = null; }
        if (window.currentAudio) { window.currentAudio.pause(); window.currentAudio = null; }
        const btn = document.getElementById(source === 'mobile' ? 'btn-mic-mobile' : 'btn-mic-desktop');
        if(btn) { btn.classList.remove('text-red-500', 'animate-pulse'); btn.classList.add('text-slate-400'); }
    }

    if (!userMsg && !currentImageBase64) return;
    
    const msgToSend = userMsg || (currentImageBase64 ? "Analiza esta imagen." : "");
    input.value = ''; if(source === 'mobile') input.blur();

    let displayImg = currentImageBase64 ? `data:${currentImageMime};base64,${currentImageBase64}` : null;
    window.appendChatMessageToAll('user', msgToSend, displayImg);
    
    const imageToSend = currentImageBase64;
    const mimeToSend = currentImageMime;
    window.removeImage();

    const loaderHtml = `<div class="ai-loading-indicator flex justify-start mb-4"><div class="bg-slate-100 text-slate-400 px-4 py-2 rounded-2xl text-[11px] animate-pulse italic">Analizando...</div></div>`;
    const m = document.getElementById('ai-messages-mobile');
    const d = document.getElementById('ai-messages-desktop');
    if(m) { m.insertAdjacentHTML('beforeend', loaderHtml); m.scrollTop = m.scrollHeight; }
    if(d) { d.insertAdjacentHTML('beforeend', loaderHtml); d.scrollTop = d.scrollHeight; }

    const info = currentAppData || {};
    const patientData = JSON.stringify(info, null, 2);
    const now = new Date();
    const fechaHora = now.toLocaleString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const sysPrompt = `Eres el Asistente Personal AI de IMNUFIT. Hablas con **${info["Nombre + Edad"] || "Paciente"}**. 
    
    --- CONTEXTO ACTUAL ---
    Fecha y Hora del Paciente: ${fechaHora}

    --- DATOS DEL PACIENTE (AIRTABLE) ---
    ${patientData}
    -------------------------------------

    INSTRUCCIONES CLAVE DEL ADMINISTRADOR: ${aiCustomInstructions}
    
    DIRECTRICES ESTRICTAS:
    1. Estilo: Responde de forma clara, precisa, amable y fluida. NO uses caracteres extraños. Respeta el formato de **negritas** y signos de puntuación.
    2. Formato Enlaces: Cuando des un enlace, MUESTRA UN BOTÓN usando el formato Markdown: [Texto del Botón](URL o funcion).
    3. Alcance: NUNCA respondas preguntas que no tengan nada que ver con IMNUFIT o la salud del paciente.
    4. Prioridad Datos: Para preguntas sobre dieta o plan, usa SOLO la información de Airtable (arriba).
    5. Prohibido: NO sugerir la "Guía PDF" como respuesta al plan diario.
    6. Análisis de Imágenes: Si el usuario envía una foto de comida o producto, analízala estrictamente basándote en su plan nutricional actual. Indica si es adecuado o no y por qué. Se breve y directo.

    REGLAS DE ACCIÓN OBLIGATORIAS:
    - Check-in: Muestra [Hacer Check-in](https://airtable.com/appCHcm7XPzeoyBCs/pagh79fwniuSPmusB/form).
    - Subir Documentos/Exámenes: Muestra [Subir Archivos](https://airtable.com/appCHcm7XPzeoyBCs/pagYI9IBX65B8OsAY/form).
    - Entrenar: Muestra [Ver Entrenamientos](https://imnufit.com/entrenaconfrenplus/).
    - Agendar Cita: Muestra [Reservar Cita](${info["Link Calendar"] || CALENDAR_LINK_DEFAULT}).
    - Ver Recursos/Manual: Muestra [Ver Guías PDF](function:program-detail-view).
    - Ver Consultas: Muestra [Historial de Consultas](${info["Link Consultas"] || "#"}).
    - Contactar: Muestra [Contactar Soporte](function:contact-view).
    - Cancelar Membresía/Clave: Muestra [Mi Cuenta](function:membership-view).
    - Precios/Web: Muestra [Visitar Web](https://imnufit.com).
    - Comunidad: [Unirme a la Comunidad](https://chat.whatsapp.com/FNoToJXy8HO7iLVhPseQHB).`;

    try {
        const history = chatHistory.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }));
        let userParts = [{ text: msgToSend }];
        if (imageToSend) {
            userParts.push({ inlineData: { mimeType: mimeToSend, data: imageToSend } });
        }

        const res = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [...history, { role: 'user', parts: userParts }], systemInstruction: { parts: [{ text: sysPrompt }] } })
        });
        
        const aiText = res.candidates?.[0]?.content?.parts?.[0]?.text || "No pude procesar tu solicitud.";
        
        document.querySelectorAll('.ai-loading-indicator').forEach(el => el.remove());
        window.appendChatMessageToAll('ai', aiText);
        chatHistory.push({ role: 'user', text: msgToSend }, { role: 'ai', text: aiText });

        // --- SISTEMA DE VOZ BIDIRECCIONAL (Bucle Continuo) ---
        if (window.lastInteractionWasVoice) {
            const textToSpeak = aiText.replace(/[*_#]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/(?:https?|ftp):\/\/[\n\S]+/g, '');
            const ttsKey = "AIzaSyDGprBQ8u5UZAL_B1kostoNCpBOonyX1OA"; 
            const ttsUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${ttsKey}`;

            try {
                const ttsRes = await fetch(ttsUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        input: { text: textToSpeak },
                        voice: { languageCode: 'es-US', name: 'es-US-Journey-F' },
                        audioConfig: { audioEncoding: 'MP3' }
                    })
                });
                
                const ttsData = await ttsRes.json();
                
                if (ttsData.audioContent) {
                    if (window.currentAudio) window.currentAudio.pause();
                    window.currentAudio = new Audio("data:audio/mp3;base64," + ttsData.audioContent);
                    
                    window.currentAudio.onended = () => {
                        window.lastInteractionWasVoice = false;
                        if (window.isConversationMode) window.startVoiceRecognition(source, true);
                    };
                    
                    window.currentAudio.play();
                } else {
                    window.lastInteractionWasVoice = false;
                    if (window.isConversationMode) window.startVoiceRecognition(source, true);
                }
            } catch (err) {
                window.lastInteractionWasVoice = false;
                if (window.isConversationMode) window.startVoiceRecognition(source, true);
            }
        }

    } catch (e) { 
        document.querySelectorAll('.ai-loading-indicator').forEach(el => el.remove());
        window.appendChatMessageToAll('ai', `⚠️ Hubo un error al procesar. Intenta con una imagen más pequeña o texto.`); 
    }
};

window.viewProgramResources = () => {
    const data = currentAppData;
    if (!data) return;
    const progKey = window.getProgramKey(data["Programa"] || "");
    if (!progKey || !PROGRAMAS_INFO[progKey]) { window.notify("Sin programa asignado"); return; }

    const progInfo = PROGRAMAS_INFO[progKey];
    const container = document.getElementById('program-guias-list');
    let mes = 1;
    if (data["Programa"].includes("Mes 2")) mes = 2;
    else if (data["Programa"].includes("Mes 3")) mes = 3;
    else if (data["Programa"].includes("Mes 4")) mes = 4;

    if (container) {
        container.innerHTML = "";
        for (let i = 1; i <= mes; i++) {
            if (!progInfo.meses[i]) continue;
            const card = document.createElement('div');
            card.className = "w-full bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm mb-6 fade-in text-left";
            card.innerHTML = `<h4 class="text-xs font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-4 text-center">${progInfo.monthTitles?.[i] || 'MES ' + i}</h4>`;
            const list = document.createElement('div'); list.className = "flex flex-col gap-3";
            [...progInfo.meses[i]].sort((a,b) => a.type === 'VIDEO' ? 1 : -1).forEach(guia => {
                const isVideo = guia.type === "VIDEO";
                list.innerHTML += `<a href="${guia.url}" target="_blank" class="group flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-[#DEE9FA]/30 transition-all text-left"><div class="w-12 h-12 rounded-xl ${isVideo ? 'bg-rose-100 text-rose-500' : 'bg-blue-100 text-[#2E4982]'} flex items-center justify-center shrink-0 text-center">${isVideo ? '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>' : '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>'}</div><div class="text-left"><h4 class="text-sm font-bold text-slate-800">${guia.label}</h4><p class="text-xs text-slate-500 font-medium mt-1 leading-relaxed">${guia.desc}</p></div></a>`;
            });
            card.appendChild(list); container.appendChild(card);
        }
    }
    const imgEl = document.getElementById('program-img-main');
    if (imgEl) { 
        imgEl.src = progInfo.img; 
        document.getElementById('program-img-container').className = `flex justify-center mb-10 transition-transform duration-500 ${progInfo.imgWidth || 'w-32'}`;
        document.getElementById('program-img-container')?.classList.remove('hidden'); 
    }
    window.showView('program-detail-view');
};

window.refreshUIWithData = () => {
    if (isSpecialistMode) {
        // 1. Usamos los datos REALES de Airtable como base
        // Si por alguna razón no cargo Airtable (ej. error de red), usamos objeto vacío para evitar crash
        let displayData = cachedAirtableData ? { ...cachedAirtableData } : {};

        // 2. Solo sobrescribimos el PROGRAMA si seleccionas algo en el menú
        if (specModeSelection === "adios_diabetes") {
            displayData["Programa"] = "Adiós Diabetes 2 (Mes 3)";
        } else if (specModeSelection === "quema_grasa") {
            displayData["Programa"] = "Quema Grasa (Mes 4)";
        } else if (specModeSelection === "sano") {
            displayData["Programa"] = "SANO (Mes 2)";
        }
        // Si es "sin_programa", se queda con lo que venga de Airtable (o vacío)

        // 3. Renderizamos con esta mezcla (La IA usará displayData)
        updateDashboardUI(displayData);
    } else {
        // Usuario normal: Usa datos puros de Airtable
        updateDashboardUI(cachedAirtableData);
    }
};

window.handleLogin = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const pass = e.target.pass.value;
    const loader = document.getElementById('loading-screen');
    try {
        if(loader) loader.classList.remove('hidden');
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
        console.log("Login fail:", error.code);
        if(loader) loader.classList.add('hidden');
        let msg = "Error al iniciar sesión.";
        if (['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password', 'auth/invalid-email'].includes(error.code)) msg = "Correo o contraseña incorrectos.";
        else if (error.code === 'auth/too-many-requests') msg = "Demasiados intentos. Espera un momento.";
        window.notify(msg, 'error');
    }
};

window.handleSignup = async (e) => { 
    e.preventDefault(); 
    const email = e.target.email.value; 
    const pass = e.target.pass.value; 
    const confirmPass = e.target.confirmPass.value;
    
    if (pass.length < 6) { window.notify("La contraseña debe tener al menos 6 caracteres"); return; }
    if (pass !== confirmPass) { window.notify("Las contraseñas no coinciden"); return; } 
    
    const loader = document.getElementById('loading-screen');
    if(loader) loader.classList.remove('hidden');

    try { 
        const airtableUser = await fetchAirtableData(email);
        if (!airtableUser) {
            if(loader) loader.classList.add('hidden');
            window.notify("Este correo no está registrado en nuestra base de datos. Debes ser atendido en consulta primero.");
            return; 
        }
        
        const status = String(airtableUser["Estatus"] || "").toLowerCase();
        // REGLA ESTRICTA: SOLO ACTIVO
        if (!status.includes("activo") && !status.includes("actívo")) {
            if(loader) loader.classList.add('hidden');
            window.notify("Tu cuenta no está activa. Será activada en tu próxima consulta.");
            return; 
        }
        
        if (status.includes("inactivo")) {
            if(loader) loader.classList.add('hidden');
            window.notify("Tu cuenta no está activa. Será activada en tu próxima consulta.");
            return; 
        }

        await createUserWithEmailAndPassword(auth, email, pass); 
        window.notify("Cuenta creada exitosamente", "success"); 
    } catch (err) { 
        if(loader) loader.classList.add('hidden');
        window.notify("Error: " + (err.code === 'auth/email-already-in-use' ? 'El correo ya está registrado.' : err.code)); 
    } 
};

window.handlePasswordReset = async (e) => { e.preventDefault(); try { document.getElementById('loading-screen')?.classList.remove('hidden'); await sendPasswordResetEmail(auth, e.target.resetEmail.value); window.notify("Correo enviado", "success"); window.showView('login-view'); } catch (err) { window.notify("Error"); } finally { document.getElementById('loading-screen')?.classList.add('hidden'); } };
window.cerrarSesion = () => signOut(auth);
window.updateAppPassword = async (e) => { e.preventDefault(); if(!auth.currentUser) return; try { document.getElementById('loading-screen')?.classList.remove('hidden'); await updatePassword(auth.currentUser, e.target.newPassword.value); window.notify("Clave actualizada", "success"); e.target.reset(); } catch (err) { window.notify("Sesión expirada"); } finally { document.getElementById('loading-screen')?.classList.add('hidden'); } };

// --- MODIFICACIÓN DE REFRESH POTENTE (NUCLEAR RELOAD) ---
window.refreshData = () => { 
    const loader = document.getElementById('loading-screen');
    if(loader) loader.classList.remove('hidden');
    // Fuerza la recarga completa del navegador para traer cambios de código y datos
    window.location.reload();
};

async function fetchAirtableData(email) {
    const f = encodeURIComponent(`(LOWER({Email})=LOWER('${email}'))`), u = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?filterByFormula=${f}`;
    try { const res = await fetch(u, { headers: { Authorization: `Bearer ${AIRTABLE_PAT}` } }); const data = await res.json(); return data.records?.[0]?.fields || null; } catch (e) { return null; }
}

function updateDashboardUI(data) {
    if (!data) return;
    currentAppData = data; 
    window.safeSetText('display-nombre', data["Nombre + Edad"] || "Usuario IMNUFIT");
    
    if (chatHistory.length === 0) window.clearChat();
    
    const g = window.getGreeting(); 
    window.safeUpdate('display-greeting', (el) => el.innerHTML = `<span class="text-xl mr-2">${g.icon}</span> ${g.text}`);
    
    const st = data["Estatus"] || "Activo";
    window.safeUpdate('display-estatus', (el) => { 
        el.textContent = st; 
        el.className = `px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest border inline-block mt-2 ${window.getStatusClass(st)}`; 
    });
    
    document.getElementById('featured-plan-banner')?.classList.toggle('hidden', !data.Programa);
    if (data.Programa) window.safeSetText('plan-banner-title', data.Programa);
    
    // SHOW ALL CARDS
    ['card-entrenamientos', 'card-reporte', 'card-citas', 'card-consultas', 'card-community', 'card-install-app-main', 'card-upload'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.remove('hidden');
    });

    // LOGICA INTELIGENTE: Si la App ya está instalada, ocultamos el botón del main
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) {
        document.getElementById('card-install-app-main')?.classList.add('hidden');
    }

    // CHECK LINK CONSULTAS
    const linkCons = data["Link Consultas"];
    const cardCons = document.getElementById('card-consultas');
    if (cardCons) {
        if (!linkCons || linkCons.trim() === "") cardCons.classList.add('hidden');
        else {
            cardCons.classList.remove('hidden');
            const btn = document.getElementById('btn-consultas-action');
            if (btn) { btn.href = linkCons; btn.style.opacity = "1"; }
        }
    }

    // --- NUEVA LÓGICA CORREGIDA: NOMBRE EXACTO DE COLUMNA ---
    // Buscamos "Suscripción o Membresia" exactamente como lo tienes en Airtable
    const rawMembresia = data["Suscripción o Membresia"] || data["Membresía"] || data["Membresia"] || "";
    const membresia = String(rawMembresia).toLowerCase();
    
    // Buscamos el CONTENEDOR (Wrapper) que agregamos en el HTML
    const btnWrapper = document.getElementById('specialist-btn-wrapper');
    
    if (btnWrapper) {
        // Si el texto incluye "básico" o "basico", lo escondemos
        if (membresia.includes("básico") || membresia.includes("basico")) {
            btnWrapper.classList.add('hidden'); // OCULTAR
        } else {
            btnWrapper.classList.remove('hidden'); // MOSTRAR
        }
    }
    // -------------------------------------------------------------

    window.safeUpdate('calendar-action-container', el => el.innerHTML = `<a href="${data["Link Calendar"] || CALENDAR_LINK_DEFAULT}" target="_blank" class="btn-ghost-sm text-center">Ir al Calendario</a>`);
    const bh = document.getElementById('btn-consultas-action'); 
    if (bh) { 
        bh.href = data["Link Consultas"] || "#"; 
        bh.style.opacity = bh.href.includes("#") ? "0.4" : "1"; 
    }
    
    window.safeSetText('acc-nombre', data["Nombre + Edad"] || "---"); 
    window.safeSetText('acc-email', auth.currentUser?.email || "--"); 
    window.safeSetText('display-frase', frasesCreyentes[Math.floor(Math.random() * frasesCreyentes.length)]);
    window.safeSetText('acc-pais', data["País"] || "--"); 
    window.safeSetText('acc-telefono', data["Telefono"] || "--");
    window.safeSetText('acc-nacimiento', window.formatDateMDY(data["Fecha de Nacimiento"]));
    
    const genero = String(data["Género"] || "");
    window.safeUpdate('acc-genero', el => {
        el.textContent = genero;
        if (genero.toLowerCase().includes("masculino")) el.className = "px-4 py-1.5 rounded-full text-[10px] font-extrabold bg-sky-50 text-sky-600 border border-sky-100 uppercase tracking-widest inline-block shadow-sm";
        else if (genero.toLowerCase().includes("femenino")) el.className = "px-4 py-1.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-600 border border-rose-100 uppercase tracking-widest shadow-sm inline-block";
        else el.className = "hidden";
    });

    // --- LOGICA VISUAL: BADGE DE MEMBRESÍA EN MI CUENTA ---
    const nombreMembresia = data["Suscripción o Membresia"] || data["Membresía"] || "Sin Plan";

    window.safeUpdate('acc-membresia-badge', el => {
        el.textContent = nombreMembresia;
        // Aplicamos ESTILO APPLE PREMIUM (Azul corporativo, pill shape, bold, uppercase)
        el.className = "px-3 py-1.5 rounded-full text-[9px] font-extrabold bg-[#DEE9FA] text-[#2E4982] border border-blue-100 uppercase tracking-widest shadow-sm inline-block";
        el.classList.remove('hidden');
    });
}

// --- AUTH OBSERVER (GATEKEEPER BLINDADO) ---
onAuthStateChanged(auth, async (user) => {
    const loader = document.getElementById('loading-screen');
    if(loader) loader.classList.remove('hidden');
    if (user) {
        window.resetUI();
        window.resetInactivityTimer();
        isSpecialistMode = (user.email === SPECIALIST_EMAIL);
        const sp = document.getElementById('specialist-panel'); if(sp) sp.classList.toggle('hidden', !isSpecialistMode);
        
        cachedAirtableData = await fetchAirtableData(user.email);
        
        if (!isSpecialistMode) {
            if (!cachedAirtableData) {
                window.notify("Usuario no encontrado en base de datos.");
                await signOut(auth);
                if(loader) loader.classList.add('hidden');
                return;
            }
            
            const status = String(cachedAirtableData["Estatus"] || "").toLowerCase();
            
            if (status.includes("inactivo")) {
                window.notify("Tu cuenta no está activa. Será activada en tu próxima consulta.");
                await signOut(auth);
                if(loader) loader.classList.add('hidden');
                return;
            }

            if (!status.includes("activo") && !status.includes("actívo")) {
                window.notify("Tu cuenta no está activa. Será activada en tu próxima consulta.");
                await signOut(auth);
                if(loader) loader.classList.add('hidden');
                return;
            }
        }

        window.refreshUIWithData(); window.syncAIInstructions(); window.showView('patient-view', false);
    } else { 
        window.resetUI(); 
        const sp = document.getElementById('specialist-panel'); if(sp) sp.classList.add('hidden');
        isSpecialistMode = false; window.showView('login-view', false); 
    }
    if(loader) loader.classList.add('hidden');
});

// --- INIT ---
setPersistence(auth, browserLocalPersistence).then(() => {});
