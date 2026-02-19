// app.js - full client logic (copy into repo root)
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

// AUTH state
auth.onAuthStateChanged(async user => {
  if (user) {
    // create/update user profile doc for admin listing
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

// Sign in/out
googleBtn.onclick = async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try { await auth.signInWithPopup(provider); } catch (e) { alert('Sign in failed: ' + e.message); }
};
signOutBtn.onclick = () => auth.signOut();

// Nav handlers
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

/* -------------------------
   YouTube: channel info, live fallback, thumbnails
   ------------------------- */
async function loadYouTubeSection(){
  try {
    // Channel snippet (title + logo)
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

    // Check live
    const liveRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${YT_CHANNEL_ID}&eventType=live&type=video&key=${YT_API_KEY}`);
    const liveData = await liveRes.json();
    let embedVideoId = null;

    if(liveData.items && liveData.items.length > 0){
      embedVideoId = liveData.items[0].id.videoId;
    } else {
      // fallback to latest uploads
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
  } catch (err) {
    console.error('YouTube error', err);
    document.getElementById('liveEmbed').innerHTML = `<div class="muted">Unable to load YouTube content</div>`;
  }
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
      li.innerHTML = `<a href="https://www.youtube.com/watch?v=${vid}" target="_blank" style="display:flex;gap:12px;align-items:center">
        <img src="${thumb}" alt="${escapeHtml(title)}" style="width:140px;height:78px;object-fit:cover;border-radius:8px"/>
        <div style="flex:1"><strong style="display:block;color:#e6eef8">${escapeHtml(title)}</strong></div>
      </a>`;
      list.appendChild(li);
    }
  });
}

/* -------------------------
   TempMail V2 (DEMO only)
   ------------------------- */
function renderTempMailV2(){
  panel.innerHTML = `
    <h3>TempMail Generator V2 — Demo</h3>
    <p class="muted">This is a safe, educational demo showing Gmail plus addressing. It does not create mailboxes or route mail.</p>
    <div id="tmChat" class="tmChat">
      <div class="botMsg card"><strong>Bot:</strong> Send me an email that is logged in your device (example: arif@gmail.com)</div>
      <div style="margin-top:12px;">
        <input id="inputEmail" placeholder="yourname@gmail.com" style="width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);background:transparent;color:#e6eef8" />
        <div style="display:flex;gap:8px;margin-top:8px">
          <button id="genBtn" class="btn primary">Generate 10</button>
          <button id="chooseBtn" class="btn ghost">Choose One</button>
        </div>
      </div>
      <div id="aliases" style="margin-top:12px"></div>
    </div>
  `;

  const genBtn = document.getElementById('genBtn');
  const chooseBtn = document.getElementById('chooseBtn');
  const inputEmail = document.getElementById('inputEmail');
  const aliasesDiv = document.getElementById('aliases');

  let currentAliases = [];

  genBtn.onclick = () => {
    const base = inputEmail.value.trim();
    if(!validateGmail(base)){ alert('Please enter a valid Gmail address (example: user@gmail.com)'); return; }
    currentAliases = generatePlusAliases(base, 10);
    renderAliases(currentAliases);
  };

  chooseBtn.onclick = () => {
    if(currentAliases.length === 0){ alert('Generate aliases first.'); return; }
    const chosen = prompt('Type the alias you choose from the list exactly as shown:');
    if(!chosen) return;
    aliasesDiv.innerHTML = `<div class="card"><strong>Chosen:</strong> ${escapeHtml(chosen)}<br/><br/>
      <button id="checkInbox" class="btn primary">Check Inbox</button>
      <button id="moreGen" class="btn ghost">Generate More</button>
    </div>`;
    document.getElementById('checkInbox').onclick = () => {
      window.open('https://mail.google.com/mail/u/0/#search/from:' + encodeURIComponent(chosen), '_blank');
    };
    document.getElementById('moreGen').onclick = () => {
      currentAliases = generatePlusAliases(base, 10);
      renderAliases(currentAliases);
    };
  };

  function renderAliases(list){
    aliasesDiv.innerHTML = '<h4>Example aliases (demo)</h4>';
    const ul = document.createElement('ul');
    ul.style.listStyle='none'; ul.style.padding='0';
    list.forEach(a => {
      const li = document.createElement('li');
      li.innerHTML = `<div class="card" style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-family:monospace">${escapeHtml(a)}</span>
        <button class="btn ghost" data-copy="${escapeHtml(a)}">Copy</button>
      </div>`;
      ul.appendChild(li);
    });
    aliasesDiv.appendChild(ul);
    aliasesDiv.querySelectorAll('button[data-copy]').forEach(b=>{
      b.addEventListener('click', e=>{
        const v = e.currentTarget.getAttribute('data-copy');
        navigator.clipboard.writeText(v).then(()=> alert('Copied: ' + v));
      });
    });
  }

  function validateGmail(email){ return /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email); }
  function generatePlusAliases(base, count){
    const [local, domain] = base.split('@');
    const tags = ['promo','demo','sg','grow','test','alpha','beta','news','site','user'];
    const out = [];
    for(let i=0;i<count;i++){
      const tag = tags[i % tags.length] + (Math.floor(Math.random()*900)+100);
      out.push(`${local}+${tag}@${domain}`);
    }
    return out;
  }
}

/* -------------------------
   SuperGrow submission flow
   ------------------------- */
function renderSuperGrow(){
  const user = auth.currentUser;
  if(!user) { alert('Sign in first'); return; }
  panel.innerHTML = `
    <h3>SuperGrow</h3>
    <p class="muted">Do you logged it SuperGrow?</p>
    <div style="display:flex;gap:8px">
      <button id="sgYes" class="btn primary">Yes</button>
      <button id="sgNo" class="btn ghost">No</button>
    </div>
    <div id="sgArea" style="margin-top:12px"></div>
  `;
  document.getElementById('sgYes').onclick = () => {
    const sgArea = document.getElementById('sgArea');
    sgArea.innerHTML = `
      <p class="muted">Write the email you logged into your SuperGrow account (prefilled):</p>
      <input id="sgEmail" value="${auth.currentUser.email}" style="width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);background:transparent;color:#e6eef8" />
      <div style="margin-top:8px"><button id="sgSubmit" class="btn primary">Submit</button></div>
    `;
    document.getElementById('sgSubmit').onclick = async () => {
      const email = document.getElementById('sgEmail').value.trim();
      if(!email){ alert('Enter an email'); return; }
      try {
        await db.collection('supergrow_requests').add({
          userUid: auth.currentUser.uid,
          userEmail: auth.currentUser.email,
          submittedEmail: email,
          status: 'pending',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        sgArea.innerHTML = `<div class="card"><strong>Success:</strong> Your request is submitted successfully. It will be successful once the video on YouTube hits 10k views. Share to more people.</div>`;
      } catch (err) {
        console.error(err);
        alert('Submission failed: ' + err.message);
      }
    };
  };
  document.getElementById('sgNo').onclick = () => {
    panel.querySelector('#sgArea').innerHTML = `<p class="muted">Please log into SuperGrow first, then come back.</p>`;
  };
}

/* -------------------------
   SuperGrow Status (reads per-user status)
   ------------------------- */
async function renderSuperGrowStatus(){
  const user = auth.currentUser;
  if(!user) { alert('Sign in first'); return; }
  panel.innerHTML = `<h3>SuperGrow Status</h3><div id="statusArea" class="card"><p class="muted">Loading status...</p></div>`;
  const statusArea = document.getElementById('statusArea');
  try {
    const doc = await db.collection('supergrow_statuses').doc(user.uid).get();
    if(!doc.exists){
      statusArea.innerHTML = `<p class="muted">No active status found. You can request activation via SuperGrow.</p>`;
      return;
    }
    const data = doc.data();
    const expiresAt = data.expiresAt ? data.expiresAt.toDate() : null;
    let remaining = 'Unknown';
    if(expiresAt){
      const diff = Math.max(0, Math.floor((expiresAt - new Date()) / (1000*60*60*24)));
      const months = Math.floor(diff / 30);
      const days = diff % 30;
      remaining = months > 0 ? `${months} month(s) ${days} day(s) left` : `${days} day(s) left`;
    }
    statusArea.innerHTML = `<div><strong>Status:</strong> ${escapeHtml(data.status || 'inactive')}</div>
      <div style="margin-top:8px"><strong>Remaining:</strong> ${escapeHtml(remaining)}</div>
      <div style="margin-top:8px"><strong>Note:</strong> This status is managed by admins.</div>`;
  } catch(err){
    console.error(err);
    statusArea.innerHTML = `<p class="muted">Failed to load status.</p>`;
  }
}

/* -------------------------
   Notifications: subscribe & UI
   ------------------------- */
function subscribeNotifications(){
  if(notifUnsub) notifUnsub();
  notifUnsub = db.collection('notifications').orderBy('createdAt','desc').limit(20)
    .onSnapshot(snapshot => {
      const docs = snapshot.docs;
      const unreadCount = docs.filter(d => {
        const data = d.data();
        return !(data.seenBy && data.seenBy.includes(auth.currentUser.uid));
      }).length;
      if(unreadCount > 0){
        notifBadge.style.display = 'inline-block';
        notifBadge.textContent = unreadCount;
      } else {
        notifBadge.style.display = 'none';
      }
      window.__latestNotifications = docs.map(d => ({ id: d.id, ...d.data() }));
    }, err => console.error('notif listen error', err));
}

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
