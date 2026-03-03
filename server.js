const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const crypto = require('crypto');

// SendGrid setup
const sgMail = require('@sendgrid/mail');
if(process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const app = express();
const port = process.env.PORT || 3000;

// simple file-backed user store
const USER_FILE = path.join(__dirname, 'data', 'users.json');
function loadUsers() {
  try { return fs.readJsonSync(USER_FILE); } catch(e){ return {}; }
}
function saveUsers(u){ fs.outputJsonSync(USER_FILE, u, {spaces:2}); }

// passport setup
passport.serializeUser((user, done) => done(null, user.email));
passport.deserializeUser((email, done) => {
  const users = loadUsers();
  done(null, users[email] || null);
});

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  callbackURL: '/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
  const users = loadUsers();
  const email = (profile.emails && profile.emails[0] && profile.emails[0].value) || 'unknown';
  if(!users[email]) users[email] = { email, predictions: [] };
  saveUsers(users);
  done(null, users[email]);
}));

app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.use(session({secret:'keyboard cat', resave:false, saveUninitialized:false}));
app.use(passport.initialize());
app.use(passport.session());

// static assets
app.use(express.static(path.join(__dirname, '/')));

// public pages
app.get('/login', (req, res)=>{
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/forgot-password', (req, res)=>{
  res.sendFile(path.join(__dirname, 'forgot-password.html'));
});

app.get('/reset-password', (req, res)=>{
  res.sendFile(path.join(__dirname, 'reset-password.html'));
});

app.get('/dashboard', ensureAuthenticated, (req, res)=>{
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// oauth
app.get('/auth/google', passport.authenticate('google', {scope:['profile','email']}));
app.get('/auth/google/callback', passport.authenticate('google', {failureRedirect:'/login'}), (req,res)=>{
  res.redirect('/');
});

// email sign-in with password
app.post('/login', (req,res)=>{
  const email = req.body.email;
  const password = req.body.password;
  if(!email || !password) return res.redirect('/login?error=missing');
  const users = loadUsers();
  // For prototype: store password plaintext (use bcrypt in production!)
  if(!users[email]) {
    users[email] = {email, password, predictions: []};
    saveUsers(users);
  } else if(users[email].password !== password) {
    return res.redirect('/login?error=invalid');
  }
  req.login(users[email], err=>{
    return res.redirect('/');
  });
});

// logout
app.post('/logout', (req,res)=>{
  req.logout();
  res.redirect('/login');
});

// forgot password - send reset email
app.post('/forgot-password', async (req,res)=>{
  const email = req.body.email;
  if(!email) return res.redirect('/forgot-password?error=missing');
  
  const users = loadUsers();
  if(!users[email]) {
    // Don't reveal if email exists (security best practice)
    return res.redirect('/forgot-password?msg=If+email+exists,+reset+link+sent');
  }
  
  // Generate reset token (valid for 1 hour)
  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + (60 * 60 * 1000); // 1 hour
  
  if(!users[email].resetTokens) users[email].resetTokens = [];
  users[email].resetTokens.push({token, expires});
  saveUsers(users);
  
  // Send email via SendGrid
  const resetUrl = `http://localhost:${port}/reset-password?token=${token}`;
  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@wakamaria407.local',
    subject: 'Wakamaria 407 - Password Reset',
    html: `
      <h2>Password Reset Request</h2>
      <p>Click the link below to reset your password (valid for 1 hour):</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>If you did not request this, ignore this email.</p>
    `
  };
  
  try {
    if(process.env.SENDGRID_API_KEY) {
      await sgMail.send(msg);
    } else {
      console.log('SendGrid not configured. Reset token:', token);
    }
    res.redirect('/forgot-password?msg=Reset+link+sent+to+your+email');
  } catch(err) {
    console.error('SendGrid error:', err);
    res.redirect('/forgot-password?error=send_failed');
  }
});

// reset password form submission
app.post('/reset-password', (req,res)=>{
  const {token, password} = req.body;
  if(!token || !password) return res.json({success:false, message:'Missing fields'});
  
  const users = loadUsers();
  let found = false;
  
  for(const email in users) {
    const u = users[email];
    if(u.resetTokens) {
      const idx = u.resetTokens.findIndex(t => t.token === token && t.expires > Date.now());
      if(idx !== -1) {
        u.password = password;
        u.resetTokens.splice(idx, 1); // remove used token
        saveUsers(users);
        found = true;
        break;
      }
    }
  }
  
  if(found) {
    res.json({success:true, message:'Password reset successfully'});
  } else {
    res.json({success:false, message:'Invalid or expired token'});
  }
});

// api endpoints for predictions
app.get('/api/predictions', ensureAuthenticated, (req,res)=>{
  const users = loadUsers();
  const u = users[req.user.email] || {predictions:[]};
  res.json(u.predictions);
});

app.post('/api/predictions', ensureAuthenticated, (req,res)=>{
  const users = loadUsers();
  const u = users[req.user.email] || {email:req.user.email, predictions:[]};
  u.predictions = req.body || [];
  users[req.user.email] = u;
  saveUsers(users);
  res.json({status:'ok'});
});

// catch-all to serve index (if logged in or not)
app.get('*', (req, res) => {
  if(req.isAuthenticated()) {
    res.sendFile(path.join(__dirname, 'index.html'));
  } else {
    res.redirect('/login');
  }
});

function ensureAuthenticated(req, res, next){
  if(req.isAuthenticated()) return next();
  res.redirect('/login');
}

app.listen(port, () => {
  console.log(`Wakamaria 407 host running on http://localhost:${port}`);
});
