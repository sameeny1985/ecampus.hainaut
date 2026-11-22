import { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

export default function MessagingPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [conversations, setConversations] = useState([])
  const [selectedConv, setSelectedConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [content, setContent] = useState('')
  const [file, setFile] = useState(null)
  const [recipientId, setRecipientId] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    api.get('/messaging/users/')
      .then(r => setUsers(r.data.results || r.data || []))
      .catch(() => setUsers([]))
    api.get('/messaging/conversations/')
      .then(r => setConversations(r.data.results || r.data || []))
      .catch(() => setConversations([]))
  }, [])

  useEffect(() => {
    if (selectedConv) {
      api.get(`/messaging/conversations/${selectedConv.id}/messages/`)
        .then(r => setMessages(r.data.results || r.data || []))
    }
  }, [selectedConv])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startConversation = async () => {
    if (!recipientId) return
    try {
      const res = await api.post('/messaging/conversations/', { recipient_id: recipientId })
      setConversations([res.data, ...conversations.filter(c => c.id !== res.data.id)])
      setSelectedConv(res.data)
      setRecipientId('')
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.detail || 'Erreur: impossible de démarrer la conversation')
      console.error(err)
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!selectedConv || (!content && !file)) return
    const formData = new FormData()
    if (content) formData.append('content', content)
    if (file) formData.append('file', file)
    const res = await api.post(`/messaging/conversations/${selectedConv.id}/messages/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    setMessages([...messages, res.data])
    setContent('')
    setFile(null)
  }

  const getOtherParticipant = (conv) => {
    return conv.participants_detail?.find(p => p.id !== user?.id)
  }

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 h-[calc(100vh-80px)] flex gap-4">
      {/* Sidebar */}
      <div className="w-80 bg-white rounded-xl shadow flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold mb-3">Nouveau message</h2>
          <select
            value={recipientId}
            onChange={e => setRecipientId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm mb-2"
          >
            <option value="">Choisir un destinataire</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.full_name || u.email} ({u.role})
              </option>
            ))}
          </select>
          <button
            onClick={startConversation}
            disabled={!recipientId}
            className="w-full bg-blue-600 text-white text-sm py-2 rounded-lg disabled:opacity-50"
          >
            Démarrer
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map(conv => {
            const other = getOtherParticipant(conv)
            return (
              <div
                key={conv.id}
                onClick={() => setSelectedConv(conv)}
                className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${selectedConv?.id === conv.id ? 'bg-blue-50' : ''}`}
              >
                <div className="font-medium text-sm">{other?.full_name || other?.email || 'Conversation'}</div>
                <div className="text-xs text-gray-500 truncate">{conv.last_message?.content || 'Aucun message'}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 bg-white rounded-xl shadow flex flex-col">
        {selectedConv ? (
          <>
            <div className="p-4 border-b font-medium">
              {getOtherParticipant(selectedConv)?.full_name || 'Conversation'}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === user?.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-4 py-2 rounded-lg ${msg.sender === user?.id ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
                    {msg.content && <p>{msg.content}</p>}
                    {msg.file_url && (
                      <a href={msg.file_url} target="_blank" rel="noreferrer" className="underline text-sm">
                        📎 Fichier
                      </a>
                    )}
                    <div className="text-xs opacity-70 mt-1">{new Date(msg.created_at).toLocaleTimeString('fr-FR')}</div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={sendMessage} className="p-4 border-t flex gap-2">
              <input
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Écrire un message..."
                className="flex-1 border rounded-lg px-3 py-2"
              />
              <input
                type="file"
                onChange={e => setFile(e.target.files[0])}
                className="text-sm"
              />
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg">
                Envoyer
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Sélectionnez une conversation ou démarrez-en une nouvelle
          </div>
        )}
      </div>
    </div>
  )
}
