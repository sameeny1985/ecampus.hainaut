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
  const [view, setView] = useState('inbox') // inbox, sent, trash
  const [replyTo, setReplyTo] = useState(null)
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)

  const fetchConversations = () => {
    api.get('/messaging/conversations/').then(r => setConversations(r.data.results || r.data || [])).catch(() => {})
  }

  useEffect(() => {
    api.get('/messaging/users/').then(r => setUsers(r.data.results || r.data || [])).catch(() => {})
    fetchConversations()
    const convInterval = setInterval(fetchConversations, 10000)
    return () => clearInterval(convInterval)
  }, [])

  useEffect(() => {
    if (!selectedConv) return
    const loadMessages = () => {
      api.get(`/messaging/conversations/${selectedConv.id}/messages/`)
        .then(r => setMessages(r.data.results || r.data || []))
        .catch(() => setMessages([]))
    }
    loadMessages()
    const msgInterval = setInterval(loadMessages, 5000)
    return () => clearInterval(msgInterval)
  }, [selectedConv])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const getOther = (conv) => conv?.participants_detail?.find(p => p.id !== user?.id)

  const startConversation = async () => {
    if (!recipientId) return
    try {
      const res = await api.post('/messaging/conversations/', { recipient_id: recipientId })
      setConversations([res.data, ...conversations.filter(c => c.id !== res.data.id)])
      setSelectedConv(res.data)
      setRecipientId('')
      setView('inbox')
    } catch (err) {
      alert('Erreur: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message))
    }
  }

  const sendMessage = async (e) => {
    if (e) e.preventDefault()
    if (!selectedConv || (!content.trim() && !file)) return
    const formData = new FormData()
    const finalContent = replyTo
      ? `↪ En réponse à « ${(replyTo.display_content || replyTo.content || '').slice(0, 50)} » :\n${content}`
      : content
    if (finalContent) formData.append('content', finalContent)
    if (file) formData.append('file', file)
    try {
      const res = await api.post(`/messaging/conversations/${selectedConv.id}/messages/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setMessages([...messages, res.data])
      setContent('')
      setFile(null)
      setReplyTo(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      fetchConversations()
    } catch (err) {
      alert('Erreur d\'envoi')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleForwardLast = () => {
    const lastMsg = messages[messages.length - 1]
    if (!lastMsg) return
    const textToForward = lastMsg.display_content || lastMsg.content || ''
    setContent(`Fwd: ${textToForward}`)
  }

  const deleteConversation = async (convId) => {
    if (!confirm('Supprimer cette conversation ?')) return
    setConversations(conversations.filter(c => c.id !== convId))
    if (selectedConv?.id === convId) setSelectedConv(null)
    // Note: backend delete endpoint can be added later
  }

  const filteredConvs = conversations.filter(conv => {
    if (view === 'trash') return false // placeholder
    if (view === 'sent') return conv.last_message?.sender === user?.id
    return true
  })

  return (
    <div className="max-w-6xl mx-auto py-4 px-4 h-[calc(100vh-70px)] flex gap-4">
      {/* Sidebar */}
      <div className="w-72 bg-white rounded-xl shadow flex flex-col">
        <div className="p-4 border-b space-y-2">
          <button onClick={() => setView('inbox')} className={`w-full text-left px-3 py-2 rounded ${view==='inbox'?'bg-blue-100 text-blue-700':'hover:bg-gray-100'}`}>📥 Boîte de réception</button>
          <button onClick={() => setView('sent')} className={`w-full text-left px-3 py-2 rounded ${view==='sent'?'bg-blue-100 text-blue-700':'hover:bg-gray-100'}`}>📤 Envoyés</button>
          <button onClick={() => setView('trash')} className={`w-full text-left px-3 py-2 rounded ${view==='trash'?'bg-blue-100 text-blue-700':'hover:bg-gray-100'}`}>🗑️ Corbeille</button>
        </div>
        <div className="p-4 border-b">
          <select value={recipientId} onChange={e => setRecipientId(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm mb-2">
            <option value="">Nouveau message...</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.full_name || u.first_name} — {u.email}</option>
            ))}
          </select>
          <button onClick={startConversation} disabled={!recipientId} className="w-full bg-blue-600 text-white text-sm py-1.5 rounded disabled:opacity-50">
            Composer
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredConvs.map(conv => {
            const other = getOther(conv)
            return (
              <div key={conv.id} onClick={() => setSelectedConv(conv)}
                className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${selectedConv?.id === conv.id ? 'bg-blue-50' : ''}`}>
                <div className="flex justify-between">
                  <div className="font-medium text-sm truncate">{other?.full_name || other?.first_name}</div>
                  <button onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id) }} className="text-gray-400 hover:text-red-500 text-xs">✕</button>
                </div>
                <div className="text-xs text-gray-500 truncate">{other?.email}</div>
                <div className="text-xs text-gray-400 truncate">{conv.last_message?.display_content || conv.last_message?.content || 'Aucun message'}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 bg-white rounded-xl shadow flex flex-col">
        {selectedConv ? (
          <>
            <div className="p-4 border-b flex justify-between items-center">
              <div>
                <div className="font-medium">{getOther(selectedConv)?.full_name}</div>
                <div className="text-xs text-gray-500">{getOther(selectedConv)?.email}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setReplyTo(messages[messages.length-1])} className="text-sm text-blue-600 hover:underline">Répondre</button>
                <button onClick={handleForwardLast} className="text-sm text-blue-600 hover:underline">Transférer</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === user?.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-md px-4 py-3 rounded-lg ${msg.sender === user?.id ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
                    <div className="text-xs opacity-70 mb-1">{msg.sender_detail?.email}</div>
                    {msg.display_content && <p className="whitespace-pre-wrap">{msg.display_content}</p>}
                    {!msg.display_content && msg.content && !msg.content.includes('[FILE]') && (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                    {(msg.file_url || (msg.content && msg.content.includes('[FILE]'))) && (
                      <a 
                        href={msg.file_url || (msg.content || '').split('[FILE]')[1]?.trim()} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-white/20 rounded text-sm hover:bg-white/30"
                      >
                        📎 Télécharger le fichier
                      </a>
                    )}
                    <div className="text-xs opacity-60 mt-1 flex items-center justify-between gap-2">
                      <span>{new Date(msg.created_at).toLocaleString('fr-FR')}</span>
                      {msg.sender === user?.id && (
                        <span>{msg.is_read ? '✓✓ Lu' : '✓ Envoyé'}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={sendMessage} className="p-4 border-t">
              {replyTo && (
                <div className="flex justify-between items-center text-xs text-gray-500 mb-2 bg-gray-50 p-2 rounded">
                  <span>Réponse à : {(replyTo.display_content || replyTo.content)?.slice(0,40)}...</span>
                  <button type="button" onClick={() => setReplyTo(null)} className="text-red-500">✕ Annuler</button>
                </div>
              )}
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Écrire votre message... (Entrée pour envoyer, Maj+Entrée pour une ligne)"
                rows={4}
                className="w-full border rounded-lg px-3 py-2 mb-2 resize-none"
              />
              <div className="flex items-center gap-3">
                <input ref={fileInputRef} type="file" onChange={e => setFile(e.target.files[0])} className="text-sm" />
                <button type="submit" className="ml-auto bg-blue-600 text-white px-6 py-2 rounded-lg">
                  Envoyer
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Sélectionnez une conversation
          </div>
        )}
      </div>
    </div>
  )
}
