(function(){
  const ADMIN_EMAIL = 'sagekd47@gmail.com';
  const RESULTS_STORAGE_KEY = 'wakamaria407_results';
  const resultForm = document.getElementById('resultForm');
  const resultsList = document.getElementById('resultsList');
  const adminPanel = document.getElementById('adminPanel');

  // Get current user email from localStorage (set during login)
  function getCurrentUserEmail() {
    return localStorage.getItem('wakamaria_user_email') || '';
  }

  // Check if user is admin
  function isAdmin() {
    return getCurrentUserEmail() === ADMIN_EMAIL;
  }

  // Initialize admin panel visibility
  function initializeAdminPanel() {
    if (isAdmin()) {
      adminPanel.style.display = 'block';
    } else {
      adminPanel.style.display = 'none';
    }
  }

  // Load results from localStorage
  function loadResults() {
    try {
      const raw = localStorage.getItem(RESULTS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  // Save results to localStorage
  function saveResults(items) {
    localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(items));
  }

  // Format date
  function formatDate(d) {
    try {
      const dt = new Date(d);
      if (isNaN(dt)) return d;
      return dt.toLocaleDateString();
    } catch (e) {
      return d;
    }
  }

  // Escape HTML
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function(c) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[c];
    });
  }

  // Render results list
  function renderResults() {
    const results = loadResults();
    resultsList.innerHTML = '';

    if (results.length === 0) {
      resultsList.innerHTML = '<div class="empty">No results yet.</div>';
      return;
    }

    results.sort((a, b) => new Date(b.date) - new Date(a.date));

    results.forEach((result, idx) => {
      const li = document.createElement('li');
      li.className = `result-item ${result.result}`;

      const statusLabel = result.result === 'won' ? 'WON ✓' : 
                          result.result === 'lost' ? 'LOST ✗' : 'DRAW';

      const adminButtons = isAdmin() 
        ? `<button class="result-edit-btn" onclick="editResult(${idx})">Edit</button>
           <button class="result-delete-btn" onclick="deleteResult(${idx})">Delete</button>`
        : '';

      li.innerHTML = `
        <div class="result-item-details">
          <div class="result-item-title">${escapeHtml(result.home)} vs ${escapeHtml(result.away)}</div>
          <div class="result-item-meta">Date: ${formatDate(result.date)}</div>
          <div class="result-item-meta">Score: ${escapeHtml(result.score)}</div>
          <div class="result-item-meta">Your prediction: ${escapeHtml(result.prediction)}</div>
          <span class="result-item-status ${result.result}">${statusLabel}</span>
        </div>
        ${adminButtons ? `<div class="result-item-actions">${adminButtons}</div>` : ''}
      `;
      resultsList.appendChild(li);
    });
  }

  // Edit result (populate form with data)
  window.editResult = function(idx) {
    const results = loadResults();
    const result = results[idx];
    if (!result) return;

    document.getElementById('resHome').value = result.home;
    document.getElementById('resAway').value = result.away;
    document.getElementById('resDate').value = result.date;
    document.getElementById('resScore').value = result.score;
    document.getElementById('resPrediction').value = result.prediction;
    document.getElementById('resResult').value = result.result;

    // Mark form as editing
    resultForm.setAttribute('data-edit-idx', idx);

    // Scroll to form
    resultForm.scrollIntoView({ behavior: 'smooth' });
  };

  // Delete result
  window.deleteResult = function(idx) {
    if (!confirm('Delete this result?')) return;
    const results = loadResults();
    results.splice(idx, 1);
    saveResults(results);
    renderResults();
    window.renderPendingResults();
  };

  // Handle form submission
  if (resultForm) {
    resultForm.addEventListener('submit', function(e) {
      e.preventDefault();

      const home = document.getElementById('resHome').value.trim();
      const away = document.getElementById('resAway').value.trim();
      const date = document.getElementById('resDate').value;
      const score = document.getElementById('resScore').value.trim();
      const prediction = document.getElementById('resPrediction').value.trim();
      const result = document.getElementById('resResult').value;

      if (!home || !away || !date || !score || !prediction || !result) {
        alert('Please fill all fields.');
        return;
      }

      const results = loadResults();
      const editIdx = resultForm.getAttribute('data-edit-idx');

      if (editIdx !== null && editIdx !== undefined) {
        // Update existing
        results[Number(editIdx)] = { home, away, date, score, prediction, result, created: results[Number(editIdx)].created };
        resultForm.removeAttribute('data-edit-idx');
      } else {
        // Add new
        results.push({ home, away, date, score, prediction, result, created: new Date().toISOString() });
      }

      saveResults(results);
      resultForm.reset();
      renderResults();
      window.renderPendingResults();
    });
  }

  // Initial setup
  initializeAdminPanel();
  renderResults();
  renderPendingResults();

  // Load predictions from app.js and display pending ones
  function renderPendingResults() {
    const STORAGE_KEY = 'wakamaria407_predictions';
    const pendingList = document.getElementById('pendingList');
    if (!pendingList) return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const predictions = raw ? JSON.parse(raw) : [];
      const results = loadResults();
      
      // Get all home+away combos that have results
      const resultedMatches = results.map(r => `${r.home}|${r.away}`);
      
      // Filter predictions without corresponding results
      const pending = predictions.filter(p => {
        const matchKey = `${p.home}|${p.away}`;
        return !resultedMatches.includes(matchKey);
      });

      pendingList.innerHTML = '';
      
      if (pending.length === 0) {
        pendingList.innerHTML = '<div class="empty">No pending predictions.</div>';
        return;
      }

      pending.sort((a, b) => new Date(a.date) - new Date(b.date));

      pending.forEach((pred) => {
        const li = document.createElement('li');
        li.className = 'pending-item';
        li.innerHTML = `
          <div class="pending-item-details">
            <div class="pending-item-title">${escapeHtml(pred.home)} vs ${escapeHtml(pred.away)}</div>
            <div class="pending-item-meta">Date: ${formatDate(pred.date)}</div>
            <div class="pending-item-meta">Prediction: ${escapeHtml(pred.prediction)}</div>
            <div class="pending-item-meta">Confidence: ${pred.confidence}%</div>
            <span class="pending-badge">PENDING</span>
          </div>
        `;
        pendingList.appendChild(li);
      });
    } catch (e) {
      console.error('Error rendering pending results:', e);
    }
  }

  // Make renderPendingResults accessible globally
  window.renderPendingResults = renderPendingResults;
})();
