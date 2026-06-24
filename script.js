// ================================================================
// 📦 SCRIPT.JS — FULL PRODUCTION LOGIC
// ================================================================

// ---------- GLOBALS ----------
let currentUser = null;
let isSuperAdmin = false;
let currentPage = 'home';
let currentAdminSection = 'dashboard';

// ---------- DOM REFS ----------
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

// ---------- CONSTANTS ----------
// 🔑 YAHAN APNE SUPER ADMIN EMAIL DAALEIN (JO FIREBASE AUTH MEIN BANAYE HAIN)
const SUPER_ADMINS = ['nitinshab43@gmail.com'];  // Jugveer Sir ka bhi add karein agar hai

// ================================================================
// 🔐 AUTHENTICATION
// ================================================================

// Login
async function handleLogin() {
    const email = $('login-email').value.trim();
    const pass = $('login-password').value.trim();
    const errEl = $('login-error');
    errEl.style.display = 'none';

    if (!email || !pass) {
        errEl.textContent = 'Please enter email and password.';
        errEl.style.display = 'block';
        return;
    }

    try {
        const cred = await auth.signInWithEmailAndPassword(email, pass);
        closeModal('login-modal');
        $('login-email').value = '';
        $('login-password').value = '';
    } catch (e) {
        errEl.textContent = e.message;
        errEl.style.display = 'block';
    }
}

// Logout
async function handleLogout() {
    await auth.signOut();
    location.reload();
}

// Auth state listener
auth.onAuthStateChanged(user => {
    currentUser = user;
    if (user) {
        // Check if super admin
        isSuperAdmin = SUPER_ADMINS.includes(user.email);
        if (isSuperAdmin) {
            showAdminUI();
            loadAllAdminData();
        } else {
            alert('Access restricted to Super Admins only.');
            auth.signOut();
            return;
        }
        // Update UI
        $('auth-btn').textContent = '👤 Admin';
        $('auth-btn').onclick = () => toggleAdminPanel();
        $('nav-admin-link').style.display = 'inline-block';
        $('mobile-nav-admin').style.display = 'block';
        $('admin-user-badge').textContent = `👤 ${user.email}`;
    } else {
        isSuperAdmin = false;
        $('auth-btn').textContent = 'Login';
        $('auth-btn').onclick = () => openModal('login-modal');
        $('nav-admin-link').style.display = 'none';
        $('mobile-nav-admin').style.display = 'none';
        hideAdminPanel();
    }
});

// ---------- ADMIN UI TOGGLE ----------
function toggleAdminPanel() {
    const panel = $('admin-panel');
    if (panel.style.display === 'none' || panel.style.display === '') {
        if (isSuperAdmin) showAdminUI();
    } else {
        hideAdminPanel();
    }
}

function showAdminUI() {
    $('admin-panel').style.display = 'block';
    document.body.style.overflow = 'hidden';
    updateAdminStats();
}

function hideAdminPanel() {
    $('admin-panel').style.display = 'none';
    document.body.style.overflow = '';
}

// Admin navigation
function adminNavigate(section) {
    currentAdminSection = section;
    $$('.admin-section').forEach(el => el.classList.remove('active'));
    const target = $(`admin-${section}`);
    if (target) target.classList.add('active');
    $$('.admin-nav-link').forEach(el => el.classList.remove('active'));
    const link = document.querySelector(`.admin-nav-link[data-admin="${section}"]`);
    if (link) link.classList.add('active');
    const titles = {
        dashboard: '📊 Dashboard',
        notices: '📢 Notices',
        announcements: '📣 Announcements',
        materials: '📚 Materials',
        schedule: '📅 Schedule',
        events: '🎯 Events',
        gallery: '🖼️ Gallery',
        pages: '📄 Pages',
        theme: '🎨 Theme',
        settings: '⚙️ Settings'
    };
    $('admin-page-title').textContent = titles[section] || section;
    if (section !== 'dashboard' && section !== 'theme' && section !== 'settings') {
        loadAdminList(section);
    }
}

// Admin nav click listeners
document.querySelectorAll('.admin-nav-link').forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        adminNavigate(link.dataset.admin);
    });
});

// View site button
$('admin-view-site-btn').addEventListener('click', () => {
    hideAdminPanel();
    navigateTo('home');
});

// Logout button
$('admin-logout-btn').addEventListener('click', handleLogout);

// ================================================================
// 📊 DASHBOARD STATISTICS
// ================================================================

async function updateAdminStats() {
    const collections = ['notices', 'announcements', 'materials', 'events', 'gallery', 'pages'];
    for (const col of collections) {
        const snap = await db.collection(col).get();
        const count = snap.size;
        const el = $(`admin-stat-${col}`);
        if (el) el.textContent = count;
    }
    const noticesSnap = await db.collection('notices').get();
    const materialsSnap = await db.collection('materials').get();
    const eventsSnap = await db.collection('events').get();
    const gallerySnap = await db.collection('gallery').get();
    $('stat-notices').textContent = noticesSnap.size;
    $('stat-materials').textContent = materialsSnap.size;
    $('stat-events').textContent = eventsSnap.size;
    $('stat-gallery').textContent = gallerySnap.size;
}

// ================================================================
// 🔄 REAL-TIME LISTENERS & DATA LOADING
// ================================================================

function listenToCollection(collectionName, containerId, renderFn) {
    const container = $(containerId);
    if (!container) return;
    db.collection(collectionName).orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        const items = [];
        snapshot.forEach(doc => {
            items.push({ id: doc.id, ...doc.data() });
        });
        renderFn(container, items);
        if (isSuperAdmin) updateAdminStats();
    }, error => {
        console.error(`Error listening to ${collectionName}:`, error);
    });
}

// ---------- RENDER FUNCTIONS ----------

function renderNotices(container, items) {
    if (!items.length) {
        container.innerHTML = '<p class="empty-message">No notices available.</p>';
        return;
    }
    container.innerHTML = items.map(n => `
        <div class="feed-item">
            <div class="feed-title">${n.title || 'Untitled'}</div>
            <div class="feed-content">${n.content || ''}</div>
            <div class="feed-meta">${n.date || ''}</div>
        </div>
    `).join('');
}

function renderAdminNotices(container, items) {
    if (!items.length) {
        container.innerHTML = '<p class="empty-message">No notices.</p>';
        return;
    }
    container.innerHTML = items.map(n => `
        <div class="admin-list-item">
            <div><strong>${n.title || 'Untitled'}</strong> <span class="badge">${n.date || ''}</span></div>
            <div>
                <button class="btn btn-sm btn-outline" onclick="editNotice('${n.id}')">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="deleteNotice('${n.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function renderAnnouncements(container, items) {
    if (!items.length) {
        container.innerHTML = '<p class="empty-message">No announcements.</p>';
        return;
    }
    container.innerHTML = items.map(a => `
        <div class="feed-item">
            <div class="feed-title">📣 ${a.title || 'Untitled'}</div>
            <div class="feed-content">${a.content || ''}</div>
        </div>
    `).join('');
}

function renderAdminAnnouncements(container, items) {
    if (!items.length) {
        container.innerHTML = '<p class="empty-message">No announcements.</p>';
        return;
    }
    container.innerHTML = items.map(a => `
        <div class="admin-list-item">
            <div><strong>${a.title || 'Untitled'}</strong></div>
            <div>
                <button class="btn btn-sm btn-outline" onclick="editAnnouncement('${a.id}')">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="deleteAnnouncement('${a.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function renderMaterials(container, items) {
    if (!items.length) {
        container.innerHTML = '<p class="empty-message">No materials uploaded.</p>';
        return;
    }
    container.innerHTML = items.map(m => `
        <div class="material-card glass-card">
            <div class="material-type">${m.type || 'resource'}</div>
            <h4>${m.title || 'Untitled'}</h4>
            <p>${m.description || ''}</p>
            ${m.url ? `<a href="${m.url}" target="_blank" class="btn btn-sm btn-primary">🔗 Download</a>` : ''}
        </div>
    `).join('');
}

function renderAdminMaterials(container, items) {
    if (!items.length) {
        container.innerHTML = '<p class="empty-message">No materials.</p>';
        return;
    }
    container.innerHTML = items.map(m => `
        <div class="admin-list-item">
            <div><strong>${m.title || 'Untitled'}</strong> <span class="badge">${m.type || ''}</span></div>
            <div>
                <button class="btn btn-sm btn-outline" onclick="editMaterial('${m.id}')">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="deleteMaterial('${m.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function renderSchedule(container, items) {
    if (!items.length) {
        container.innerHTML = '<p class="empty-message">No schedule entries.</p>';
        return;
    }
    container.innerHTML = `<table class="schedule-table">
        <thead><tr><th>Day</th><th>Time</th><th>Subject</th><th>Venue</th></tr></thead>
        <tbody>${items.map(s => `
            <tr><td>${s.day || ''}</td><td>${s.time || ''}</td><td>${s.subject || ''}</td><td>${s.venue || ''}</td></tr>
        `).join('')}</tbody>
    </table>`;
}

function renderAdminSchedule(container, items) {
    if (!items.length) {
        container.innerHTML = '<p class="empty-message">No schedule entries.</p>';
        return;
    }
    container.innerHTML = items.map(s => `
        <div class="admin-list-item">
            <div><strong>${s.day || ''}</strong> — ${s.time || ''} — ${s.subject || ''} (${s.venue || ''})</div>
            <div>
                <button class="btn btn-sm btn-outline" onclick="editSchedule('${s.id}')">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="deleteSchedule('${s.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function renderEvents(container, items) {
    if (!items.length) {
        container.innerHTML = '<p class="empty-message">No upcoming events.</p>';
        return;
    }
    container.innerHTML = items.map(e => `
        <div class="event-card glass-card">
            <div class="event-date">${e.date || ''} ${e.time || ''}</div>
            <h4>${e.title || 'Untitled'}</h4>
            <p>${e.description || ''}</p>
            <div class="event-venue">📍 ${e.venue || ''}</div>
        </div>
    `).join('');
}

function renderAdminEvents(container, items) {
    if (!items.length) {
        container.innerHTML = '<p class="empty-message">No events.</p>';
        return;
    }
    container.innerHTML = items.map(e => `
        <div class="admin-list-item">
            <div><strong>${e.title || 'Untitled'}</strong> — ${e.date || ''} ${e.time || ''}</div>
            <div>
                <button class="btn btn-sm btn-outline" onclick="editEvent('${e.id}')">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="deleteEvent('${e.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function renderGallery(container, items) {
    if (!items.length) {
        container.innerHTML = '<p class="empty-message">No gallery images.</p>';
        return;
    }
    container.innerHTML = items.map(g => `
        <div class="gallery-item">
            <img src="${g.url || ''}" alt="${g.title || 'Gallery'}" />
            <div class="gallery-caption">${g.title || ''}</div>
        </div>
    `).join('');
}

function renderAdminGallery(container, items) {
    if (!items.length) {
        container.innerHTML = '<p class="empty-message">No gallery images.</p>';
        return;
    }
    container.innerHTML = items.map(g => `
        <div class="gallery-item admin-gallery-item">
            <img src="${g.url || ''}" alt="${g.title || 'Gallery'}" />
            <div class="gallery-caption">${g.title || ''}</div>
            <div class="admin-gallery-actions">
                <button class="btn btn-sm btn-outline" onclick="editGallery('${g.id}')">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="deleteGallery('${g.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function renderAdminPages(container, items) {
    if (!items.length) {
        container.innerHTML = '<p class="empty-message">No custom pages.</p>';
        return;
    }
    container.innerHTML = items.map(p => `
        <div class="admin-list-item">
            <div><strong>${p.name || 'Untitled'}</strong> (/${p.slug || ''}) ${p.showNav === 'yes' ? '🔗' : ''}</div>
            <div>
                <button class="btn btn-sm btn-outline" onclick="editPage('${p.id}')">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="deletePage('${p.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

// ---------- START LISTENERS ----------
function loadAllAdminData() {
    listenToCollection('notices', 'admin-notices-list', renderAdminNotices);
    listenToCollection('announcements', 'admin-announcements-list', renderAdminAnnouncements);
    listenToCollection('materials', 'admin-materials-list', renderAdminMaterials);
    listenToCollection('schedule', 'admin-schedule-list', renderAdminSchedule);
    listenToCollection('events', 'admin-events-list', renderAdminEvents);
    listenToCollection('gallery', 'admin-gallery-list', renderAdminGallery);
    listenToCollection('pages', 'admin-pages-list', renderAdminPages);
    listenToCollection('notices', 'home-notices-list', renderNotices);
    listenToCollection('notices', 'notices-container', renderNotices);
    listenToCollection('announcements', 'home-announcements-list', renderAnnouncements);
    listenToCollection('materials', 'materials-container', renderMaterials);
    listenToCollection('schedule', 'schedule-container', renderSchedule);
    listenToCollection('events', 'home-events-list', renderEvents);
    listenToCollection('gallery', 'home-gallery-preview', renderGallery);
    listenToCollection('gallery', 'gallery-container', renderGallery);
    loadNavFromFirestore();
    loadThemeSettings();
    loadSettings();
}

// Load navigation from Firestore pages
async function loadNavFromFirestore() {
    try {
        const snap = await db.collection('pages').where('showNav', '==', 'yes').get();
        const navLinks = [];
        snap.forEach(doc => {
            const data = doc.data();
            navLinks.push({ slug: data.slug, name: data.name });
        });
        const mainNav = document.getElementById('main-nav');
        const mobileNav = document.getElementById('mobile-nav');
        mainNav.querySelectorAll('.nav-link[data-page^="custom-"]').forEach(el => el.remove());
        mobileNav.querySelectorAll('.nav-link[data-page^="custom-"]').forEach(el => el.remove());
        navLinks.forEach(p => {
            if (!p.slug) return;
            const a = document.createElement('a');
            a.href = '#';
            a.dataset.page = `custom-${p.slug}`;
            a.textContent = p.name || p.slug;
            a.className = 'nav-link';
            a.addEventListener('click', e => {
                e.preventDefault();
                navigateTo(`custom-${p.slug}`);
            });
            mainNav.appendChild(a);
            const a2 = a.cloneNode(true);
            mobileNav.appendChild(a2);
        });
    } catch (e) {
        console.error('Error loading nav:', e);
    }
}

// ================================================================
// 📝 CRUD OPERATIONS
// ================================================================

// ---------- NOTICES ----------
function showAddNoticeModal() {
    $('notice-modal-title').textContent = 'Add Notice';
    $('notice-edit-id').value = '';
    $('notice-title').value = '';
    $('notice-content').value = '';
    $('notice-date').value = '';
    openModal('notice-modal');
}

function editNotice(id) {
    db.collection('notices').doc(id).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            $('notice-modal-title').textContent = 'Edit Notice';
            $('notice-edit-id').value = id;
            $('notice-title').value = data.title || '';
            $('notice-content').value = data.content || '';
            $('notice-date').value = data.date || '';
            openModal('notice-modal');
        }
    });
}

async function saveNotice() {
    const id = $('notice-edit-id').value;
    const title = $('notice-title').value.trim();
    const content = $('notice-content').value.trim();
    const date = $('notice-date').value;
    if (!title || !content) { alert('Title and content required.'); return; }
    const data = { title, content, date, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    try {
        if (id) {
            await db.collection('notices').doc(id).update(data);
        } else {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('notices').add(data);
        }
        closeModal('notice-modal');
    } catch (e) { alert('Error saving notice: ' + e.message); }
}

async function deleteNotice(id) {
    if (confirm('Delete this notice?')) {
        await db.collection('notices').doc(id).delete();
    }
}

// ---------- ANNOUNCEMENTS ----------
function showAddAnnouncementModal() {
    $('announcement-modal-title').textContent = 'Add Announcement';
    $('announcement-edit-id').value = '';
    $('announcement-title').value = '';
    $('announcement-content').value = '';
    openModal('announcement-modal');
}

function editAnnouncement(id) {
    db.collection('announcements').doc(id).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            $('announcement-modal-title').textContent = 'Edit Announcement';
            $('announcement-edit-id').value = id;
            $('announcement-title').value = data.title || '';
            $('announcement-content').value = data.content || '';
            openModal('announcement-modal');
        }
    });
}

async function saveAnnouncement() {
    const id = $('announcement-edit-id').value;
    const title = $('announcement-title').value.trim();
    const content = $('announcement-content').value.trim();
    if (!title || !content) { alert('Title and content required.'); return; }
    const data = { title, content, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    try {
        if (id) {
            await db.collection('announcements').doc(id).update(data);
        } else {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('announcements').add(data);
        }
        closeModal('announcement-modal');
    } catch (e) { alert('Error saving announcement: ' + e.message); }
}

async function deleteAnnouncement(id) {
    if (confirm('Delete this announcement?')) {
        await db.collection('announcements').doc(id).delete();
    }
}

// ---------- MATERIALS ----------
function showAddMaterialModal() {
    $('material-modal-title').textContent = 'Add Material';
    $('material-edit-id').value = '';
    $('material-title').value = '';
    $('material-type').value = 'notes';
    $('material-description').value = '';
    $('material-url').value = '';
    $('material-file').value = '';
    openModal('material-modal');
}

function editMaterial(id) {
    db.collection('materials').doc(id).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            $('material-modal-title').textContent = 'Edit Material';
            $('material-edit-id').value = id;
            $('material-title').value = data.title || '';
            $('material-type').value = data.type || 'notes';
            $('material-description').value = data.description || '';
            $('material-url').value = data.url || '';
            openModal('material-modal');
        }
    });
}

async function saveMaterial() {
    const id = $('material-edit-id').value;
    const title = $('material-title').value.trim();
    const type = $('material-type').value;
    const description = $('material-description').value.trim();
    let url = $('material-url').value.trim();
    const fileInput = $('material-file');
    const file = fileInput.files[0];
    if (!title) { alert('Title required.'); return; }
    try {
        if (file) {
            const storageRef = storage.ref(`materials/${Date.now()}_${file.name}`);
            const snap = await storageRef.put(file);
            url = await snap.ref.getDownloadURL();
        }
        const data = { title, type, description, url, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
        if (id) {
            await db.collection('materials').doc(id).update(data);
        } else {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('materials').add(data);
        }
        closeModal('material-modal');
        $('material-file').value = '';
    } catch (e) { alert('Error saving material: ' + e.message); }
}

async function deleteMaterial(id) {
    if (confirm('Delete this material?')) {
        await db.collection('materials').doc(id).delete();
    }
}

// ---------- SCHEDULE ----------
function showAddScheduleModal() {
    $('schedule-modal-title').textContent = 'Add Schedule Entry';
    $('schedule-edit-id').value = '';
    $('schedule-day').value = '';
    $('schedule-time').value = '';
    $('schedule-subject').value = '';
    $('schedule-venue').value = '';
    openModal('schedule-modal');
}

function editSchedule(id) {
    db.collection('schedule').doc(id).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            $('schedule-modal-title').textContent = 'Edit Schedule';
            $('schedule-edit-id').value = id;
            $('schedule-day').value = data.day || '';
            $('schedule-time').value = data.time || '';
            $('schedule-subject').value = data.subject || '';
            $('schedule-venue').value = data.venue || '';
            openModal('schedule-modal');
        }
    });
}

async function saveSchedule() {
    const id = $('schedule-edit-id').value;
    const day = $('schedule-day').value.trim();
    const time = $('schedule-time').value.trim();
    const subject = $('schedule-subject').value.trim();
    const venue = $('schedule-venue').value.trim();
    if (!day || !subject) { alert('Day and Subject required.'); return; }
    const data = { day, time, subject, venue, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    try {
        if (id) {
            await db.collection('schedule').doc(id).update(data);
        } else {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('schedule').add(data);
        }
        closeModal('schedule-modal');
    } catch (e) { alert('Error saving schedule: ' + e.message); }
}

async function deleteSchedule(id) {
    if (confirm('Delete this schedule entry?')) {
        await db.collection('schedule').doc(id).delete();
    }
}

// ---------- EVENTS ----------
function showAddEventModal() {
    $('event-modal-title').textContent = 'Add Event';
    $('event-edit-id').value = '';
    $('event-title').value = '';
    $('event-date').value = '';
    $('event-time').value = '';
    $('event-venue').value = '';
    $('event-description').value = '';
    openModal('event-modal');
}

function editEvent(id) {
    db.collection('events').doc(id).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            $('event-modal-title').textContent = 'Edit Event';
            $('event-edit-id').value = id;
            $('event-title').value = data.title || '';
            $('event-date').value = data.date || '';
            $('event-time').value = data.time || '';
            $('event-venue').value = data.venue || '';
            $('event-description').value = data.description || '';
            openModal('event-modal');
        }
    });
}

async function saveEvent() {
    const id = $('event-edit-id').value;
    const title = $('event-title').value.trim();
    const date = $('event-date').value;
    const time = $('event-time').value.trim();
    const venue = $('event-venue').value.trim();
    const description = $('event-description').value.trim();
    if (!title || !date) { alert('Title and date required.'); return; }
    const data = { title, date, time, venue, description, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    try {
        if (id) {
            await db.collection('events').doc(id).update(data);
        } else {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('events').add(data);
        }
        closeModal('event-modal');
    } catch (e) { alert('Error saving event: ' + e.message); }
}

async function deleteEvent(id) {
    if (confirm('Delete this event?')) {
        await db.collection('events').doc(id).delete();
    }
}

// ---------- GALLERY ----------
function showAddGalleryModal() {
    $('gallery-modal-title').textContent = 'Add Gallery Image';
    $('gallery-edit-id').value = '';
    $('gallery-title').value = '';
    $('gallery-url').value = '';
    $('gallery-file').value = '';
    openModal('gallery-modal');
}

function editGallery(id) {
    db.collection('gallery').doc(id).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            $('gallery-modal-title').textContent = 'Edit Gallery Image';
            $('gallery-edit-id').value = id;
            $('gallery-title').value = data.title || '';
            $('gallery-url').value = data.url || '';
            openModal('gallery-modal');
        }
    });
}

async function saveGallery() {
    const id = $('gallery-edit-id').value;
    const title = $('gallery-title').value.trim();
    let url = $('gallery-url').value.trim();
    const fileInput = $('gallery-file');
    const file = fileInput.files[0];
    if (!title) { alert('Title required.'); return; }
    try {
        if (file) {
            const storageRef = storage.ref(`gallery/${Date.now()}_${file.name}`);
            const snap = await storageRef.put(file);
            url = await snap.ref.getDownloadURL();
        }
        if (!url) { alert('Please provide an image URL or upload a file.'); return; }
        const data = { title, url, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
        if (id) {
            await db.collection('gallery').doc(id).update(data);
        } else {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('gallery').add(data);
        }
        closeModal('gallery-modal');
        $('gallery-file').value = '';
    } catch (e) { alert('Error saving gallery: ' + e.message); }
}

async function deleteGallery(id) {
    if (confirm('Delete this gallery image?')) {
        await db.collection('gallery').doc(id).delete();
    }
}

// ---------- PAGES ----------
function showAddPageModal() {
    $('page-modal-title').textContent = 'Add Page';
    $('page-edit-id').value = '';
    $('page-name').value = '';
    $('page-slug').value = '';
    $('page-content').value = '';
    $('page-show-nav').value = 'yes';
    openModal('page-modal');
}

function editPage(id) {
    db.collection('pages').doc(id).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            $('page-modal-title').textContent = 'Edit Page';
            $('page-edit-id').value = id;
            $('page-name').value = data.name || '';
            $('page-slug').value = data.slug || '';
            $('page-content').value = data.content || '';
            $('page-show-nav').value = data.showNav || 'yes';
            openModal('page-modal');
        }
    });
}

async function savePage() {
    const id = $('page-edit-id').value;
    const name = $('page-name').value.trim();
    const slug = $('page-slug').value.trim().toLowerCase().replace(/\s+/g, '-');
    const content = $('page-content').value;
    const showNav = $('page-show-nav').value;
    if (!name || !slug) { alert('Name and slug required.'); return; }
    const data = { name, slug, content, showNav, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    try {
        if (id) {
            await db.collection('pages').doc(id).update(data);
        } else {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('pages').add(data);
        }
        closeModal('page-modal');
        loadNavFromFirestore();
    } catch (e) { alert('Error saving page: ' + e.message); }
}

async function deletePage(id) {
    if (confirm('Delete this page?')) {
        await db.collection('pages').doc(id).delete();
        loadNavFromFirestore();
    }
}

// ---------- THEME SETTINGS ----------
async function loadThemeSettings() {
    try {
        const doc = await db.collection('settings').doc('theme').get();
        if (doc.exists) {
            const data = doc.data();
            applyTheme(data);
            if (data.primary) $('theme-primary').value = data.primary;
            if (data.secondary) $('theme-secondary').value = data.secondary;
            if (data.background) $('theme-bg').value = data.background;
            if (data.cardStyle) $('theme-card-style').value = data.cardStyle;
            if (data.mode) $('theme-mode').value = data.mode;
        }
    } catch (e) { console.error('Error loading theme:', e); }
}

function applyTheme(data) {
    const root = document.documentElement;
    if (data.primary) root.style.setProperty('--primary', data.primary);
    if (data.secondary) root.style.setProperty('--secondary', data.secondary);
    if (data.background) root.style.setProperty('--bg', data.background);
    if (data.cardStyle) {
        document.body.classList.remove('card-glass', 'card-solid', 'card-outline');
        document.body.classList.add(`card-${data.cardStyle}`);
    }
    if (data.mode) {
        document.body.classList.remove('dark-mode', 'light-mode');
        document.body.classList.add(`${data.mode}-mode`);
    }
}

async function saveThemeSettings() {
    const primary = $('theme-primary').value;
    const secondary = $('theme-secondary').value;
    const background = $('theme-bg').value;
    const cardStyle = $('theme-card-style').value;
    const mode = $('theme-mode').value;
    const data = { primary, secondary, background, cardStyle, mode, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    try {
        await db.collection('settings').doc('theme').set(data, { merge: true });
        applyTheme(data);
        alert('Theme saved!');
    } catch (e) { alert('Error saving theme: ' + e.message); }
}

// ---------- WEBSITE SETTINGS ----------
async function loadSettings() {
    try {
        const doc = await db.collection('settings').doc('website').get();
        if (doc.exists) {
            const data = doc.data();
            $('settings-welcome').value = data.welcomeMessage || '';
            $('settings-hero-title').value = data.heroTitle || '';
            $('settings-hero-subtitle').value = data.heroSubtitle || '';
            if (data.welcomeMessage) {
                const msgDiv = document.querySelector('#welcome-message-display p:first-child');
                if (msgDiv) msgDiv.textContent = data.welcomeMessage;
            }
            if (data.heroTitle) {
                const h1 = document.querySelector('.hero-title');
                if (h1) h1.innerHTML = data.heroTitle;
            }
            if (data.heroSubtitle) {
                const p = document.querySelector('.hero-subtitle');
                if (p) p.textContent = data.heroSubtitle;
            }
        }
    } catch (e) { console.error('Error loading settings:', e); }
}

async function saveSettings() {
    const welcome = $('settings-welcome').value.trim();
    const heroTitle = $('settings-hero-title').value.trim();
    const heroSubtitle = $('settings-hero-subtitle').value.trim();
    const data = { welcomeMessage: welcome, heroTitle, heroSubtitle, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    try {
        await db.collection('settings').doc('website').set(data, { merge: true });
        const msgDiv = document.querySelector('#welcome-message-display p:first-child');
        if (msgDiv) msgDiv.textContent = welcome || 'Welcome to the Textile Technology Department...';
        const h1 = document.querySelector('.hero-title');
        if (h1) h1.innerHTML = heroTitle || 'Welcome to <span class="gradient-text">Textile Technology</span>';
        const p = document.querySelector('.hero-subtitle');
        if (p) p.textContent = heroSubtitle || 'Empowering the next generation...';
        alert('Settings saved!');
    } catch (e) { alert('Error saving settings: ' + e.message); }
}

// ================================================================
// 🧭 PAGE NAVIGATION
// ================================================================

function navigateTo(page) {
    currentPage = page;
    $$('.page').forEach(el => el.classList.remove('active'));
    const target = $(`page-${page}`);
    if (target) {
        target.classList.add('active');
    } else {
        if (page.startsWith('custom-')) {
            const slug = page.replace('custom-', '');
            loadCustomPage(slug);
        }
    }
    $$('.nav-link').forEach(el => el.classList.remove('active'));
    const navLink = document.querySelector(`.nav-link[data-page="${page}"]`);
    if (navLink) navLink.classList.add('active');
    closeMobileNav();
    hideAdminPanel();
}

async function loadCustomPage(slug) {
    try {
        const snap = await db.collection('pages').where('slug', '==', slug).get();
        if (!snap.empty) {
            const doc = snap.docs[0];
            const data = doc.data();
            let container = $(`page-custom-${slug}`);
            if (!container) {
                container = document.createElement('section');
                container.id = `page-custom-${slug}`;
                container.className = 'page';
                document.getElementById('page-container').appendChild(container);
            }
            container.innerHTML = `<div class="page-header"><h2>${data.name || slug}</h2></div><div class="custom-page-content">${data.content || ''}</div>`;
            $$('.page').forEach(el => el.classList.remove('active'));
            container.classList.add('active');
        } else {
            alert('Page not found.');
        }
    } catch (e) {
        console.error('Error loading custom page:', e);
    }
}

// Navigation click listeners
document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        navigateTo(link.dataset.page);
    });
});

// Mobile menu toggle
$('mobile-menu-btn').addEventListener('click', () => {
    $('mobile-nav').classList.toggle('open');
});

function closeMobileNav() {
    $('mobile-nav').classList.remove('open');
}

// ================================================================
// 🎨 MODAL HELPERS
// ================================================================

function openModal(id) {
    const modal = $(id);
    if (modal) modal.style.display = 'flex';
}

function closeModal(id) {
    const modal = $(id);
    if (modal) modal.style.display = 'none';
}

document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
        if (e.target === modal) closeModal(modal.id);
    });
});

// ================================================================
// 🌓 THEME TOGGLE (public)
// ================================================================

$('theme-toggle').addEventListener('click', () => {
    const currentMode = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
    const newMode = currentMode === 'dark' ? 'light' : 'dark';
    db.collection('settings').doc('theme').set({ mode: newMode }, { merge: true })
        .then(() => {
            applyTheme({ mode: newMode });
        })
        .catch(e => console.error('Error toggling theme:', e));
});

// ================================================================
// 🚀 INIT
// ================================================================

// Public listeners
listenToCollection('notices', 'home-notices-list', renderNotices);
listenToCollection('notices', 'notices-container', renderNotices);
listenToCollection('announcements', 'home-announcements-list', renderAnnouncements);
listenToCollection('materials', 'materials-container', renderMaterials);
listenToCollection('schedule', 'schedule-container', renderSchedule);
listenToCollection('events', 'home-events-list', renderEvents);
listenToCollection('gallery', 'home-gallery-preview', renderGallery);
listenToCollection('gallery', 'gallery-container', renderGallery);

loadNavFromFirestore();
loadThemeSettings();
loadSettings();
updateAdminStats();

console.log('✅ Script.js fully loaded');