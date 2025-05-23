import React from 'react'; // Add this line
import { useState, useEffect } from 'react';
import { FaPlus, FaRobot, FaSlack } from 'react-icons/fa';
import { getTodos, addTodo, deleteTodo, summarizeTodos } from './api';
import './App.css';

function App() {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');

  useEffect(() => { fetchTodos(); }, []);

  const fetchTodos = async () => {
    const data = await getTodos();
    setTodos(data);
  };

  const handleAddTodo = async () => {
    if (!newTodo.trim()) return;
    await addTodo(newTodo);
    setNewTodo('');
    fetchTodos();
  };

  return (
    <div className="app">
      <h1>Todo Summary Assistant</h1>
      <input
        value={newTodo}
        onChange={(e) => setNewTodo(e.target.value)}
        placeholder="Add new todo"
      />
      <button onClick={handleAddTodo}>Add</button>
      
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>
            {todo.text}
            <button onClick={() => deleteTodo(todo.id).then(fetchTodos)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
      
      <button onClick={() => summarizeTodos().then(alert)}>
        Generate Summary
      </button>
    </div>
  );
}

export default App;