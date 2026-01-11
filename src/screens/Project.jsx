import React, { useState, useEffect, useContext, useRef } from 'react'
import { UserContext } from '../context/user.context'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from '../config/axios'
import { initializeSocket, receiveMessage, sendMessage } from '../config/socket'
import Markdown from 'markdown-to-jsx'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'
import { getWebContainer } from '../config/webContainer'

function SyntaxHighlightedCode(props) {
    const ref = useRef(null)

    React.useEffect(() => {
        if (ref.current && props.className?.includes('lang-') && window.hljs) {
            window.hljs.highlightElement(ref.current)
            ref.current.removeAttribute('data-highlighted')
        }
    }, [props.className, props.children])

    return <code {...props} ref={ref} />
}

const Project = () => {
    const location = useLocation()
    const [isSidePanelOpen, setIsSidePanelOpen] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedUserId, setSelectedUserId] = useState(new Set())
    const [project, setProject] = useState(location.state.project)
    const [message, setMessage] = useState('')
    const { user } = useContext(UserContext)
    const messageBox = React.createRef()
    const [users, setUsers] = useState([])
    const [messages, setMessages] = useState([])
    const [fileTree, setFileTree] = useState({})
    const [currentFile, setCurrentFile] = useState(null)
    const [openFiles, setOpenFiles] = useState([])
    const [webContainer, setWebContainer] = useState(null)
    const [iframeUrl, setIframeUrl] = useState(null)
    const [runProcess, setRunProcess] = useState(null)
    const [isAiTyping, setIsAiTyping] = useState(false)
    const [showMobileChat, setShowMobileChat] = useState(false)
    const [showMobilePreview, setShowMobilePreview] = useState(false)
    const navigate = useNavigate()

    const handleUserClick = (id) => {
        setSelectedUserId(prevSelectedUserId => {
            const newSelectedUserId = new Set(prevSelectedUserId)
            if (newSelectedUserId.has(id)) {
                newSelectedUserId.delete(id)
            } else {
                newSelectedUserId.add(id)
            }
            return newSelectedUserId
        })
    }

    function addCollaborators() {
        axios.put("/projects/add-user", {
            projectId: location.state.project._id,
            users: Array.from(selectedUserId)
        }).then(res => {
            console.log(res.data)
            setIsModalOpen(false)
        }).catch(err => {
            console.log(err)
        })
    }

    const send = () => {
        if (!message.trim()) return
        
        sendMessage('project-message', {
            message,
            sender: user
        })
        setMessages(prevMessages => [...prevMessages, { sender: user, message }])
        setMessage("")
    }

    function WriteAiMessage(messageText) {
        return (
            <div className='overflow-auto'>
                <Markdown
                    children={messageText}
                    options={{
                        overrides: {
                            code: SyntaxHighlightedCode,
                        },
                    }}
                />
            </div>
        )
    }

    useEffect(() => {
        initializeSocket(project._id)

        if (!webContainer) {
            getWebContainer().then(container => {
                setWebContainer(container)
                console.log("container started")
            })
        }

        receiveMessage('ai-typing', data => {
            setIsAiTyping(data.isTyping)
        })

        receiveMessage('project-message', data => {
            console.log("Received message:", data)

            if (data.sender._id === 'ai') {
                if (data.fileTree) {
                    console.log("Setting fileTree:", data.fileTree)
                    setFileTree(data.fileTree)
                    
                    if (webContainer) {
                        console.log("Mounting to webContainer")
                        webContainer.mount(data.fileTree).catch(err => {
                            console.error("Error mounting fileTree:", err)
                        })
                    }
                }
                setMessages(prevMessages => [...prevMessages, data])
            } else {
                setMessages(prevMessages => [...prevMessages, data])
            }
        })

        axios.get(`/projects/get-project/${location.state.project._id}`).then(res => {
            console.log(res.data.project)
            setProject(res.data.project)
            setFileTree(res.data.project.fileTree || {})
        })

        axios.get('/users/all').then(res => {
            setUsers(res.data.users)
        }).catch(err => {
            console.log(err)
        })

    }, [])

    function saveFileTree(ft) {
        axios.put('/projects/update-file-tree', {
            projectId: project._id,
            fileTree: ft
        }).then(res => {
            console.log(res.data)
        }).catch(err => {
            console.log(err)
        })
    }

    function scrollToBottom() {
        messageBox.current.scrollTop = messageBox.current.scrollHeight
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, isAiTyping])

    return (
        <main className='h-screen w-screen flex flex-col md:flex-row bg-[#0a0a0a] overflow-hidden'>
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#2d2d30] border-t border-[#3e3e42] flex">
                <button
                    onClick={() => {
                        setShowMobileChat(true)
                        setShowMobilePreview(false)
                    }}
                    className={`flex-1 py-3 flex items-center justify-center gap-2 transition-all ${
                        showMobileChat ? 'bg-purple-600 text-white' : 'text-zinc-400'
                    }`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="text-sm font-medium">Chat</span>
                </button>
                <button
                    onClick={() => {
                        setShowMobileChat(false)
                        setShowMobilePreview(false)
                    }}
                    className={`flex-1 py-3 flex items-center justify-center gap-2 transition-all ${
                        !showMobileChat && !showMobilePreview ? 'bg-purple-600 text-white' : 'text-zinc-400'
                    }`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <span className="text-sm font-medium">Code</span>
                </button>
                {iframeUrl && (
                    <button
                        onClick={() => {
                            setShowMobileChat(false)
                            setShowMobilePreview(true)
                        }}
                        className={`flex-1 py-3 flex items-center justify-center gap-2 transition-all ${
                            showMobilePreview ? 'bg-purple-600 text-white' : 'text-zinc-400'
                        }`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span className="text-sm font-medium">Preview</span>
                    </button>
                )}
            </div>

            <section className={`${showMobileChat ? 'flex' : 'hidden'} md:flex flex-col h-screen w-full md:w-[380px] lg:w-[420px] bg-gradient-to-b from-[#7c3aed] to-[#5b21b6] shadow-2xl pb-14 md:pb-0`}>
                <header className='flex justify-between items-center p-3 md:p-5 backdrop-blur-xl bg-white/10 border-b border-white/20'>
                    <div className="flex items-center gap-2 md:gap-3">
                        <button 
                            onClick={() => navigate('/')}
                            className="p-1.5 md:p-2 hover:bg-white/10 rounded-xl transition-all duration-200 group">
                            <svg className="w-4 h-4 md:w-5 md:h-5 text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 md:w-2.5 md:h-2.5 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                            <h1 className='font-bold text-base md:text-lg text-white drop-shadow-lg truncate max-w-[150px] md:max-w-none'>{project.name}</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 md:gap-2">
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className='p-1.5 md:p-2.5 hover:bg-white/10 rounded-xl transition-all duration-200 group'>
                            <svg className="w-4 h-4 md:w-5 md:h-5 text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                        </button>
                        <button 
                            onClick={() => setIsSidePanelOpen(!isSidePanelOpen)} 
                            className='p-1.5 md:p-2.5 hover:bg-white/10 rounded-xl transition-all duration-200 group'>
                            <svg className="w-4 h-4 md:w-5 md:h-5 text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </button>
                    </div>
                </header>

                <div className="flex-grow overflow-y-auto p-3 md:p-5 space-y-3 md:space-y-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent" ref={messageBox}>
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.sender._id == user._id.toString() ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                            <div className={`max-w-[85%] ${msg.sender._id === 'ai' ? 'max-w-[95%]' : ''}`}>
                                {msg.sender._id == user._id.toString() ? (
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="bg-white text-gray-800 rounded-2xl rounded-tr-sm px-3 md:px-5 py-2 md:py-3 shadow-lg">
                                            <p className="text-sm md:text-[15px] leading-relaxed break-words">{msg.message}</p>
                                        </div>
                                        <span className="text-xs text-white/70 px-2">You</span>
                                    </div>
                                ) : msg.sender._id === 'ai' ? (
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shadow-lg">
                                                <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                </svg>
                                            </div>
                                            <span className="text-xs font-semibold text-white/90">AI Assistant</span>
                                        </div>
                                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl rounded-tl-sm px-3 md:px-5 py-3 md:py-4 shadow-xl">
                                            {msg.error ? (
                                                <p className="text-red-300 text-sm md:text-[15px]">{msg.message}</p>
                                            ) : (
                                                <div className="text-sm md:text-[15px] leading-relaxed text-white">
                                                    {WriteAiMessage(msg.message)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 px-2">
                                            <div className='w-5 h-5 md:w-6 md:h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white border-2 border-white/30'>
                                                {msg.sender.email?.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-xs text-white/70 truncate max-w-[150px]">{msg.sender.email}</span>
                                        </div>
                                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl rounded-tl-sm px-3 md:px-5 py-2 md:py-3 shadow-lg">
                                            <p className="text-sm md:text-[15px] leading-relaxed text-white break-words">{msg.message}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    
                    {isAiTyping && (
                        <div className="flex justify-start animate-fadeIn">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shadow-lg animate-pulse">
                                        <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    <span className="text-xs font-semibold text-white/90">AI Assistant</span>
                                </div>
                                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl rounded-tl-sm px-3 md:px-5 py-3 md:py-4 shadow-xl">
                                    <div className="flex items-center gap-2">
                                        <div className="flex gap-1">
                                            <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                            <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                            <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                                        </div>
                                        <span className="text-xs text-white/60">Thinking...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-3 md:p-4 backdrop-blur-xl bg-white/10 border-t border-white/20">
                    <div className="flex gap-2">
                        <input 
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    send()
                                }
                            }}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            type="text"
                            placeholder="Type your message..."
                            className='flex-grow px-3 md:px-5 py-2.5 md:py-3.5 bg-white/20 backdrop-blur-xl border border-white/30 rounded-2xl outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/60 transition-all duration-200 text-sm md:text-base' />
                        <button
                            onClick={send}
                            disabled={!message.trim()}
                            className='px-4 md:px-6 py-2.5 md:py-3.5 bg-white text-purple-600 rounded-2xl hover:bg-white/90 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white flex items-center gap-2 shadow-lg hover:shadow-xl font-semibold group'>
                            <svg className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </div>
                    <p className="text-xs text-white/60 mt-2 md:mt-3 px-1">
                        💡 <span className="font-medium">Tip:</span> Use "@ai" to interact with AI
                    </p>
                </div>

                <div className={`absolute inset-0 bg-gradient-to-b from-[#7c3aed] to-[#5b21b6] transform transition-transform duration-300 ${isSidePanelOpen ? 'translate-x-0' : '-translate-x-full'} z-10`}>
                    <header className='flex justify-between items-center p-3 md:p-5 backdrop-blur-xl bg-white/10 border-b border-white/20'>
                        <h1 className='font-bold text-base md:text-lg text-white'>Collaborators</h1>
                        <button 
                            onClick={() => setIsSidePanelOpen(!isSidePanelOpen)} 
                            className='p-2 hover:bg-white/10 rounded-xl transition-all'>
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </header>
                    <div className="p-3 md:p-4 space-y-2 md:space-y-3 overflow-auto max-h-[calc(100vh-100px)]">
                        {project.users && project.users.map(user => (
                            <div key={user._id} className="flex items-center gap-3 p-3 md:p-4 hover:bg-white/10 rounded-2xl cursor-pointer transition-all duration-200 backdrop-blur-xl border border-white/10">
                                <div className='w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-base md:text-lg border-2 border-white/30'>
                                    {user.email?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h1 className='font-semibold text-white text-sm md:text-base truncate'>{user.email}</h1>
                                    <p className="text-xs text-white/60 flex items-center gap-1">
                                        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                        Active now
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className={`${!showMobileChat && !showMobilePreview ? 'flex' : 'hidden'} md:flex flex-col flex-grow h-screen bg-[#1e1e1e] pb-14 md:pb-0`}>
                <div className="flex flex-grow overflow-hidden flex-col md:flex-row">
                    <div className="w-full md:w-48 lg:w-72 bg-[#252526] border-r border-[#3e3e42] overflow-auto">
                        <div className="p-3 md:p-4 border-b border-[#3e3e42] bg-[#2d2d30]">
                            <h2 className="font-bold text-xs md:text-sm text-[#cccccc] uppercase tracking-wider flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                                <span>Explorer</span>
                            </h2>
                        </div>
                        <div className="p-2">
                            {Object.keys(fileTree).length === 0 ? (
                                <div className="text-center py-8 md:py-12 px-2">
                                    <svg className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-2 md:mb-3 text-[#6e6e6e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-xs md:text-sm text-[#8c8c8c]">No files yet</p>
                                    <p className="text-xs text-[#6e6e6e] mt-1">Ask AI to create files</p>
                                </div>
                            ) : (
                                Object.keys(fileTree).map((file, index) => {
                                    const isActive = currentFile === file
                                    const extension = file.split('.').pop()
                                    
                                    const getFileIcon = () => {
                                        switch(extension) {
                                            case 'js':
                                            case 'jsx':
                                                return { icon: '⚛', color: 'text-[#f0db4f]' }
                                            case 'json':
                                                return { icon: '{}', color: 'text-[#5ec9f8]' }
                                            case 'css':
                                                return { icon: '#', color: 'text-[#42a5f5]' }
                                            case 'html':
                                                return { icon: '<>', color: 'text-[#e34c26]' }
                                            case 'md':
                                                return { icon: 'M', color: 'text-[#0bf]' }
                                            default:
                                                return { icon: '📄', color: 'text-[#8c8c8c]' }
                                        }
                                    }
                                    
                                    const fileInfo = getFileIcon()
                                    
                                    return (
                                        <button
                                            key={index}
                                            onClick={() => {
                                                setCurrentFile(file)
                                                setOpenFiles([...new Set([...openFiles, file])])
                                            }}
                                            className={`w-full text-left px-2 md:px-3 py-2 md:py-2.5 text-xs md:text-[13px] rounded-lg transition-all duration-150 flex items-center gap-2 md:gap-3 group ${
                                                isActive 
                                                    ? 'bg-[#37373d] text-white border-l-2 border-[#007acc]' 
                                                    : 'text-[#cccccc] hover:bg-[#2a2d2e]'
                                            }`}>
                                            <span className={`text-sm md:text-base ${fileInfo.color}`}>{fileInfo.icon}</span>
                                            <span className="truncate flex-grow">{file}</span>
                                            {isActive && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#007acc]"></div>
                                            )}
                                        </button>
                                    )
                                })
                            )}
                        </div>
                    </div>

                    <div className="flex-grow flex flex-col bg-[#1e1e1e] overflow-hidden">
                        <div className="flex items-center gap-0 bg-[#2d2d30] border-b border-[#3e3e42] overflow-x-auto scrollbar-thin scrollbar-thumb-gray scrollbar-track-transparent flex-shrink-0">
                            <div className="flex items-center overflow-x-auto flex-grow">
                                {openFiles.length === 0 ? (
                                    <div className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-[#8c8c8c] flex items-center gap-2 whitespace-nowrap">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        No files open
                                    </div>
                                ) : (openFiles.map((file, index) => {
                                    const extension = file.split('.').pop()
                                    const getFileIcon = () => {
                                        switch(extension) {
                                            case 'js':
                                            case 'jsx':
                                                return '⚛'
                                            case 'json':
                                                return '{}'
                                            case 'css':
                                                return '#'
                                            case 'html':
                                                return '<>'
                                            default:
                                                return '📄'
                                        }
                                    }
                                    
                                    return (
                                        <div
                                            key={index}
                                            className={`relative flex items-center gap-2 px-3 md:px-5 py-2 md:py-3 text-xs md:text-[13px] border-r border-[#3e3e42] transition-all cursor-pointer group whitespace-nowrap ${
                                                currentFile === file 
                                                    ? 'bg-[#1e1e1e] text-white' 
                                                    : 'text-[#969696] hover:bg-[#37373d] hover:text-white'
                                            }`}
                                            onClick={() => setCurrentFile(file)}>
                                            <span>{getFileIcon()}</span>
                                            <span className="truncate max-w-[100px] md:max-w-[150px] font-medium">{file}</span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    const newOpenFiles = openFiles.filter(f => f !== file)
                                                    setOpenFiles(newOpenFiles)
                                                    if (currentFile === file && newOpenFiles.length > 0) {
                                                        setCurrentFile(newOpenFiles[0])
                                                    } else if (newOpenFiles.length === 0) {
                                                        setCurrentFile(null)
                                                    }
                                                }}
                                                className="opacity-0 group-hover:opacity-100 hover:bg-[#505050] rounded p-1 transition-all">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                            {currentFile === file && (
                                                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#007acc]"></div>
                                            )}
                                        </div>
                                    )
                                })
                            )}
                        </div>
                        <div className="flex items-center gap-2 px-2 md:px-4 border-l border-[#3e3e42] flex-shrink-0">
                            <button
                                onClick={async () => {
                                    if (!webContainer) {
                                        console.error("WebContainer not initialized")
                                        return
                                    }
                                    await webContainer.mount(fileTree)
                                    const installProcess = await webContainer.spawn("npm", ["install"])
                                    installProcess.output.pipeTo(new WritableStream({
                                        write(chunk) { console.log(chunk) }
                                    }))
                                    if (runProcess) runProcess.kill()
                                    let tempRunProcess = await webContainer.spawn("npm", ["start"])
                                    tempRunProcess.output.pipeTo(new WritableStream({
                                        write(chunk) { console.log(chunk) }
                                    }))
                                    setRunProcess(tempRunProcess)
                                    webContainer.on('server-ready', (port, url) => {
                                        console.log(port, url)
                                        setIframeUrl(url)
                                        setShowMobilePreview(true)
                                    })
                                }}
                                className='px-3 md:px-5 py-1.5 md:py-2 bg-[#0e639c] text-white text-xs md:text-sm rounded-lg hover:bg-[#1177bb] transition-all duration-200 flex items-center gap-2 font-medium shadow-lg whitespace-nowrap'>
                                <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="hidden sm:inline">Run</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex-grow overflow-auto bg-[#1e1e1e]">
                        {fileTree[currentFile] ? (
                            <div className="h-full">
                                <pre className="hljs h-full p-3 md:p-6 m-0" style={{background: '#1e1e1e', fontSize: '13px', lineHeight: '1.6'}}>
                                    <code
                                        className="hljs h-full outline-none font-mono"
                                        contentEditable
                                        suppressContentEditableWarning
                                        onBlur={(e) => {
                                            const updatedContent = e.target.innerText
                                            const ft = {
                                                ...fileTree,
                                                [currentFile]: {
                                                    file: { contents: updatedContent }
                                                }
                                            }
                                            setFileTree(ft)
                                            saveFileTree(ft)
                                        }}
                                        dangerouslySetInnerHTML={{ 
                                            __html: hljs.highlight(
                                                currentFile.endsWith('.json') ? 'json' : 
                                                currentFile.endsWith('.css') ? 'css' : 
                                                currentFile.endsWith('.html') ? 'html' : 
                                                currentFile.endsWith('.jsx') ? 'javascript' :
                                                'javascript', 
                                                fileTree[currentFile].file.contents
                                            ).value 
                                        }}
                                        style={{
                                            whiteSpace: 'pre-wrap',
                                            paddingBottom: '10rem',
                                            color: '#d4d4d4',
                                            background: '#1e1e1e'
                                        }}
                                    />
                                </pre>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-[#8c8c8c] p-4">
                                <div className="text-center">
                                    <svg className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-3 md:mb-4 text-[#6e6e6e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                    </svg>
                                    <p className="text-base md:text-lg font-medium text-[#cccccc] mb-2">Ready to code</p>
                                    <p className="text-xs md:text-sm text-[#8c8c8c] max-w-[250px] mx-auto">Select a file from the explorer or ask AI to create one</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {iframeUrl && webContainer && (
                    <div className="hidden lg:flex w-[400px] xl:w-[480px] flex-col border-l border-[#3e3e42] bg-[#252526]">
                        <div className="bg-[#2d2d30] border-b border-[#3e3e42] p-3 flex items-center gap-3">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#ff5f56] hover:bg-[#ff5f56]/80 cursor-pointer"></div>
                                <div className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:bg-[#ffbd2e]/80 cursor-pointer"></div>
                                <div className="w-3 h-3 rounded-full bg-[#27c93f] hover:bg-[#27c93f]/80 cursor-pointer"></div>
                            </div>
                            <input 
                                type="text"
                                onChange={(e) => setIframeUrl(e.target.value)}
                                value={iframeUrl} 
                                className="flex-1 px-3 md:px-4 py-1.5 md:py-2 bg-[#3c3c3c] border border-[#505050] rounded-lg text-xs md:text-sm outline-none focus:ring-2 focus:ring-[#007acc] text-[#cccccc] font-mono" 
                                placeholder="http://localhost:3000"
                            />
                            <button 
                                onClick={() => {
                                    const iframe = document.querySelector('iframe')
                                    if (iframe) iframe.src = iframe.src
                                }}
                                className="p-2 hover:bg-[#3c3c3c] rounded-lg transition-colors">
                                <svg className="w-4 h-4 text-[#cccccc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        </div>
                        <iframe src={iframeUrl} className="flex-grow w-full bg-white"></iframe>
                    </div>
                )}
            </div>
        </section>

        {showMobilePreview && iframeUrl && (
            <div className="md:hidden flex flex-col h-screen bg-[#252526] pb-14">
                <div className="bg-[#2d2d30] border-b border-[#3e3e42] p-3 flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></div>
                    </div>
                    <input 
                        type="text"
                        onChange={(e) => setIframeUrl(e.target.value)}
                        value={iframeUrl} 
                        className="flex-1 px-3 py-1.5 bg-[#3c3c3c] border border-[#505050] rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#007acc] text-[#cccccc] font-mono" 
                    />
                    <button 
                        onClick={() => {
                            const iframe = document.querySelector('iframe')
                            if (iframe) iframe.src = iframe.src
                        }}
                        className="p-2 hover:bg-[#3c3c3c] rounded-lg transition-colors">
                        <svg className="w-4 h-4 text-[#cccccc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
                <iframe src={iframeUrl} className="flex-grow w-full bg-white"></iframe>
            </div>
        )}

        {isModalOpen && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
                <div className="bg-[#2d2d30] rounded-2xl md:rounded-3xl w-full max-w-md shadow-2xl border border-[#3e3e42] animate-scaleIn max-h-[90vh] overflow-hidden flex flex-col">
                    <header className='flex justify-between items-center p-4 md:p-6 border-b border-[#3e3e42] flex-shrink-0'>
                        <h2 className='text-xl md:text-2xl font-bold text-white flex items-center gap-2 md:gap-3'>
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                            </div>
                            <span className="text-base md:text-2xl">Add Collaborator</span>
                        </h2>
                        <button 
                            onClick={() => setIsModalOpen(false)} 
                            className='p-2 md:p-2.5 hover:bg-[#3c3c3c] rounded-xl transition-all'>
                            <svg className="w-5 h-5 md:w-6 md:h-6 text-[#cccccc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </header>
                    <div className="p-4 md:p-6 overflow-auto space-y-2 scrollbar-thin scrollbar-thumb-gray scrollbar-track-transparent flex-grow">
                        {users.map(user => (
                            <div 
                                key={user._id} 
                                className={`flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl md:rounded-2xl cursor-pointer transition-all duration-200 ${
                                    Array.from(selectedUserId).indexOf(user._id) != -1 
                                        ? 'bg-gradient-to-r from-purple-600/30 to-pink-600/30 border-2 border-purple-500 shadow-lg shadow-purple-500/20' 
                                        : 'hover:bg-[#3c3c3c] border-2 border-transparent'
                                }`} 
                                onClick={() => handleUserClick(user._id)}>
                                <div className='w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-base md:text-lg shadow-lg flex-shrink-0'>
                                    {user.email?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-grow min-w-0">
                                    <span className='font-semibold text-white text-sm md:text-base truncate block'>{user.email}</span>
                                    <p className="text-xs text-[#8c8c8c]">Developer</p>
                                </div>
                                {Array.from(selectedUserId).indexOf(user._id) != -1 && (
                                    <svg className="w-5 h-5 md:w-6 md:h-6 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="p-4 md:p-6 border-t border-[#3e3e42] flex-shrink-0">
                        <button
                            onClick={addCollaborators}
                            disabled={selectedUserId.size === 0}
                            className='w-full px-4 py-3 md:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl md:rounded-2xl font-bold hover:from-purple-500 hover:to-pink-500 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-purple-600 disabled:hover:to-pink-600 text-sm md:text-base'>
                            Add {selectedUserId.size > 0 ? selectedUserId.size : ''} Collaborator{selectedUserId.size !== 1 ? 's' : ''}
                        </button>
                    </div>
                </div>
            </div>
        )}

        <style dangerouslySetInnerHTML={{__html: `
            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes scaleIn {
                from {
                    opacity: 0;
                    transform: scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }
            
            .animate-fadeIn {
                animation: fadeIn 0.3s ease-out;
            }
            
            .animate-scaleIn {
                animation: scaleIn 0.3s ease-out;
            }

            .scrollbar-thin::-webkit-scrollbar {
                width: 8px;
                height: 8px;
            }
            
            .scrollbar-thin::-webkit-scrollbar-track {
                background: transparent;
            }
            
            .scrollbar-thin::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.2);
                border-radius: 4px;
            }
            
            .scrollbar-thin::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.3);
            }

            .scrollbar-thumb-gray::-webkit-scrollbar-thumb {
                background: #424242;
            }
        `}} />
    </main>
)
}

export default Project
