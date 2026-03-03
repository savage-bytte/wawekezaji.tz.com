(function(){
  const STORAGE_KEY = 'wakamaria407_predictions';
  const form = document.getElementById('predictionForm');
  const listEl = document.getElementById('predictions');
  const clearBtn = document.getElementById('clearBtn');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');

  function load() {
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    }catch(e){return []}
  }

  function save(items){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  async function tryLoadServer() {
    try {
      const r = await fetch('/api/predictions');
      if(!r.ok) return;
      const remote = await r.json();
      if(Array.isArray(remote)) {
        const local = load();
        const merged = [...local];
        remote.forEach(rt=>{
          if(!merged.some(l=>l.created === rt.created)) merged.push(rt);
        });
        save(merged);
        render();
      }
    } catch(err){ /* ignore */ }
  }

  async function syncServer(items) {
    try {
      await fetch('/api/predictions', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(items)
      });
    } catch(e) {
      console.log('sync error', e);
    }
  }

  function render(){
    const items = load();
    listEl.innerHTML = '';
    if(items.length === 0){
      listEl.innerHTML = '<div class="empty">No predictions yet. Add one!</div>';
      return;
    }
    items.sort((a,b)=> new Date(a.date) - new Date(b.date));
    items.forEach((it, idx)=>{
      const li = document.createElement('li');
      li.className = 'prediction-item';
      li.innerHTML = `<div>
          <strong>${escapeHtml(it.home)} vs ${escapeHtml(it.away)}</strong>
          <div class="prediction-meta">${formatDate(it.date)}  ${escapeHtml(it.prediction)}  ${it.confidence}%</div>
        </div>
        <div>
          <button data-remove="${idx}" style="background:#fff;color:#111;border:1px solid #e6e7ee;padding:6px 8px;border-radius:6px;cursor:pointer">Remove</button>
        </div>`;
      listEl.appendChild(li);
    });
  }

  function formatDate(d){
    try{const dt = new Date(d); if(isNaN(dt)) return d; return dt.toLocaleDateString();}catch(e){return d}
  }

  function escapeHtml(s){return String(s).replace(/[&<>\"']/g, function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":"&#39;"}[c]});}

  form.addEventListener('submit', function(e){
    e.preventDefault();
    const home = document.getElementById('home').value.trim();
    const away = document.getElementById('away').value.trim();
    const date = document.getElementById('date').value;
    const predictionText = document.getElementById('predictionText').value.trim();
    const confidence = Number(document.getElementById('confidence').value) || 0;
    if(!home || !away || !predictionText || !date) return alert('Please fill all fields.');
    const items = load();
    items.push({home,away,date,prediction:predictionText,confidence,created: new Date().toISOString()});
    save(items);
    form.reset();
    render();
    syncServer(items);
  });

  listEl.addEventListener('click', function(e){
    const btn = e.target.closest('button[data-remove]');
    if(!btn) return;
    const idx = Number(btn.getAttribute('data-remove'));
    const items = load();
    items.splice(idx,1);
    save(items);
    render();
    syncServer(items);
  });

  clearBtn.addEventListener('click', function(){
    if(!confirm('Clear all predictions?')) return;
    localStorage.removeItem(STORAGE_KEY);
    render();
    syncServer([]);
  });

  if(exportBtn){
    exportBtn.addEventListener('click', function(){
      const items = load();
      const blob = new Blob([JSON.stringify(items, null, 2)], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wakamaria_predictions.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }

  if(importBtn && importFile){
    importBtn.addEventListener('click', function(){ importFile.click(); });
    importFile.addEventListener('change', function(e){
      const f = e.target.files[0];
      if(!f) return;
      const reader = new FileReader();
      reader.onload = function(ev){
        try{
          const data = JSON.parse(ev.target.result);
          if(!Array.isArray(data)) throw new Error('Invalid file format');
          save(data);
          render();
          alert('Imported ' + data.length + ' predictions.');
          syncServer(data);
        }catch(err){
          alert('Failed to import: ' + err.message);
        }
      };
      reader.readAsText(f);
      importFile.value = '';
    });
  }

  // initial render and attempt server sync
  render();
  tryLoadServer();
})();
