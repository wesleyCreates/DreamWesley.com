const auth = firebase.auth();
const db = firebase.firestore();
const adminArea = document.getElementById('adminArea');
const adminSignIn = document.getElementById('adminSignIn');

adminSignIn.onclick = async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
    renderAdminUI();
  } catch(e){
    alert('Sign in failed: ' + e.message);
  }
};

async function renderAdminUI(){
  const user = auth.currentUser;
  if(!user) return;
  // Check if user is in admins collection
  const adminDoc = await db.collection('admins').doc(user.uid).get();
  if(!adminDoc.exists){
    adminArea.innerHTML = `<p class="muted">You are not an admin. Contact the owner to add you.</p>`;
    return;
  }

  adminArea.innerHTML = `
    <div style="display:flex;gap:12px;align-items:center">
      <div><strong>Admin:</strong> ${escapeHtml(user.email)}</div>
      <button id="signOutAdmin" class="btn ghost">Sign out</button>
    </div>
    <hr/>
    <div>
      <h4>Set user SuperGrow status</h4>
      <input id="targetUid" placeholder="User UID (paste here)" style="width:100%;padding:8px;margin-bottom:8px"/>
      <input id="statusText" placeholder="Status (e.g., active)" style="width:100%;padding:8px;margin-bottom:8px"/>
      <input id="expiryDate" type="date" style="width:100%;padding:8px;margin-bottom:8px"/>
      <button id="setStatus" class="btn primary">Set Status</button>
      <div id="adminMsg" style="margin-top:12px"></div>
    </div>
  `;

  document.getElementById('signOutAdmin').onclick = () => auth.signOut().then(()=> location.reload());
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
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
