// Initialize Firebase
const firebaseConfig = YOUR_FIREBASE_CONFIG;
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

const loginScreen = document.getElementById('login-screen');
const dashboard = document.getElementById('dashboard');
const googleBtn = document.getElementById('googleSignIn');
const signOutBtn = document.getElementById('signOut');

auth.onAuthStateChanged(user => {
  if (user) {
    loginScreen.style.display = 'none';
    dashboard.style.display = 'block';
    loadYouTubeSection();
  } else {
    loginScreen.style.display = 'block';
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

// YouTube: embed live stream (iframe) and fetch uploads
async function loadYouTubeSection() {
  // Replace with your channel ID and API key
  const channelId = 'YOUR_CHANNEL_ID';
  const apiKey = 'YOUR_YOUTUBE_API_KEY';

  // Embed live (if liveId known) or channel page
  document.getElementById('liveEmbed').innerHTML =
    `<iframe width="560" height="315" src="https://www.youtube.com/embed/live_stream?channel=${channelId}" frameborder="0" allowfullscreen></iframe>`;

  // Fetch uploads playlist items (example: get latest videos)
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet,id&order=date&maxResults=10`);
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
}
