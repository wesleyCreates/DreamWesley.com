// Initialize Firebase (firebaseConfig already in index.html)
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const loginScreen = document.getElementById('login-screen');
const dashboard = document.getElementById('dashboard');
const googleBtn = document.getElementById('googleSignIn');
const signOutBtn = document.getElementById('signOut');
const signedInText = document.getElementById('signedInText');

const panel = document.getElementById('panel');
const navButtons = document.querySelectorAll('[data-action]');

const notifBtn = document.getElementById('notifBtn');
const notifBadge = document.getElementById('notifBadge');

let notifUnsub = null;
let userUnsub = null;

auth.onAuthStateChanged(async user => {
  if (user) {
    // write or update user profile doc for admin listing
    await db.collection('users').doc(user.uid).set({
      uid: user.uid,
      displayName: user.displayName || '',
      email: user.email || '',
      photoURL: user.photoURL || '',
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    loginScreen.style.display = 'none';
    dashboard.style.display = 'block';
    signedInText.textContent = 'Signed in';
    loadYouTubeSection();
    subscribeNotifications();
  } else {
    loginScreen.style.display = 'flex';
    dashboard.style.display = 'none';
    unsubscribeNotifications();
  }
});

googleBtn.onclick = async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try { await auth.signInWithPopup(provider); } 
  catch (e) { alert('Sign in failed: ' + e.message); }
};

signOutBtn.onclick = () => auth.signOut();

navButtons.forEach(btn => btn.addEventListener('click', e => {
  const action = e.currentTarget.dataset.action;
  handleNav(action);
}));

function handleNav(action){
  if(action === 'temp1'){ panel.innerHTML = `<h3>TempMail Generator V1</h3><p class="muted">Coming Soon</p>`; }
  else if(action === 'temp2'){ renderTempMailV2(); }
  else if(action === 'supergrow'){ renderSuperGrow(); }
  else if(action === 'supergrow-status'){ renderSuperGrowStatus(); }
  else if(action === 'telegram'){ window.open('https://t.me/DreamWesley','_blank'); }
  else if(action === 'website'){ window.open('https://earnplan2026.blogspot.com/','_blank'); }
}

/* YouTube functions unchanged from previous version */
async function loadYouTubeSection(){
  try {
    const chRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${YT_CHANNEL_ID}&key=${YT_API_KEY}`);
    const chData = await chRes.json();
    const ch = (chData.items && chData.items[0]) ? chData.items[0] : null;
    const channelHeader = document.getElementById('channelHeader');
    if(ch){
      const title = ch.snippet.title;
      const logo = ch.snippet.thumbnails.default.url;
      channelHeader.innerHTML = `<div style="display:flex;align-items:center;gap:12px">
        <img src="${logo}" alt="${escapeHtml(title)}" style="width:56px;height:56px;border-radius:10px;object-fit:cover"/>
        <div><strong style="font-size:16px">${escapeHtml(title)}</strong></div>
      </div>`;
    }

    const liveRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${YT_CHANNEL_ID}&eventType=live&type=video&key=${YT_API_KEY}`);
    const liveData = await liveRes.json();
    let embedVideoId = null;

    if(liveData.items && liveData.items.length > 0){
      embedVideoId = liveData.items[0].id.videoId;
    } else {
      const recentRes = await fetch(`https://www.googleapis.com/youtube/v3/search?key=${YT_API_KEY}&channelId=${YT_CHANNEL_ID}&part=snippet,id&order=date&maxResults=8`);
      const recentData = await recentRes.json();
      if(recentData.items && recentData.items.length > 0){
        const firstVideo = recentData.items.find(i => i.id.kind === 'youtube#video');
        if(firstVideo) embedVideoId = firstVideo.id.videoId;
        renderVideoList(recentData.items);
      }
    }

    const liveEmbed = document.getElementById('liveEmbed');
    if(embedVideoId){
      liveEmbed.innerHTML = `<iframe src="https://www.youtube.com/embed/${embedVideoId}" frameborder="0" allowfullscreen></iframe>`;
    } else {
      liveEmbed.innerHTML = `<div class="muted">No videos available</div>`;
    }
  } catch (err) { console.error('YouTube error', err); }
}

function renderVideoList(items){
  const list = document.getElementById('videoList');
  list.innerHTML = '';
  (items || []).forEach(item => {
    if(item.id.kind === 'youtube#video'){
      const vid = item.id.videoId;
      const title = item.snippet.title;
      const thumb = item.snippet.thumbnails.medium ? item.snippet.thumbnails.medium.url : (item.snippet.thumbnails.default ? item.snippet.thumbnails.default.url : '');
      const li = document.createElement('li');
      li.innerHTML = `<a href="https://www.youtube.com/watch?v=${vid}" target="_blank" style="display:flex;gap:10px;align-items:center">
        <img src="${thumb}" alt="${escapeHtml(title)}" style="width:120px;height:68px;object-fit:cover;border-radius:8px"/>
        <div style="flex:1"><strong style="display:block;color:#e6eef8">${escapeHtml(title)}</strong></div>
      </a>`;
      list.appendChild(li);
    }
  });
}

/* TempMail V2 demo and SuperGrow functions unchanged (keep existing code) */
/* ... (include your existing renderTempMailV2, renderSuperGrow, renderSuperGrowStatus functions) ... */

/* -------------------------
   Notifications: subscribe & UI
   ------------------------- */
function subscribeNotifications(){
  // unsubscribe previous
  if(notifUnsub) notifUnsub();

  // listen to latest 20 notifications
  notifUnsub = db.collection('notifications').orderBy('createdAt','desc').limit(20)
    .onSnapshot(snapshot => {
      const docs = snapshot.docs;
      const unreadCount = docs.filter(d => !d.data().seenBy || !d.data().seenBy.includes(auth.currentUser.uid)).length;
      if(unreadCount > 0){
        notifBadge.style.display = 'inline-block';
        notifBadge.textContent = unreadCount;
      } else {
        notifBadge.style.display = 'none';
      }
      // store latest notifications in memory for panel
      window.__latestNotifications = docs.map(d => ({ id: d.id, ...d.data() }));
    }, err => console.error('notif listen error', err));
}

// open notification panel on bell click
notifBtn.addEventListener('click', () => {
  const list = window.__latestNotifications || [];
  const html = list.length === 0 ? '<div class="card muted">No notifications</div>' :
    `<div><h4>Notifications</h4>${list.map(n => `
      <div class="card" style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div><strong>${escapeHtml(n.title || 'Notice')}</strong><div class="muted" style="font-size:13px">${escapeHtml(n.message || '')}</div></div>
          <div style="text-align:right"><small class="muted">${n.createdAt && n.createdAt.toDate ? n.createdAt.toDate().toLocaleString() : ''}</small></div>
        </div>
        ${n.link ? `<div style="margin-top:8px"><a href="${escapeHtml(n.link)}" target="_blank" class="btn ghost">Open</a></div>` : ''}
      </div>`).join('')}</div>`;
  panel.innerHTML = `<h3>Notifications</h3>${html}`;

  // mark notifications as seen by current user (batch update)
  const user = auth.currentUser;
  if(!user) return;
  const batch = db.batch();
  (window.__latestNotifications || []).forEach(n => {
    const docRef = db.collection('notifications').doc(n.id);
    batch.update(docRef, { seenBy: firebase.firestore.FieldValue.arrayUnion(user.uid) });
  });
  batch.commit().catch(err => console.error('mark seen failed', err));
});

function unsubscribeNotifications(){
  if(notifUnsub) { notifUnsub(); notifUnsub = null; }
}

/* Utility */
function escapeHtml(s){ return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
