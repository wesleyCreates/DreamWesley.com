// admin.js — Admin panel logic
const auth = firebase.auth();
const db = firebase.firestore();

const adminArea = document.getElementById('adminArea');
const adminSignIn = document.getElementById('adminSignIn');
const adminContent = document.getElementById('adminContent');

adminSignIn.onclick = async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
    renderAdminUI();
  } catch (e) {
    alert('Sign in failed: ' + e.message);
  }
};

auth.onAuthStateChanged(user => {
  if (user) {
    // If already signed in, render UI
    renderAdminUI();
  } else {
    adminContent.style.display = 'none';
    adminArea.style.display = 'block';
  }
});

async function renderAdminUI(){
  const user = auth.currentUser;
  if(!user) return;

  // Check admin doc exists
  try {
    const adminDoc = await db.collection('admins').doc(user.uid).get();
    if(!adminDoc.exists){
      adminArea.innerHTML = `<div class="card"><p class="muted">You are not an admin. Add your UID to the <strong>admins</strong> collection in Firestore.</p>
        <p class="small muted">Your UID: <code>${user.uid}</code></p>
        <button id="signOutBtn" class="btn ghost">Sign out</button></div>`;
      document.getElementById('signOutBtn').onclick = () => auth.signOut().then(()=> location.reload());
      return;
    }
  } catch(err){
    console.error('admin check failed', err);
    alert('Failed to verify admin: ' + err.message);
    return;
  }

  // Build admin UI
  adminArea.style.display = 'none';
  adminContent.style.display = 'block';
  adminContent.innerHTML = `
    <div class="card" style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
      <div><strong>Admin:</strong> ${escapeHtml(user.email)}<div class="muted small">UID: ${escapeHtml(user.uid)}</div></div>
      <div><button id="signOutAdmin" class="btn ghost">Sign out</button></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 420px;gap:16px">
      <div class="card">
        <h4>Users</h4>
        <div id="usersList" style="max-height:420px;overflow:auto"></div>

        <h4 style="margin-top:12px">Recent Requests</h4>
        <div id="requestsList" style="max-height:220px;overflow:auto"></div>
      </div>

      <div class="card">
        <h4>Set User Status</h4>
        <input id="targetUid" placeholder="User UID" style="margin-bottom:8px"/>
        <input id="statusText" placeholder="Status (e.g., active)" style="margin-bottom:8px"/>
        <input id="expiryDate" type="date" style="margin-bottom:8px"/>
        <button id="setStatus" class="btn primary">Set Status</button>

        <hr style="margin:12px 0"/>

        <h4>Send Notification</h4>
        <input id="notifTitle" placeholder="Title" style="margin-bottom:8px"/>
        <textarea id="notifMsg" placeholder="Message" style="height:100px;margin-bottom:8px"></textarea>
        <input id="notifLink" placeholder="Optional link (https://...)" style="margin-bottom:8px"/>
        <button id="sendNotif" class="btn primary">Send Notification</button>

        <div id="adminMsg" style="margin-top:12px"></div>
      </div>
    </div>
  `;

  document.getElementById('signOutAdmin').onclick = () => auth.signOut().then(()=> location.reload());

  // Load users list (profiles written on sign-in)
  db.collection('users').orderBy('lastSeen','desc').limit(500).onSnapshot(snap => {
    const el = document.getElementById('usersList');
    el.innerHTML = '';
    snap.forEach(doc => {
      const d = doc.data();
      const row = document.createElement('div');
      row.className = 'card';
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.marginBottom = '8px';
      row.innerHTML = `
        <div style="display:flex;gap:10px;align-items:center">
          <img src="${escapeHtml(d.photoURL||'')}" style="width:44px;height:44px;border-radius:8px;object-fit:cover"/>
          <div>
            <strong>${escapeHtml(d.displayName||d.email||'User')}</strong>
            <div class="muted small">${escapeHtml(d.email||'')}</div>
          </div>
        </div>
        <div style="text-align:right">
          <div class="muted small">UID: ${escapeHtml(d.uid)}</div>
          <div style="margin-top:6px">
            <button class="btn ghost setFor" data-uid="${escapeHtml(d.uid)}">Set Status</button>
          </div>
        </div>`;
      el.appendChild(row);
    });

    // attach handlers
    document.querySelectorAll('.setFor').forEach(b => b.addEventListener('click', e => {
      const uid = e.currentTarget.getAttribute('data-uid');
      document.getElementById('targetUid').value = uid;
    }));
  });

  // Load recent requests
  db.collection('supergrow_requests').orderBy('createdAt','desc').limit(100).onSnapshot(snap => {
    const el = document.getElementById('requestsList');
    el.innerHTML = '';
    snap.forEach(doc => {
      const d = doc.data();
      const row = document.createElement('div');
      row.className = 'card';
      row.style.marginBottom = '8px';
      row.innerHTML = `
        <div><strong>${escapeHtml(d.submittedEmail||'')}</strong>
          <div class="muted small">${escapeHtml(d.userEmail||'')}</div>
        </div>
        <div style="margin-top:8px">
          <button class="btn ghost setFromReq" data-uid="${escapeHtml(d.userUid)}">Set Status for this user</button>
        </div>`;
      el.appendChild(row);
    });
    document.querySelectorAll('.setFromReq').forEach(b => b.addEventListener('click', e => {
      const uid = e.currentTarget.getAttribute('data-uid');
      document.getElementById('targetUid').value = uid;
    }));
  });

  // Set status handler
  document.getElementById('setStatus').onclick = async () => {
    const uid = document.getElementById('targetUid').value.trim();
    const status = document.getElementById('statusText').value.trim();
    const expiry = document.getElementById('expiryDate').value;
    if(!uid || !status || !expiry){ alert('Fill all fields'); return; }
    try {
      const expiresAt = new Date(expiry + 'T23:59:59Z');
      await db.collection('supergrow_statuses').doc(uid).set({
        status,
        expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt),
        updatedBy: user.uid,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      document.getElementById('adminMsg').innerHTML = `<div class="card">Status set for ${escapeHtml(uid)}</div>`;
    } catch(err){
      console.error(err);
      alert('Failed: ' + err.message);
    }
  };

  // Send notification handler
  document.getElementById('sendNotif').onclick = async () => {
    const title = document.getElementById('notifTitle').value.trim();
    const msg = document.getElementById('notifMsg').value.trim();
    const link = document.getElementById('notifLink').value.trim();
    if(!title || !msg){ alert('Title and message required'); return; }
    try {
      await db.collection('notifications').add({
        title, message: msg, link: link || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: user.uid
      });
      document.getElementById('adminMsg').innerHTML = `<div class="card">Notification sent</div>`;
      document.getElementById('notifTitle').value = '';
      document.getElementById('notifMsg').value = '';
      document.getElementById('notifLink').value = '';
    } catch(err){
      console.error(err);
      alert('Failed: ' + err.message);
    }
  };
}

function escapeHtml(s){ return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
