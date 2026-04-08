// ================= ENTERPRISE-LEVEL AI AGENT PLATFORM =================
// Backend: Node.js + Express + JWT + Mongo-ready structure

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const OpenAI = require('openai');

const app = express();
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(bodyParser.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const SECRET = 'secret123';

// ===== MOCK DB (replace with MongoDB) =====
let users = [];
let workflows = [];
let tokens = {};
let logs = [];
let pendingApprovals = {};

// ===== AUTH (JWT) =====
app.post('/api/register', (req, res) => {
  const user = { id: Date.now(), email: req.body.email, role: req.body.role };
  users.push(user);
  const token = jwt.sign(user, SECRET);
  res.json({ user });
});

app.post('/api/login', (req, res) => {

  const user = users.find(
  u => u.email === req.body.email && req.body.password
);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const token = jwt.sign(user, SECRET);
  res.json({ user,token });
});

function auth(req, res, next) {
  try {
    const header = req.headers.authorization;

    // 1. Check header exists
    if (!header) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // 2. Extract token from "Bearer <token>"
    const parts = header.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ error: 'Invalid token format' });
    }

    const token = parts[1];

    // 3. Verify token
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;

    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: err.message
    });
  }
}

// ===== TOKEN TRACKING =====

function trackTokens(userId,userName, usage) {
  if (!userId) return;

  tokens[userId] = (tokens[userId] || 0) + (usage || 0);
 
  console.log(`User ${userId} tokens:`, tokens[userId]); // debug
}



async function callAI(prompt) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }]
    });

    return {
      text: response.choices[0].message.content,
      usage: response.usage?.total_tokens || 0   // ✅ FIX
    };

  } catch (err) {
    console.error("OpenAI Error:", err.message);

    // ✅ fallback mock so workflow continues
    return {
      text: " AI unavailable (quota exceeded). Mock response: " + prompt,
      usage: 10   // simulate tokens so tracking still works
    };
  }
}

// ===== WORKFLOW ENGINE =====
app.post('/api/workflow', auth, (req, res) => {
  const wf = { id: Date.now(), ...req.body };
  workflows.push(wf);
  res.json(wf);
});

app.get('/api/workflow', auth, (req, res) => res.json(workflows));

app.post('/api/workflow/run/:id', auth, async (req, res) => {
  const wf = workflows.find(w => w.id == req.params.id);
  if (!wf) return res.status(404).json({ error: 'Not found' });

  let context = { input: req.body.input, results: [] };

  for (let i = 0; i < wf.steps.length; i++) {
    const step = wf.steps[i];
    try {
      if (step.type === 'agent') {
        const out = await callAI(context.input);
        trackTokens(req.user.id,req.user.email, out.usage);
        context.results.push(out.text);
      }

      if (step.type === 'tool') {
        const res = await axios.get('https://api.agify.io?name=test');
        context.results.push(res.data);
      }

      if (step.type === 'webhook') {
        await axios.post(step.url, context);
      }

      if (step.type === 'human') {
        const id = Date.now();
        pendingApprovals[id] = { context, wfId: wf.id, stepIndex: i };
        return res.json({ status: 'pending', approvalId: id });
      }

      logs.push({ workflowId: wf.id, step, status: 'success' });

    } catch (err) {
      logs.push({ workflowId: wf.id, step, status: 'failed', error: err.message });
      if (step.retry) {
        i--; // retry step
      } else {
        return res.status(500).json({ error: err.message });
      }
    }
  }

  res.json({ status: 'completed', context });
});

// ===== APPROVAL =====
app.post('/api/approve', auth, (req, res) => {
  const pending = pendingApprovals[req.body.approvalId];
  if (!pending) return res.status(404).json({ error: 'Invalid' });
  delete pendingApprovals[req.body.approvalId];
  res.json({ status: 'approved' });
});

// ===== LOGS =====
app.get('/api/logs', auth, (req, res) => res.json(logs));
app.post('/api/webhook', (req, res) => {
  console.log(" Webhook received:", req.body);

  // You can process data here if needed

  res.json({
    status: "success",
    message: "Webhook executed"
  });
});
// ===== TOKENS =====

app.get('/api/tokens', auth, (req, res) => {
  res.json({
    userId: req.user.id,
    username: req.user.email,
    totalTokens: tokens[req.user.id] || 0
  });
});
app.get('/api/tokens/all', auth, (req, res) => {
  res.json(tokens);
});
// ===== START =====
app.listen(5000, () => console.log('Enterprise server running on 5000'));
