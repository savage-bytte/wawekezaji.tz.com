Wakamaria 407  Football predictions

This is a simple static site where you can record and export your football match predictions.

Quick start

- Open index.html in your browser (double-click or serve with a static server).
- Add predictions using the form; entries are saved in your browser's localStorage.
- To clear all predictions, use the "Clear all" button.

Save / Load (like a normal website)

- To download your saved predictions as a JSON file, click the "Download JSON" button. This creates wakamaria_predictions.json containing all entries.
- To restore predictions from a JSON file, click "Upload JSON" and select a previously exported file.

Hosting\/login updates\n\nAfter starting the server, visit http://localhost:3000/login to sign in.\nUsers can sign in with email or Google; the dashboard at /dashboard shows server-saved predictions.\n\nAdditional resources

- Visit BetPawa, Sportybet or other betting platforms from the home page to analyze matches.
- Join our WhatsApp group for tips and community discussion: https://chat.whatsapp.com/LhDri5Ut5iv2tsiKlrlbsU

Notes

- This is a lightweight static prototype. If you want a backend (database, auth, sharing), I can add an Express API or similar.
- Files:
  - index.html  main UI
  - css/styles.css  styles
  - js/app.js  frontend logic (localStorage)
