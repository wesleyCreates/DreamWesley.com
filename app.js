// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const loginScreen = document.getElementById('login-screen');
const dashboard = document.getElementById('dashboard');
const googleBtn = document.getElementById('googleSignIn');
const signOutBtn = document.getElementById('signOut');
const userEmailSpan = document.getElementById('userEmail');

const panel = document.getElementById('panel');
const navButtons = document.querySelectorAll('[data-action]');

auth.onAuthStateChanged(user => {
  if (user) {
    loginScreen.style.display = 'none';
    dashboard.style.display = 'block';
    userEmailSpan.textContent = user.email;
    loadYouTubeSection();
  } else {
    loginScreen.style.display = 'flex';
    dashboard.style.display = 'none';
  }
});

googleBtn.onclick = async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
  } catch (e) {
    alert('Sign in failed: ' + e.message);
  }
};

signOutBtn.onclick = () => auth.signOut();

navButtons.forEach(btn => btn.addEventListener('click', e => {
  const action = e.currentTarget.dataset.action;
  handleNav(action);
}));

function handleNav(action){
  if(action === 'temp1'){
    panel.innerHTML = `<h3>TempMail Generator V1</h3><p class="muted">Coming Soon</p>`;
  } else if(action === 'temp2'){
    renderTempMailV2();
  } else if(action === 'supergrow'){
    renderSuperGrow();
  } else if(action === 'telegram'){
    window.open('https://t.me/DreamWesley','_blank');
  } else if(action === 'website'){
    window.open('https://earnplan2026.blogspot.com/','_blank');
  }
}

/* -------------------------
   YouTube: embed + recent uploads
   ------------------------- */
async function loadYouTubeSection(){
  // Live embed
  document.getElementById('liveEmbed').innerHTML =
    `<iframe src="https://www.youtube.com/embed/live_stream?channel=${YT_CHANNEL_ID}" frameborder="0" allowfullscreen></iframe>`;

  // Fetch recent uploads (search endpoint)
  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?key=${YT_API_KEY}&channelId=${YT_CHANNEL_ID}&part=snippet,id&order=date&maxResults=8`);
    const data = await res.json();
    const list = document.getElementById('videoList');
    list.innerHTML = '';
    (data.items || []).forEach(item => {
      if (item.id.kind === 'youtube#video') {
        const li = document.createElement('li');
        li.innerHTML = `<a href="https://www.youtube.com/watch?v=${item.id.videoId}" target="_blank">${item.snippet.title}</a>`;
        list.appendChild(li);
      }
    });
  } catch (err) {
    console.error('YouTube fetch error', err);
  }
}

/* -------------------------
   TempMail V2 (DEMO only)
   - Uses Gmail plus addressing examples
   - "Generate More" produces new demo aliases
   - "Choose One" lets user pick an alias and then "Check Inbox" opens Gmail
   ------------------------- */
function renderTempMailV2(){
  panel.innerHTML = `
    <h3>TempMail Generator V2 — Demo</h3>
    <p class="muted">This is a safe, educational demo showing how Gmail plus addressing works. It does not create mailboxes or route mail.</p>
    <div id="tmChat" class="tmChat">
      <div class="botMsg card">
        <strong>Bot:</strong> Send me an email that is logged in your device (example: arif@gmail.com)
      </div>
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
    if(!validateGmail(base)){
      alert('Please enter a valid Gmail address (example: user@gmail.com)');
      return;
    }
    currentAliases = generatePlusAliases(base, 10);
    renderAliases(currentAliases);
  };

  chooseBtn.onclick = () => {
    if(currentAliases.length === 0){
      alert('Generate aliases first.');
      return;
    }
    const chosen = prompt('Type the alias you choose from the list exactly as shown:');
    if(!chosen) return;
    // Show Check Inbox option
    aliasesDiv.innerHTML = `<div class="card"><strong>Chosen:</strong> ${escapeHtml(chosen)}<br/><br/>
      <button id="checkInbox" class="btn primary">Check Inbox</button>
      <button id="moreGen" class="btn ghost">Generate More</button>
    </div>`;
    document.getElementById('checkInbox').onclick = () => {
      // Open Gmail in new tab (user will need to sign in)
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

  function validateGmail(email){
    return /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email);
  }

  function generatePlusAliases(base, count){
    // Safe demo: produce aliases using plus addressing and short tags
    const [local, domain] = base.split('@');
    const tags = ['promo','demo','sg','grow','test','alpha','beta','news','site','user'];
    const out = [];
    for(let i=0;i<count;i++){
      const tag = tags[i % tags.length] + (Math.floor(Math.random()*900)+100);
      out.push(`${local}+${tag}@${domain}`);
    }
    return out;
  }

  function escapeHtml(s){ return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
}
  
/* -------------------------
   SuperGrow submission flow
   - Prefills with authenticated user's email
   - Saves to Firestore collection "supergrow_requests"
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
      <input id="sgEmail" value="${user.email}" style="width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);background:transparent;color:#e6eef8" />
      <div style="margin-top:8px"><button id="sgSubmit" class="btn primary">Submit</button></div>
    `;
    document.getElementById('sgSubmit').onclick = async () => {
      const email = document.getElementById('sgEmail').value.trim();
      if(!email){ alert('Enter an email'); return; }
      try {
        await db.collection('supergrow_requests').add({
          userUid: user.uid,
          userEmail: user.email,
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
