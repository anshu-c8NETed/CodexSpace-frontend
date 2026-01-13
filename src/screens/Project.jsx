import React, { useState, useEffect, useContext, useRef } from 'react'
import { UserContext } from '../context/user.context'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from '../config/axios'
import { initializeSocket, receiveMessage, sendMessage } from '../config/socket'
import Markdown from 'markdown-to-jsx'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'
import { getWebContainer, isWebContainerSupported } from '../config/webContainer'

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
    const [showMobileSidebar, setShowMobileSidebar] = useState(false)

    // Add these new states:
    const [searchEmail, setSearchEmail] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [isSearching, setIsSearching] = useState(false)
    const [searchError, setSearchError] = useState('')
    
    // Editor states
    const [isRunning, setIsRunning] = useState(false)
    const [buildLogs, setBuildLogs] = useState([])
    const [showLogs, setShowLogs] = useState(true)
    const editorRef = useRef(null)
    const serverReadyListenerRef = useRef(null)
    
    // Resizable panel states
    const [sidebarWidth, setSidebarWidth] = useState(288)
    const [terminalHeight, setTerminalHeight] = useState(50)
    const [chatWidth, setChatWidth] = useState(384)
    const [isResizingSidebar, setIsResizingSidebar] = useState(false)
    const [isResizingTerminal, setIsResizingTerminal] = useState(false)
    const [isResizingChat, setIsResizingChat] = useState(false)
    
    // Team members state
    const [teamMembers, setTeamMembers] = useState([])
    
    // Loading state for adding collaborators
    const [isAddingCollaborators, setIsAddingCollaborators] = useState(false)
    
    const navigate = useNavigate()

    // Add log helper
    const addLog = (type, message) => {
        const timestamp = new Date().toLocaleTimeString()
        setBuildLogs(prev => [...prev, { type, message, timestamp }])
        console.log(`[${type}] ${message}`)
    }

    // Save file tree to backend
    const saveFileTree = async (tree) => {
        try {
            await axios.put('/projects/update-file-tree', {
                projectId: project._id,
                fileTree: tree || fileTree
            })
            addLog('success', '✓ Files saved to database')
        } catch (error) {
            console.error('Error saving file tree:', error)
            addLog('error', '✗ Failed to save files')
        }
    }

    // Detect project type
    const detectProjectType = (tree) => {
        if (!tree || Object.keys(tree).length === 0) return null
        
        const files = Object.keys(tree)
        
        if (files.includes('package.json')) {
            try {
                const packageJson = JSON.parse(tree['package.json'].file.contents)
                if (packageJson.dependencies?.react) return 'react'
                if (packageJson.dependencies?.next) return 'next'
                if (packageJson.dependencies?.express) return 'express'
                if (packageJson.dependencies?.vite) return 'vite'
                return 'node'
            } catch (e) {
                return 'node'
            }
        }
        
        if (files.some(f => f.endsWith('.html'))) return 'html'
        if (files.some(f => f.endsWith('.js'))) return 'javascript'
        
        return 'unknown'
    }

    // Run handler
    const handleRunProject = async () => {
        if (!webContainer) {
            addLog('error', '✗ WebContainer not initialized. Please refresh the page.')
            return
        }

        if (Object.keys(fileTree).length === 0) {
            addLog('error', '✗ No files to run. Use @ai to generate code first.')
            return
        }

        if (runProcess) {
            addLog('info', '🛑 Stopping previous process...')
            try {
                runProcess.kill()
                setRunProcess(null)
            } catch (e) {
                console.error('Error killing process:', e)
            }
        }

        setIsRunning(true)
        setShowLogs(true)
        setBuildLogs([])
        setIframeUrl(null)

        try {
            const projectType = detectProjectType(fileTree)
            addLog('info', `🔍 Detected project type: ${projectType}`)

            if (currentFile && editorRef.current) {
                const content = editorRef.current.value
                const updatedTree = {
                    ...fileTree,
                    [currentFile]: {
                        file: { contents: content }
                    }
                }
                setFileTree(updatedTree)
                await saveFileTree(updatedTree)
            }

            addLog('info', '📦 Mounting files to WebContainer...')
            await webContainer.mount(fileTree)
            addLog('success', '✓ Files mounted successfully')

            if (projectType === 'javascript') {
                await runJavaScriptProject()
            } else if (projectType === 'html') {
                await runStaticProject()
            } else if (projectType === 'react' || projectType === 'vite' || projectType === 'node' || projectType === 'express' || projectType === 'next') {
                await runNodeProject()
            } else {
                addLog('warning', '⚠ Unknown project type, attempting to run as Node.js project')
                await runNodeProject()
            }

        } catch (error) {
            console.error('Run error:', error)
            addLog('error', `✗ Error: ${error.message}`)
            setIsRunning(false)
        }
    }

    const runJavaScriptProject = async () => {
        try {
            addLog('info', '🟨 Running JavaScript file with Node.js...')
            
            const jsFiles = Object.keys(fileTree).filter(f => f.endsWith('.js'))
            const mainFile = jsFiles.find(f => 
                f.includes('index') || 
                f.includes('main') || 
                f.includes('app')
            ) || jsFiles[0]
            
            if (!mainFile) {
                throw new Error('No JavaScript file found')
            }
            
            addLog('info', `📄 Executing: node ${mainFile}`)
            
            const process = await webContainer.spawn('node', [mainFile])
            setRunProcess(process)
            
            process.output.pipeTo(
                new WritableStream({
                    write(data) {
                        addLog('log', data)
                    }
                })
            )
            
            const exitCode = await process.exit
            
            if (exitCode === 0) {
                addLog('success', '✓ Execution completed successfully')
            } else {
                addLog('error', `✗ Exited with code ${exitCode}`)
            }
            
            setIsRunning(false)
            
        } catch (error) {
            throw error
        }
    }

    const runStaticProject = async () => {
        try {
            addLog('info', '🌐 Starting static file server...')

            const serverCode = `
const http = require('http');
const fs = require('fs');
const path = require('path');

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': mimeType });
            res.end(content, 'utf-8');
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(\`Server running at http://localhost:\${PORT}/\`);
});
`;

            await webContainer.fs.writeFile('/server.js', serverCode)
            const process = await webContainer.spawn('node', ['server.js'])
            setRunProcess(process)

            process.output.pipeTo(
                new WritableStream({
                    write(data) {
                        addLog('log', data)
                    }
                })
            )

            webContainer.on('server-ready', (port, url) => {
                addLog('success', `✓ Server ready at ${url}`)
                setIframeUrl(url)
                setIsRunning(false)
                setShowMobilePreview(true)
            })

            setTimeout(() => {
                if (!iframeUrl) {
                    webContainer.getWorkerId().then(workerId => {
                        const url = `https://${workerId}-3000.${window.location.hostname}`
                        setIframeUrl(url)
                        addLog('success', '✓ Server started')
                        setShowMobilePreview(true)
                    })
                }
                setIsRunning(false)
            }, 5000)

        } catch (error) {
            throw error
        }
    }

    const runNodeProject = async () => {
        try {
            const hasPackageJson = fileTree['package.json']
            if (!hasPackageJson) {
                throw new Error('package.json not found')
            }

            addLog('info', '📥 Installing dependencies (npm install)...')
            const installProcess = await webContainer.spawn('npm', ['install'])

            installProcess.output.pipeTo(
                new WritableStream({
                    write(data) {
                        addLog('log', data)
                    }
                })
            )

            const installExitCode = await installProcess.exit

            if (installExitCode !== 0) {
                throw new Error(`npm install failed with exit code ${installExitCode}`)
            }

            addLog('success', '✓ Dependencies installed successfully')

            const packageJson = JSON.parse(fileTree['package.json'].file.contents)
            let startCommand

            if (packageJson.scripts?.dev) {
                startCommand = ['run', 'dev']
                addLog('info', '🚀 Starting dev server (npm run dev)...')
            } else if (packageJson.scripts?.start) {
                startCommand = ['start']
                addLog('info', '🚀 Starting server (npm start)...')
            } else {
                throw new Error('No start script found in package.json')
            }

            const process = await webContainer.spawn('npm', startCommand)
            setRunProcess(process)

            process.output.pipeTo(
                new WritableStream({
                    write(data) {
                        addLog('log', data)
                        
                        if (data.includes('localhost:') || data.includes('127.0.0.1:')) {
                            const portMatch = data.match(/:(\d+)/)
                            if (portMatch) {
                                addLog('info', `📡 Detected server on port ${portMatch[1]}`)
                            }
                        }
                    }
                })
            )

            const handleServerReady = (port, url) => {
                addLog('success', `✓ Server ready at ${url}`)
                setIframeUrl(url)
                setIsRunning(false)
                setShowMobilePreview(true)
            }

            if (serverReadyListenerRef.current) {
                webContainer.off('server-ready', serverReadyListenerRef.current)
            }

            serverReadyListenerRef.current = handleServerReady
            webContainer.on('server-ready', handleServerReady)

            setTimeout(async () => {
                if (!iframeUrl) {
                    try {
                        const workerId = await webContainer.getWorkerId()
                        const commonPorts = [5173, 3000, 8080, 4000]
                        for (const port of commonPorts) {
                            const url = `https://${workerId}-${port}.preview.webcontainer.io`
                            setIframeUrl(url)
                            addLog('info', `🔗 Attempting to connect to port ${port}...`)
                            setShowMobilePreview(true)
                            break
                        }
                    } catch (e) {
                        console.error('Error getting worker ID:', e)
                    }
                }
                setIsRunning(false)
            }, 10000)

        } catch (error) {
            throw error
        }
    }

    const handleStopProject = () => {
        if (runProcess) {
            addLog('info', '🛑 Stopping server...')
            try {
                runProcess.kill()
                setRunProcess(null)
                setIframeUrl(null)
                addLog('success', '✓ Server stopped')
            } catch (e) {
                addLog('error', '✗ Error stopping server')
            }
        }
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

    const send = () => {
        if (!message.trim()) return
        
        sendMessage('project-message', {
            message,
            sender: user
        })
        setMessages(prevMessages => [...prevMessages, { sender: user, message }])
        setMessage("")
    }

    const handleFileClick = (fileName) => {
        setCurrentFile(fileName)
        if (!openFiles.includes(fileName)) {
            setOpenFiles([...openFiles, fileName])
        }
    }

    const handleFileClose = (fileName) => {
        const newOpenFiles = openFiles.filter(f => f !== fileName)
        setOpenFiles(newOpenFiles)
        if (currentFile === fileName) {
            setCurrentFile(newOpenFiles[newOpenFiles.length - 1] || null)
        }
    }

    const handleFileContentChange = (e) => {
        const newContent = e.target.value
        setFileTree(prev => ({
            ...prev,
            [currentFile]: {
                file: { contents: newContent }
            }
        }))
    }

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

    // UPDATED: Direct user addition without invitation
    function addCollaborators() {
        if (selectedUserId.size === 0) {
            alert('Please select at least one user');
            return;
        }

        setIsAddingCollaborators(true);
        
        console.log('📤 Adding collaborators directly...');
        console.log('Project ID:', project._id);
        console.log('Selected User IDs:', Array.from(selectedUserId));
        
        axios.put("/projects/add-user", {
            projectId: project._id,
            users: Array.from(selectedUserId)
        })
        .then(response => {
            console.log('✅ Success:', response.data);
            alert(`Successfully added ${selectedUserId.size} collaborator${selectedUserId.size !== 1 ? 's' : ''}!`);
            setSelectedUserId(new Set());
            setIsModalOpen(false);
            
            // Refresh project details to show new team members
            fetchProjectDetails();
        })
        .catch(err => {
            console.error('❌ Error:', err);
            
            let errorMessage = 'Failed to add collaborators';
            
            if (err.response) {
                errorMessage = err.response.data?.message || 
                              err.response.data?.error || 
                              `Server error: ${err.response.status}`;
                
                if (err.response.status === 401) {
                    errorMessage = 'Authentication failed. Please login again.';
                }
                if (err.response.status === 403) {
                    errorMessage = 'You do not have permission to add collaborators.';
                }
                if (err.response.status === 404) {
                    errorMessage = 'Project or user not found.';
                }
                if (err.response.status === 500) {
                    errorMessage = 'Server error. Please try again later.';
                }
            } else if (err.request) {
                errorMessage = 'Network error: Could not reach server. Check your internet connection.';
            } else {
                errorMessage = `Error: ${err.message}`;
            }
            
            alert(errorMessage);
        })
        .finally(() => {
            setIsAddingCollaborators(false);
        });
    }

    // Fetch project details with populated users
    const fetchProjectDetails = async () => {
        try {
            const response = await axios.get(`/projects/get-project/${project._id}`)
            if (response.data.project) {
                setProject(response.data.project)
                setTeamMembers(response.data.project.users || [])
            }
        } catch (error) {
            console.error('Error fetching project details:', error)
        }
    }

// NEW: Search users by email
const searchUsers = async (email) => {
    if (!email || email.trim().length < 2) {
        setSearchResults([])
        return
    }

    setIsSearching(true)
    setSearchError('')

    try {
        const response = await axios.get(`/projects/search-users/${project._id}`, {
            params: { email: email.trim() }
        })
        setSearchResults(response.data.users || [])
        
        if (response.data.users.length === 0) {
            setSearchError('No users found matching that email')
        }
    } catch (error) {
        console.error('Error searching users:', error)
        setSearchError('Failed to search users')
        setSearchResults([])
    } finally {
        setIsSearching(false)
    }
}

// Debounce search - add this new useEffect
useEffect(() => {
    const timeoutId = setTimeout(() => {
        if (searchEmail) {
            searchUsers(searchEmail)
        }
    }, 500)

    return () => clearTimeout(timeoutId)
}, [searchEmail])

    // Initialize WebContainer
    useEffect(() => {
        const initWebContainer = async () => {
            try {
                addLog('info', '🔍 Checking WebContainer support...')
                
                if (!isWebContainerSupported()) {
                    addLog('error', '✗ WebContainer not supported')
                    return
                }
                
                addLog('success', '✓ WebContainer is supported')
                addLog('info', '🚀 Initializing WebContainer...')
                
                const container = await getWebContainer()
                setWebContainer(container)
                addLog('success', '✅ WebContainer ready!')
                
            } catch (error) {
                console.error('WebContainer error:', error)
                addLog('error', `✗ ${error.message}`)
            }
        }

        initWebContainer()
    }, [])

    // Socket initialization
    useEffect(() => {
        const socket = initializeSocket(project._id)

        receiveMessage('project-message', (data) => {
            setMessages(prevMessages => [...prevMessages, data])
            
            // Handle AI-generated file tree
            if (data.sender._id === 'ai' && data.fileTree) {
                setFileTree(data.fileTree)
                addLog('success', '✓ Received code from AI')
                
                // Auto-open the first file
                const firstFile = Object.keys(data.fileTree)[0]
                if (firstFile && !openFiles.includes(firstFile)) {
                    setOpenFiles([firstFile])
                    setCurrentFile(firstFile)
                }
                
                saveFileTree(data.fileTree)
            }
        })

        receiveMessage('ai-typing', (data) => {
            setIsAiTyping(data.isTyping)
        })

        fetchProjectDetails()

        return () => {
            if (serverReadyListenerRef.current && webContainer) {
                webContainer.off('server-ready', serverReadyListenerRef.current)
            }
        }
    }, [project._id])

    useEffect(() => {
        if (messageBox.current) {
            messageBox.current.scrollTop = messageBox.current.scrollHeight
        }
    }, [messages])

    // Resizing handlers
    const handleMouseDownSidebar = (e) => {
        e.preventDefault()
        setIsResizingSidebar(true)
    }

    const handleMouseDownTerminal = (e) => {
        e.preventDefault()
        setIsResizingTerminal(true)
    }

    const handleMouseDownChat = (e) => {
        e.preventDefault()
        setIsResizingChat(true)
    }

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isResizingSidebar) {
                const newWidth = Math.max(200, Math.min(500, e.clientX))
                setSidebarWidth(newWidth)
            }
            if (isResizingTerminal) {
                const windowHeight = window.innerHeight
                const newHeight = Math.max(20, Math.min(70, ((windowHeight - e.clientY) / windowHeight) * 100))
                setTerminalHeight(newHeight)
            }
            if (isResizingChat) {
                const newWidth = Math.max(300, Math.min(600, window.innerWidth - e.clientX))
                setChatWidth(newWidth)
            }
        }

        const handleMouseUp = () => {
            setIsResizingSidebar(false)
            setIsResizingTerminal(false)
            setIsResizingChat(false)
        }

        if (isResizingSidebar || isResizingTerminal || isResizingChat) {
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isResizingSidebar, isResizingTerminal, isResizingChat])

    return (
        <main className='h-screen w-screen flex flex-col md:flex-row bg-[#1e1e1e] text-white overflow-hidden'>
            {/* Mobile Bottom Navigation */}
            <div className='md:hidden fixed bottom-0 left-0 right-0 bg-[#2d2d30] border-t border-[#3e3e42] z-50 flex items-center justify-around py-2'>
                <button
                    onClick={() => {
                        setShowMobileSidebar(!showMobileSidebar)
                        setShowMobileChat(false)
                        setShowMobilePreview(false)
                    }}
                    className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl ${showMobileSidebar ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400'}`}>
                    <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' />
                    </svg>
                    <span className='text-xs'>Files</span>
                </button>
                
                <button
                    onClick={() => {
                        setShowMobileChat(!showMobileChat)
                        setShowMobileSidebar(false)
                        setShowMobilePreview(false)
                    }}
                    className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl ${showMobileChat ? 'bg-purple-600/20 text-purple-400' : 'text-gray-400'}`}>
                    <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' />
                    </svg>
                    <span className='text-xs'>Chat</span>
                </button>
                
                {iframeUrl && (
                    <button
                        onClick={() => {
                            setShowMobilePreview(!showMobilePreview)
                            setShowMobileSidebar(false)
                            setShowMobileChat(false)
                        }}
                        className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl ${showMobilePreview ? 'bg-green-600/20 text-green-400' : 'text-gray-400'}`}>
                        <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' />
                        </svg>
                        <span className='text-xs'>Preview</span>
                    </button>
                )}
            </div>

            {/* Left Sidebar - File Explorer */}
            <aside 
                className={`${showMobileSidebar ? 'fixed inset-0 z-40' : 'hidden'} md:flex md:static flex-col bg-[#252526] border-r border-[#3e3e42] overflow-hidden`}
                style={{ width: window.innerWidth >= 768 ? `${sidebarWidth}px` : '100%' }}>
                
                {/* Header */}
                <div className='bg-[#2d2d30] border-b border-[#3e3e42] p-4 flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                        <button 
                            onClick={() => navigate('/')}
                            className='p-2 hover:bg-[#3c3c3c] rounded-lg'>
                            <svg className='w-5 h-5 text-[#cccccc]' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M10 19l-7-7m0 0l7-7m-7 7h18' />
                            </svg>
                        </button>
                        <h1 className='text-lg font-semibold text-white truncate'>{project.name}</h1>
                    </div>
                    <button 
                        onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
                        className='p-2 hover:bg-[#3c3c3c] rounded-lg'>
                        <svg className='w-5 h-5 text-[#cccccc]' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' />
                        </svg>
                    </button>
                    <button 
                        onClick={() => setShowMobileSidebar(false)}
                        className='md:hidden p-2 hover:bg-[#3c3c3c] rounded-lg'>
                        <svg className='w-5 h-5 text-[#cccccc]' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                        </svg>
                    </button>
                </div>

                {/* File Explorer */}
                <div className='flex-1 overflow-y-auto'>
                    <div className='p-4'>
                        <div className='flex items-center justify-between mb-3'>
                            <h3 className='text-xs font-semibold text-[#cccccc] uppercase tracking-wider flex items-center gap-2'>
                                <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' />
                                </svg>
                                Explorer
                            </h3>
                        </div>
                        
                        {Object.keys(fileTree).length === 0 ? (
                            <div className='text-center py-12'>
                                <div className='inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#3c3c3c] mb-4'>
                                    <svg className='w-8 h-8 text-[#858585]' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
                                    </svg>
                                </div>
                                <p className='text-sm text-[#858585] mb-2'>No files yet</p>
                                <p className='text-xs text-[#656565]'>Use @ai to generate code</p>
                            </div>
                        ) : (
                            <div className='space-y-1'>
                                {Object.keys(fileTree).map(filename => (
                                    <div
                                        key={filename}
                                        onClick={() => handleFileClick(filename)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer ${
                                            currentFile === filename 
                                                ? 'bg-[#37373d] text-white' 
                                                : 'text-[#cccccc] hover:bg-[#2a2d2e]'
                                        }`}>
                                        <svg className='w-4 h-4 flex-shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
                                        </svg>
                                        <span className='text-sm truncate flex-1'>{filename}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Team Panel */}
                {isSidePanelOpen && (
                    <div className='border-t border-[#3e3e42] bg-[#2d2d30] overflow-y-auto max-h-64'>
                        <div className='p-4'>
                            <div className='flex items-center justify-between mb-4'>
                                <h3 className='text-xs font-semibold text-[#cccccc] uppercase tracking-wider flex items-center gap-2'>
                                    <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' />
                                    </svg>
                                    Team ({teamMembers.length})
                                </h3>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className='p-1.5 hover:bg-[#3c3c3c] rounded-lg'>
                                    <svg className='w-4 h-4 text-[#cccccc]' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
                                    </svg>
                                </button>
                            </div>
                            
                            <div className='space-y-2'>
                                {teamMembers.map(member => (
                                    <div key={member._id} className='flex items-center gap-3 p-2 rounded-lg hover:bg-[#3c3c3c]'>
                                        <div className='w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0'>
                                            {member.email?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                        <div className='flex-1 min-w-0'>
                                            <p className='text-sm text-white truncate'>{member.email || 'Unknown User'}</p>
                                            <p className='text-xs text-[#858585]'>
                                                {member._id === user._id ? 'You' : 'Member'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Resize Handle (Desktop only) */}
                <div 
                    className='hidden md:block absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500'
                    onMouseDown={handleMouseDownSidebar}
                />
            </aside>

            {/* Main Editor Section */}
            <section className={`flex-1 flex flex-col min-w-0 ${showMobileSidebar || showMobileChat || showMobilePreview ? 'hidden' : 'flex'} md:flex`}>
                {/* Top Bar */}
                <div className='bg-[#2d2d30] border-b border-[#3e3e42] flex items-center justify-between px-4 py-2'>
                    <div className='flex items-center gap-2 overflow-x-auto'>
                        {openFiles.length === 0 ? (
                            <div className='flex items-center gap-2 text-[#858585] text-sm py-2'>
                                <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4' />
                                </svg>
                                <span>No file selected</span>
                            </div>
                        ) : (
                            openFiles.map(filename => (
                                <div
                                    key={filename}
                                    onClick={() => setCurrentFile(filename)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer ${
                                        currentFile === filename 
                                            ? 'bg-[#1e1e1e] text-white' 
                                            : 'bg-[#2d2d30] text-[#cccccc] hover:bg-[#3c3c3c]'
                                    }`}>
                                    <span className='text-sm whitespace-nowrap'>{filename}</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleFileClose(filename)
                                        }}
                                        className='p-0.5 hover:bg-[#505050] rounded'>
                                        <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                                        </svg>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className='flex items-center gap-2'>
                        <button
                            onClick={handleRunProject}
                            disabled={isRunning || Object.keys(fileTree).length === 0}
                            className='flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors'>
                            {isRunning ? (
                                <>
                                    <svg className='w-4 h-4 animate-spin' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
                                    </svg>
                                    <span className='hidden sm:inline'>Running...</span>
                                </>
                            ) : (
                                <>
                                    <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z' />
                                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                                    </svg>
                                    <span className='hidden sm:inline'>Run</span>
                                </>
                            )}
                        </button>

                        {runProcess && (
                            <button
                                onClick={handleStopProject}
                                className='flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors'>
                                <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z' />
                                </svg>
                                <span className='hidden sm:inline'>Stop</span>
                            </button>
                        )}

                        <button
                            onClick={() => {
                                if (currentFile && editorRef.current) {
                                    const content = editorRef.current.value
                                    const updatedTree = {
                                        ...fileTree,
                                        [currentFile]: {
                                            file: { contents: content }
                                        }
                                    }
                                    saveFileTree(updatedTree)
                                }
                            }}
                            className='p-2 hover:bg-[#3c3c3c] rounded-lg'>
                            <svg className='w-5 h-5 text-[#cccccc]' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4' />
                            </svg>
                        </button>

                        <button
                            onClick={() => setShowLogs(!showLogs)}
                            className='p-2 hover:bg-[#3c3c3c] rounded-lg md:hidden'>
                            <svg className='w-5 h-5 text-[#cccccc]' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Editor and Terminal Container */}
                <div className='flex-1 flex flex-col min-h-0'>
                    {/* Code Editor */}
                    <div className='flex-1 overflow-hidden'>
                        {currentFile ? (
                            <textarea
                                ref={editorRef}
                                value={fileTree[currentFile]?.file?.contents || ''}
                                onChange={handleFileContentChange}
                                className='w-full h-full bg-[#1e1e1e] text-[#d4d4d4] p-4 font-mono text-sm outline-none resize-none'
                                style={{ lineHeight: '1.6' }}
                                spellCheck={false}
                            />
                        ) : (
                            <div className='h-full flex items-center justify-center text-[#858585]'>
                                <div className='text-center'>
                                    <svg className='w-16 h-16 mx-auto mb-4 opacity-50' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' />
                                    </svg>
                                    <p className='text-sm mb-2'>No file selected</p>
                                    <p className='text-xs text-[#656565]'>Select a file or use @ai to generate code</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Terminal */}
                    {showLogs && (
                        <>
                            <div 
                                className='hidden md:block h-1 bg-[#2d2d30] cursor-row-resize hover:bg-blue-500/50 active:bg-blue-500'
                                onMouseDown={handleMouseDownTerminal}
                            />
                            <div 
                                className='bg-[#1e1e1e] border-t border-[#3e3e42] flex flex-col overflow-hidden'
                                style={{ height: window.innerWidth >= 768 ? `${terminalHeight}%` : '200px' }}>
                                <div className='bg-[#2d2d30] px-4 py-2 flex items-center justify-between border-b border-[#3e3e42]'>
                                    <div className='flex items-center gap-2'>
                                        <svg className='w-4 h-4 text-[#cccccc]' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' />
                                        </svg>
                                        <span className='text-sm font-medium text-[#cccccc]'>Terminal</span>
                                    </div>
                                    <button
                                        onClick={() => setBuildLogs([])}
                                        className='text-xs text-[#cccccc] hover:text-white px-3 py-1 hover:bg-[#3c3c3c] rounded'>
                                        Clear
                                    </button>
                                </div>
                                <div className='flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1'>
                                    {buildLogs.length === 0 ? (
                                        <div className='text-[#858585] flex items-center gap-2'>
                                            <span className='text-[#656565]'>[{new Date().toLocaleTimeString()}]</span>
                                            <span>Waiting for commands...</span>
                                        </div>
                                    ) : (
                                        buildLogs.map((log, i) => (
                                            <div key={i} className='flex items-start gap-2'>
                                                <span className='text-[#656565] whitespace-nowrap'>[{log.timestamp}]</span>
                                                <span className={`flex-1 ${
                                                    log.type === 'error' ? 'text-red-400' :
                                                    log.type === 'success' ? 'text-green-400' :
                                                    log.type === 'info' ? 'text-blue-400' :
                                                    'text-[#cccccc]'
                                                }`}>{log.message}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </section>

            {/* Chat Section - Original Design */}
            <section 
                className={`${showMobileChat ? 'fixed inset-0 z-40' : 'hidden'} md:flex flex-col bg-gradient-to-br from-[#6366f1] via-[#8b5cf6] to-[#a855f7] relative`}
                style={{ width: window.innerWidth >= 768 ? `${chatWidth}px` : '100%' }}>
                
                {/* Resize Handle (Desktop only) */}
                <div 
                    className='hidden md:block absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-white/30 transition-colors z-10'
                    onMouseDown={handleMouseDownChat}
                />

                {/* Header */}
                <header className='p-4 backdrop-blur-xl bg-white/10 border-b border-white/20 flex items-center justify-between flex-shrink-0'>
                    <div className='flex items-center gap-3'>
                        <div className='w-10 h-10 rounded-full bg-white/20 flex items-center justify-center'>
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className='text-white font-bold text-lg'>Chat</h2>
                            <p className='text-white/70 text-xs'>AI-powered collaboration</p>
                        </div>
                    </div>
                    <div className='flex items-center gap-2'>
                        <div className='flex items-center gap-1'>
                            <div className='w-2 h-2 bg-emerald-400 rounded-full animate-pulse'></div>
                            <span className='text-white/80 text-xs'>Online</span>
                        </div>
                        <button
                            onClick={() => setShowMobileChat(false)}
                            className='md:hidden p-2 hover:bg-white/20 rounded-lg'>
                            <svg className='w-5 h-5 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                            </svg>
                        </button>
                    </div>
                </header>

                {/* Messages */}
                <div ref={messageBox} className='flex-1 overflow-auto p-4 space-y-4'>
                    {messages.length === 0 && (
                        <div className='flex items-center justify-center h-full'>
                            <div className='text-center'>
                                <div className='w-20 h-20 mx-auto mb-4 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center'>
                                    <svg className="w-10 h-10 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                </div>
                                <p className='text-white text-lg font-semibold mb-1'>Start a conversation</p>
                                <p className='text-white/70 text-sm'>Type @ai to get help from AI</p>
                            </div>
                        </div>
                    )}
                    {messages.map((msg, index) => (
                        <div 
                            key={index}
                            className={`flex gap-3 animate-fadeIn ${msg.sender._id === user._id ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                                msg.sender._id === 'ai' 
                                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/50' 
                                    : msg.sender._id === user._id
                                    ? 'bg-white/20 backdrop-blur-xl border-2 border-white/30'
                                    : 'bg-white/20 backdrop-blur-xl border-2 border-white/30'
                            }`}>
                                {msg.sender._id === 'ai' ? (
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                ) : (
                                    <span className='text-white'>{msg.sender.email?.charAt(0).toUpperCase()}</span>
                                )}
                            </div>
                            <div className={`flex-1 max-w-[85%] ${msg.sender._id === user._id ? 'text-right' : 'text-left'}`}>
                                <div className='text-xs text-white/80 mb-1.5 font-medium'>
                                    {msg.sender._id === 'ai' ? 'AI Assistant' : msg.sender._id === user._id ? 'You' : msg.sender.email}
                                </div>
                                <div className={`inline-block px-4 py-3 rounded-2xl max-w-full transition-all ${
                                    msg.sender._id === user._id 
                                        ? 'bg-white text-gray-800 rounded-tr-sm shadow-lg' 
                                        : msg.sender._id === 'ai'
                                        ? 'bg-white/95 text-gray-800 rounded-tl-sm shadow-xl'
                                        : 'bg-white/20 backdrop-blur-xl text-white border border-white/30 rounded-tl-sm'
                                }`}>
                                    {msg.sender._id === 'ai' ? (
                                        <div className='text-sm leading-relaxed'>
                                            {WriteAiMessage(msg.message)}
                                        </div>
                                    ) : (
                                        <p className='text-sm whitespace-pre-wrap break-words leading-relaxed'>{msg.message}</p>
                                    )}
                                </div>
                                <div className='text-xs text-white/60 mt-1 px-1'>
                                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    ))}

                    {isAiTyping && (
                        <div className='flex gap-3 animate-fadeIn'>
                            <div className='w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/50'>
                                <svg className="w-5 h-5 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <div className='flex-1'>
                                <div className='text-xs text-white/80 mb-1.5 font-medium'>AI Assistant</div>
                                <div className='inline-block px-5 py-3 rounded-2xl bg-white/95 rounded-tl-sm shadow-xl'>
                                    <div className='flex gap-1.5'>
                                        <div className='w-2 h-2 bg-gray-600 rounded-full animate-bounce'></div>
                                        <div className='w-2 h-2 bg-gray-600 rounded-full animate-bounce' style={{animationDelay: '0.15s'}}></div>
                                        <div className='w-2 h-2 bg-gray-600 rounded-full animate-bounce' style={{animationDelay: '0.3s'}}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className='p-4 backdrop-blur-xl bg-white/10 border-t border-white/20 flex-shrink-0 pb-20 md:pb-4'>
                    <div className='flex gap-3'>
                        <input 
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
                            type="text"
                            placeholder='Type @ai for AI help...'
                            className='flex-1 px-4 py-3 bg-white/20 backdrop-blur-xl border-2 border-white/30 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/70 transition-all' 
                        />
                        <button 
                            onClick={send}
                            disabled={!message.trim()}
                            className='px-5 py-3 bg-white hover:bg-white/90 disabled:bg-white/40 disabled:text-gray-400 text-gray-800 rounded-2xl transition-all font-medium shadow-lg hover:shadow-xl disabled:cursor-not-allowed flex items-center justify-center min-w-[50px]'>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </div>
                    <p className='text-xs text-white/70 mt-3 px-1 flex items-center gap-2'>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span>Tip: Use @ai to generate code and get assistance</span>
                    </p>
                </div>
            </section>

            {/* Mobile Preview */}
            {iframeUrl && showMobilePreview && (
                <div className='md:hidden fixed inset-0 z-40 bg-[#252526] flex flex-col'>
                    <div className='bg-[#2d2d30] border-b border-[#3e3e42] p-3 flex items-center gap-2'>
                        <button
                            onClick={() => setShowMobilePreview(false)}
                            className='p-2 hover:bg-[#3c3c3c] rounded-lg'>
                            <svg className='w-5 h-5 text-[#cccccc]' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                            </svg>
                        </button>
                        <div className='flex gap-1.5'>
                            <div className='w-2.5 h-2.5 rounded-full bg-[#ff5f56]'></div>
                            <div className='w-2.5 h-2.5 rounded-full bg-[#ffbd2e]'></div>
                            <div className='w-2.5 h-2.5 rounded-full bg-[#27c93f]'></div>
                        </div>
                        <input 
                            type='text'
                            value={iframeUrl}
                            className='flex-1 px-3 py-1.5 bg-[#3c3c3c] border border-[#505050] rounded-lg text-xs text-[#cccccc] font-mono' 
                            readOnly
                        />
                        <button 
                            onClick={() => window.open(iframeUrl, '_blank')}
                            className='p-2 hover:bg-[#3c3c3c] rounded-lg'>
                            <svg className='w-4 h-4 text-[#cccccc]' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14' />
                            </svg>
                        </button>
                    </div>
                    <iframe src={iframeUrl} className='flex-grow w-full bg-white' title='Preview' />
                </div>
            )}

            {/* Desktop Preview Section */}
            {iframeUrl && (
                <section className='hidden md:flex flex-col flex-1 bg-[#252526] border-l border-[#3e3e42]'>
                    <div className='bg-[#2d2d30] border-b border-[#3e3e42] p-3 flex items-center gap-2'>
                        <div className='flex gap-1.5'>
                            <div className='w-2.5 h-2.5 rounded-full bg-[#ff5f56]'></div>
                            <div className='w-2.5 h-2.5 rounded-full bg-[#ffbd2e]'></div>
                            <div className='w-2.5 h-2.5 rounded-full bg-[#27c93f]'></div>
                        </div>
                        <input 
                            type='text'
                            value={iframeUrl}
                            className='flex-1 px-3 py-1.5 bg-[#3c3c3c] border border-[#505050] rounded-lg text-xs text-[#cccccc] font-mono' 
                            readOnly
                        />
                        <button 
                            onClick={() => window.open(iframeUrl, '_blank')}
                            className='p-2 hover:bg-[#3c3c3c] rounded-lg'>
                            <svg className='w-4 h-4 text-[#cccccc]' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14' />
                            </svg>
                        </button>
                    </div>
                    <iframe src={iframeUrl} className='flex-grow w-full bg-white' title='Preview' />
                </section>
            )}

{/* Modal - UPDATED with email search */}
{isModalOpen && (
    <div className='fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50'>
        <div className='bg-[#2d2d30] rounded-3xl w-full max-w-md shadow-2xl border border-[#3e3e42] max-h-[90vh] overflow-hidden flex flex-col'>
            <header className='flex justify-between items-center p-6 border-b border-[#3e3e42]'>
                <h2 className='text-2xl font-bold text-white'>Add Collaborators</h2>
                <button 
                    onClick={() => {
                        setIsModalOpen(false)
                        setSearchEmail('')
                        setSearchResults([])
                        setSelectedUserId(new Set())
                        setSearchError('')
                    }} 
                    className='p-2.5 hover:bg-[#3c3c3c] rounded-xl'>
                    <svg className='w-6 h-6 text-[#cccccc]' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                    </svg>
                </button>
            </header>

            {/* Search Input */}
            <div className='p-6 border-b border-[#3e3e42]'>
                <label className='block text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2'>
                    Search by Email
                </label>
                <div className='relative'>
                    <input
                        type='email'
                        value={searchEmail}
                        onChange={(e) => {
                            setSearchEmail(e.target.value)
                            setSearchError('')
                        }}
                        placeholder='Enter email address...'
                        className='w-full px-4 py-3 pl-10 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-600/50 transition-all'
                    />
                    <svg className='w-5 h-5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
                    </svg>
                    {isSearching && (
                        <svg className='animate-spin w-5 h-5 text-purple-600 absolute right-3 top-1/2 -translate-y-1/2' fill='none' viewBox='0 0 24 24'>
                            <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                            <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                        </svg>
                    )}
                </div>
                <p className='text-xs text-zinc-500 mt-2'>
                    Type at least 2 characters to search
                </p>
            </div>

            {/* Search Results */}
            <div className='p-6 overflow-auto space-y-2 flex-grow'>
                {searchError && (
                    <div className='flex items-center gap-2 p-3 bg-zinc-800/50 rounded-xl text-zinc-400 text-sm'>
                        <svg className='w-5 h-5 flex-shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                        </svg>
                        {searchError}
                    </div>
                )}

                {!searchEmail && !searchError && (
                    <div className='text-center py-12'>
                        <svg className='w-16 h-16 mx-auto mb-4 text-zinc-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
                        </svg>
                        <p className='text-zinc-500 text-sm'>Search for users by email</p>
                    </div>
                )}

                {searchResults.length > 0 && searchResults.map(modalUser => (
                    <div 
                        key={modalUser._id} 
                        className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer ${
                            Array.from(selectedUserId).includes(modalUser._id) 
                                ? 'bg-purple-600/30 border-2 border-purple-500' 
                                : 'hover:bg-[#3c3c3c]'
                        }`} 
                        onClick={() => handleUserClick(modalUser._id)}>
                        <div className='w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg'>
                            {modalUser.email?.charAt(0).toUpperCase()}
                        </div>
                        <span className='text-white truncate'>{modalUser.email}</span>
                    </div>
                ))}
            </div>

            <div className='p-6 border-t border-[#3e3e42]'>
                <button
                    onClick={addCollaborators}
                    disabled={selectedUserId.size === 0 || isAddingCollaborators}
                    className='w-full px-4 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-bold hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed'>
                    {isAddingCollaborators ? 'Adding...' : `Add ${selectedUserId.size > 0 ? selectedUserId.size : ''} Collaborator${selectedUserId.size !== 1 ? 's' : ''}`}
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
                
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
            `}} />
        </main>
    )
}

export default Project
