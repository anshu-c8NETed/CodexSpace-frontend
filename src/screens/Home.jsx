import React, { useContext, useState, useEffect } from 'react'
import { UserContext } from '../context/user.context'
import axios from "../config/axios"
import { useNavigate } from 'react-router-dom'

const Home = () => {
    const { user } = useContext(UserContext)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [projectName, setProjectName] = useState('')
    const [project, setProject] = useState([])
    const [scrollY, setScrollY] = useState(0)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY)
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    function createProject(e) {
        e.preventDefault()
        axios.post('/projects/create', {
            name: projectName,
        })
            .then((res) => {
                setIsModalOpen(false)
                setProjectName('')
                fetchProjects()
            })
            .catch((error) => {
                console.log(error)
            })
    }

    const fetchProjects = () => {
        axios.get('/projects/all').then((res) => {
            setProject(res.data.projects)
        }).catch(err => {
            console.log(err)
        })
    }

    const handleLogout = () => {
        navigate('/login')
    }

    useEffect(() => {
        fetchProjects()
    }, [])

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: `linear-gradient(rgba(161, 98, 7, 0.1) 1px, transparent 1px),
                                    linear-gradient(90deg, rgba(161, 98, 7, 0.1) 1px, transparent 1px)`,
                    backgroundSize: '80px 80px',
                    transform: `translateY(${scrollY * 0.3}px)`
                }}></div>
            </div>

            {/* Gradient Orbs */}
            <div className="absolute top-0 right-1/3 w-[400px] h-[400px] md:w-[600px] md:h-[600px] bg-amber-900/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-1/3 w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-zinc-800/20 rounded-full blur-3xl"></div>

            {/* Navigation */}
            <nav className="relative z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-2xl sticky top-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 md:py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="relative group">
                                <div className="absolute inset-0 bg-gradient-to-br from-amber-600/20 to-amber-800/20 rounded-xl blur opacity-50 group-hover:opacity-75 transition-opacity"></div>
                                <div className="relative w-9 h-9 md:w-11 md:h-11 bg-gradient-to-br from-amber-600 to-amber-700 rounded-xl flex items-center justify-center shadow-lg shadow-amber-900/20">
                                    <svg className="w-5 h-5 md:w-6 md:h-6 text-zinc-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                    </svg>
                                </div>
                            </div>
                            <span className="text-lg md:text-xl font-semibold tracking-tight text-zinc-100">CodexSpace</span>
                        </div>
                        
                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-8">
                            <a href="#projects" className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors relative group">
                                Projects
                                <span className="absolute -bottom-1 left-0 w-0 h-px bg-amber-600 group-hover:w-full transition-all duration-300"></span>
                            </a>
                            <a href="#features" className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors relative group">
                                Features
                                <span className="absolute -bottom-1 left-0 w-0 h-px bg-amber-600 group-hover:w-full transition-all duration-300"></span>
                            </a>
                            <a href="#technology" className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors relative group">
                                Technology
                                <span className="absolute -bottom-1 left-0 w-0 h-px bg-amber-600 group-hover:w-full transition-all duration-300"></span>
                            </a>
                        </div>

                        <div className="flex items-center gap-2 md:gap-3">
                            {/* User Badge - Hidden on small screens */}
                            <div className="hidden lg:flex items-center gap-3 px-3 md:px-4 py-2 bg-zinc-900/50 rounded-xl border border-zinc-800/50 backdrop-blur">
                                <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br from-amber-600 to-amber-700 rounded-lg flex items-center justify-center text-xs font-bold text-zinc-950">
                                    {user?.email?.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-xs md:text-sm font-medium text-zinc-300 max-w-[120px] truncate">{user?.email}</span>
                            </div>
                            
                            {/* Logout Button */}
                            <button 
                                onClick={handleLogout}
                                className="px-3 md:px-4 py-2 bg-zinc-900/50 hover:bg-zinc-800/50 backdrop-blur rounded-xl font-medium transition-all duration-300 text-xs md:text-sm border border-zinc-800/50 text-zinc-300">
                                Logout
                            </button>

                            {/* Mobile Menu Button */}
                            <button 
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="md:hidden p-2 hover:bg-zinc-800/50 rounded-lg transition-all">
                                <svg className="w-6 h-6 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {mobileMenuOpen ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    )}
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Mobile Menu */}
                    {mobileMenuOpen && (
                        <div className="md:hidden mt-4 pb-4 space-y-2 border-t border-zinc-800/50 pt-4">
                            <a href="#projects" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 rounded-lg transition-colors">
                                Projects
                            </a>
                            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 rounded-lg transition-colors">
                                Features
                            </a>
                            <a href="#technology" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 rounded-lg transition-colors">
                                Technology
                            </a>
                            {/* User info in mobile menu */}
                            <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
                                <div className="w-8 h-8 bg-gradient-to-br from-amber-600 to-amber-700 rounded-lg flex items-center justify-center text-xs font-bold text-zinc-950">
                                    {user?.email?.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm font-medium text-zinc-300 truncate">{user?.email}</span>
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative z-10 pt-12 pb-10 md:pt-24 md:pb-20 lg:pt-32 lg:pb-28">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="text-center space-y-6 md:space-y-8 mb-12 md:mb-20">
                        <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-zinc-900/50 rounded-full border border-zinc-800/50 backdrop-blur">
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                            </div>
                            <span className="text-xs md:text-sm font-medium text-zinc-400">Powered by Advanced AI</span>
                        </div>
                        
                        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-bold leading-[1.1] tracking-tight px-4">
                            <span className="text-zinc-100">Collaborative</span><br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 animate-gradient">
                                Development Platform
                            </span>
                        </h1>
                        
                        <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-zinc-400 max-w-3xl mx-auto leading-relaxed font-light px-4">
                            Chat, collaborate, and turn ideas into reality – together, with AI by your side.
                        </p>
                        
                        <div className="pt-2 md:pt-4">
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="tracking-wide cursor-pointer group relative inline-flex items-center gap-2 md:gap-3 px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-amber-600 to-amber-700 text-zinc-950 rounded-full font-semibold text-sm md:text-base hover:shadow-2xl hover:shadow-amber-900/30 transition-all duration-300 hover:-translate-y-0.5 ">
                                <span>Launch Platform</span>
                                <svg className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24 ">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Code Editor Preview - Hidden on mobile for better UX */}
                    <div className="hidden sm:block relative mt-12 md:mt-16 group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-amber-600/20 via-zinc-800/20 to-amber-600/20 rounded-2xl blur-2xl group-hover:blur-xl transition-all duration-500"></div>
                        <div className="relative rounded-2xl overflow-hidden border border-zinc-800/50 shadow-2xl bg-zinc-900/50 backdrop-blur">
                            {/* Browser Bar */}
                            <div className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 bg-zinc-900/80 border-b border-zinc-800/50">
                                <div className="flex gap-1 md:gap-1.5">
                                    <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-zinc-700"></div>
                                    <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-zinc-700"></div>
                                    <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-zinc-700"></div>
                                </div>
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="px-3 md:px-4 py-1 md:py-1.5 bg-zinc-800/50 rounded-lg text-xs text-zinc-500 font-mono">
                                        workspace.codexspace.dev
                                    </div>
                                </div>
                            </div>
                            
                            {/* Simplified Code View for smaller screens */}
                            <div className="p-4 md:p-6 bg-zinc-950/50 font-mono text-xs md:text-sm">
                                <div className="space-y-2 md:space-y-3">
                                    <div className="flex gap-2 md:gap-3">
                                        <span className="text-zinc-600">1</span>
                                        <span className="text-amber-500">import</span>
                                        <span className="text-zinc-300">React</span>
                                        <span className="text-amber-500">from</span>
                                        <span className="text-emerald-400">'react'</span>
                                    </div>
                                    <div className="flex gap-2 md:gap-3">
                                        <span className="text-zinc-600">2</span>
                                        <span className="text-amber-500">import</span>
                                        <span className="text-zinc-300">{'{ useAI }'}</span>
                                        <span className="text-amber-500">from</span>
                                        <span className="text-emerald-400">'@codexspace/ai'</span>
                                    </div>
                                    <div className="flex gap-2 md:gap-3">
                                        <span className="text-zinc-600">3</span>
                                    </div>
                                    <div className="flex gap-2 md:gap-3">
                                        <span className="text-zinc-600">4</span>
                                        <span className="text-purple-400">const</span>
                                        <span className="text-blue-400">App</span>
                                        <span className="text-zinc-300">= () =&gt; {'{'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Technology Section */}
            <section id="technology" className="relative z-10 py-12 md:py-24 border-y border-zinc-800/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="mb-8 md:mb-12">
                        <h3 className="text-xs md:text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3 md:mb-4">
                            Active Model
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                            <div className="group p-4 md:p-6 bg-zinc-900/40 backdrop-blur rounded-xl border border-amber-600/30">
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-600/10 rounded-xl flex items-center justify-center mb-3 md:mb-4">
                                    <svg className="w-5 h-5 md:w-6 md:h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-sm md:text-base font-semibold text-zinc-100">Gemini 2.5 Flash</h3>
                                <p className="text-xs text-amber-500 mt-1">Active</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xs md:text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3 md:mb-4">
                            Coming Soon
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                            {['GPT-4', 'Claude AI', 'GitHub Copilot', 'WebAssembly'].map((tech, i) => (
                                <div key={i} className="p-4 md:p-6 bg-zinc-900/20 backdrop-blur rounded-xl border border-zinc-800/50 opacity-60">
                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-zinc-800/40 rounded-xl flex items-center justify-center mb-3 md:mb-4">
                                        <svg className="w-5 h-5 md:w-6 md:h-6 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-sm md:text-base font-semibold text-zinc-400">{tech}</h3>
                                    <p className="text-xs text-zinc-500 mt-1">Coming Soon</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="relative z-10 py-12 md:py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="text-center mb-10 md:mb-16">
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4 text-zinc-100">Collaborative Features</h2>
                        <p className="text-base md:text-lg text-zinc-400 max-w-2xl mx-auto px-4">
                            Everything your team needs to build at scale
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {[
                            {
                                icon: "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z",
                                title: "AI-Powered Development",
                                desc: "Intelligent code completion, bug detection, and optimization suggestions"
                            },
                            {
                                icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
                                title: "Real-Time Collaboration",
                                desc: "Work together seamlessly with live editing and cursors"
                            },
                            {
                                icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
                                title: "Enterprise Security",
                                desc: "SOC 2 certified with end-to-end encryption and SSO"
                            }
                        ].map((feature, i) => (
                            <div key={i} className="group relative p-6 md:p-8 bg-zinc-900/30 backdrop-blur rounded-2xl border border-zinc-800/50 hover:border-amber-600/30 transition-all duration-500 hover:bg-zinc-900/50">
                                <div className="mb-4 md:mb-6">
                                    <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-amber-600/20 to-amber-700/20 rounded-xl flex items-center justify-center group-hover:from-amber-600/30 group-hover:to-amber-700/30 transition-all">
                                        <svg className="w-6 h-6 md:w-7 md:h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={feature.icon} />
                                        </svg>
                                    </div>
                                </div>
                                <h3 className="text-lg md:text-xl font-semibold mb-2 md:mb-3 text-zinc-100">{feature.title}</h3>
                                <p className="text-zinc-400 leading-relaxed text-sm">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Projects Section */}
            <section id="projects" className="relative z-10 py-12 md:py-24 border-t border-zinc-800/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 md:mb-12 gap-4">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold mb-2 text-zinc-100">Active Workspaces</h2>
                            <p className="text-base md:text-lg text-zinc-400">Your projects and collaborations</p>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="cursor-pointer w-full sm:w-auto flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 bg-zinc-900/50 hover:bg-zinc-800/50 backdrop-blur rounded-xl font-medium transition-all duration-300 border border-zinc-800/50 text-zinc-300">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            New Workspace
                        </button>
                    </div>

                    {project.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                            {project.map((proj) => (
                                <div
                                    key={proj._id}
                                    onClick={() => navigate(`/project`, { state: { project: proj } })}
                                    className="group cursor-pointer relative p-5 md:p-6 bg-zinc-900/30 backdrop-blur rounded-2xl border border-zinc-800/50 hover:border-amber-600/30 transition-all duration-500 hover:bg-zinc-900/50">
                                    
                                    <div className="flex items-start justify-between mb-4 md:mb-6">
                                        <div className="w-12 h-12 md:w-14 md:h-14 bg-zinc-800/50 rounded-xl flex items-center justify-center border border-zinc-700/50 group-hover:border-amber-600/30 transition-all">
                                            <svg className="w-6 h-6 md:w-7 md:h-7 text-zinc-500 group-hover:text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                            </svg>
                                        </div>
                                        <div className="flex items-center gap-2 px-2 md:px-2.5 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                                            <span className="text-xs font-medium text-emerald-300">Active</span>
                                        </div>
                                    </div>
                                    
                                    <h3 className="text-lg md:text-xl font-semibold mb-2 md:mb-3 group-hover:text-amber-500 transition-colors line-clamp-2 text-zinc-100">
                                        {proj.name}
                                    </h3>
                                    
                                    <div className="flex items-center gap-2 text-sm text-zinc-500 mb-3 md:mb-4">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                        <span className="font-medium text-zinc-400">{proj.users.length} {proj.users.length === 1 ? 'member' : 'members'}</span>
                                    </div>

                                    <div className="flex items-center gap-2 text-amber-600 font-medium text-sm group-hover:gap-3 transition-all">
                                        <span>Open Workspace</span>
                                        <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                        </svg>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="relative p-8 md:p-16 bg-zinc-900/30 backdrop-blur rounded-2xl border-2 border-dashed border-zinc-800/50 text-center">
                            <div className="max-w-md mx-auto space-y-4 md:space-y-6">
                                <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-amber-600/20 to-amber-700/20 rounded-2xl flex items-center justify-center mx-auto">
                                    <svg className="w-8 h-8 md:w-10 md:h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-xl md:text-2xl font-bold mb-2 text-zinc-100">No Workspaces Yet</h3>
                                    <p className="text-zinc-400 text-sm md:text-base">Create your first workspace to start building</p>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="inline-flex items-center gap-2 px-5 md:px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-700 text-zinc-950 rounded-xl font-semibold hover:shadow-xl hover:shadow-amber-900/30 transition-all duration-300">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Create Workspace
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* Stats Section */}
            <section className="relative z-10 py-12 md:py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                        {[
                            { value: '99.9%', label: 'Uptime SLA' },
                            { value: '< 50ms', label: 'Response Time' },
                            { value: '256-bit', label: 'Encryption' },
                            { value: '24/7', label: 'Support' }
                        ].map((stat, i) => (
                            <div key={i} className="text-center p-4 md:p-6 bg-zinc-900/30 backdrop-blur rounded-xl border border-zinc-800/50">
                                <div className="text-2xl md:text-3xl font-bold text-amber-600 mb-2">{stat.value}</div>
                                <div className="text-xs md:text-sm text-zinc-400">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="relative z-10 py-12 md:py-24 border-t border-zinc-800/50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6 text-zinc-100">
                        Ready to transform<br className="hidden sm:block"/>your development workflow?
                    </h2>
                    <p className="text-base md:text-xl text-zinc-400 mb-8 md:mb-10 px-4">
                        Join forward-thinking teams building the future
                    </p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center gap-2 md:gap-3 px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-amber-600 to-amber-700 text-zinc-950 rounded-xl font-semibold text-sm md:text-base hover:shadow-2xl hover:shadow-amber-900/30 transition-all duration-300 hover:-translate-y-0.5">
                        Get Started Today
                        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 border-t border-zinc-800/50 py-8 md:py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="w-8 h-8 md:w-9 md:h-9 bg-gradient-to-br from-amber-600 to-amber-700 rounded-lg flex items-center justify-center">
                                <svg className="w-4 h-4 md:w-5 md:h-5 text-zinc-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                </svg>
                            </div>
                            <span className="text-sm md:text-base font-semibold text-zinc-300">CodexSpace</span>
                        </div>
                        <p className="text-zinc-500 text-xs md:text-sm text-center">© 2026 CodexSpace. Collaborative development platform.</p>
                    </div>
                </div>
            </footer>

            {/* Create Project Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-zinc-950/90 backdrop-blur-xl"
                        onClick={() => setIsModalOpen(false)}
                    ></div>

                    <div className="relative w-full max-w-lg bg-zinc-900 rounded-2xl border border-zinc-800/50 shadow-2xl">
                        <div className="p-6 md:p-8 space-y-4 md:space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 md:gap-3">
                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-amber-600 to-amber-700 rounded-xl flex items-center justify-center">
                                        <svg className="w-5 h-5 md:w-6 md:h-6 text-zinc-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl md:text-2xl font-bold text-zinc-100">New Workspace</h3>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-9 h-9 md:w-10 md:h-10 rounded-xl hover:bg-zinc-800/50 flex items-center justify-center transition-colors">
                                    <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div>
                                <label className="block text-xs md:text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2 md:mb-3">
                                    Workspace Name
                                </label>
                                <input
                                    type="text"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    placeholder="My Awesome Project"
                                    className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-600/50 focus:bg-zinc-800 transition-all text-sm md:text-base"
                                    autoFocus
                                />
                            </div>

                            <div className="flex gap-2 md:gap-3 pt-2 md:pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 md:px-6 py-2.5 md:py-3 rounded-xl border border-zinc-700/50 text-zinc-300 font-semibold hover:bg-zinc-800/50 transition-all text-sm md:text-base">
                                    Cancel
                                </button>
                                <button
                                    onClick={createProject}
                                    className="flex-1 px-4 md:px-6 py-2.5 md:py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 text-zinc-950 font-semibold hover:shadow-xl hover:shadow-amber-900/30 transition-all text-sm md:text-base">
                                    Create
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes gradient {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                .animate-gradient {
                    background-size: 200% auto;
                    animation: gradient 3s ease infinite;
                }
            `}</style>
        </div>
    )
}

export default Home

