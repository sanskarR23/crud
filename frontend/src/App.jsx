import React, { useEffect, useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function App() {
  const [todos, setTodos] = useState([])
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')

  useEffect(() => { fetchTodos(); }, [])

  async function fetchTodos() {
    const res = await axios.get(`${API}/todos`)
    setTodos(res.data)
  }

  async function addTodo(e) {
    e.preventDefault()
    const res = await axios.post(`${API}/todos`, { title: title, description: desc, completed: false })
    setTitle('')
    setDesc('')
    setTodos(prev => [res.data, ...prev])
  }

  async function toggle(todo) {
    await axios.put(`${API}/todos/${todo.id}`, { ...todo, completed: !todo.completed })
    fetchTodos()
  }

  async function remove(id) {
    await axios.delete(`${API}/todos/${id}`)
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div style={{maxWidth:800, margin:'20px auto', fontFamily:'Segoe UI, sans-serif'}}>
      <h2>Simple Todo (React + .NET + MySQL)</h2>
      <form onSubmit={addTodo} style={{marginBottom:20}}>
        <input required placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} style={{padding:8, width:'60%'}} />
        <input placeholder="Description" value={desc} onChange={e=>setDesc(e.target.value)} style={{padding:8, width:'30%', marginLeft:8}} />
        <button style={{padding:8, marginLeft:8}}>Add</button>
      </form>

      <ul style={{listStyle:'none', padding:0}}>
        {todos.map(todo => (
          <li key={todo.id} style={{padding:10, borderBottom:'1px solid #eee', display:'flex', alignItems:'center'}}>
            <input type="checkbox" checked={todo.completed} onChange={()=>toggle(todo)} />
            <div style={{flex:1, marginLeft:12}}>
              <div style={{fontWeight:600}}>{todo.title}</div>
              <div style={{color:'#666'}}>{todo.description}</div>
            </div>
            <button onClick={()=>remove(todo.id)} style={{marginLeft:8}}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
