const express = require('express');
const router = express.Router();
const pool = require('../db');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Rate limiting for summarize endpoint
const summarizeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit to 10 requests per window
  message: 'Too many summarize requests, please try again later'
});

// GET all todos
router.get('/todos', async (req, res) => {
  try {
    const [todos] = await pool.query('SELECT * FROM todos');
    res.json(todos);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

// POST a new todo
router.post('/todos', async (req, res) => {
  const { text } = req.body;
  
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Invalid todo text' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO todos (text) VALUES (?)',
      [text]
    );
    const [newTodo] = await pool.query('SELECT * FROM todos WHERE id = ?', [result.insertId]);
    res.status(201).json(newTodo[0]);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

// DELETE a todo
router.delete('/todos/:id', async (req, res) => {
  const todoId = parseInt(req.params.id);
  
  if (isNaN(todoId)) {
    return res.status(400).json({ error: 'Invalid todo ID' });
  }

  try {
    const [result] = await pool.query('DELETE FROM todos WHERE id = ?', [todoId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    
    res.status(204).end();
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

// POST summarize todos (with rate limiting)
router.post('/summarize', summarizeLimiter, async (req, res) => {
  try {
    // 1. Get pending todos from database
    const [todos] = await pool.query('SELECT * FROM todos WHERE completed = FALSE');
    
    if (todos.length === 0) {
      return res.status(400).json({ error: 'No pending todos to summarize' });
    }

    // 2. Prepare prompt for OpenAI
    const todoList = todos.map(t => `- ${t.text}`).join('\n');
    const prompt = `Summarize these pending tasks in a concise way:\n${todoList}\n\nSummary:`;
    
    // 3. Call OpenAI API
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 150
      },
      {
        headers: { 
          'Authorization': `Bearer ${process.env.OPENAI_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const summary = response.data.choices[0].message.content;

    // 4. Return the summary
    res.json({ 
      success: true,
      summary: summary
    });

  } catch (error) {
    console.error('OpenAI API error:', error.response?.data || error.message);
    
    // Handle rate limits
    if (error.response?.status === 429) {
      return res.status(429).json({
        error: 'OpenAI rate limit exceeded',
        message: 'Please wait before requesting another summary'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to generate summary',
      details: error.message 
    });
  }
});

module.exports = router;