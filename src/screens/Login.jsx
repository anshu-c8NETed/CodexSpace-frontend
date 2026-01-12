import React, { useState, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from '../config/axios'
import { UserContext } from '../context/user.context'

const Login = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [flashMessage, setFlashMessage] = useState({ type: '', message: '' })
    const { setUser } = useContext(UserContext)
    const navigate = useNavigate()

    // Flash message display function
    const showFlash = (type, message) => {
        setFlashMessage({ type, message })
        setTimeout(() => {
            setFlashMessage({ type: '', message: '' })
        }, 5000)
    }

    // Email validation
    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(email)
    }

    function submitHandler(e) {
        e.preventDefault()
        
        // Clear previous flash messages
        setFlashMessage({ type: '', message: '' })

        // Validation
        if (!email.trim()) {
            showFlash('error', 'Please enter your email address')
            return
        }

        if (!isValidEmail(email)) {
            showFlash('error', 'Please enter a valid email address')
            return
        }

        if (!password) {
            showFlash('error', 'Please enter your password')
            return
        }

        if (password.length < 3) {
            showFlash('error', 'Password must be at least 3 characters long')
            return
        }

        setIsLoading(true)

        axios.post('/users/login', {
            email: email.trim().toLowerCase(),
            password
        })
        .then((res) => {
            localStorage.setItem('token', res.data.token)
            setUser(res.data.user)
            showFlash('success', 'Login successful! Redirecting...')
            setTimeout(() => {
                navigate('/')
            }, 1000)
        })
        .catch((err) => {
            setIsLoading(false)
            const errorMessage = err.response?.data?.errors || err.response?.data?.message || 'Login failed. Please try again.'
            
            // Handle specific error cases
            if (err.response?.status === 401) {
                showFlash('error', 'Invalid email or password. Please try again.')
            } else if (err.response?.status === 404) {
                showFlash('error', 'Account not found. Please sign up first.')
            } else {
                showFlash('error', errorMessage)
            }
        })
    }

    // Google OAuth Login
    const handleGoogleLogin = () => {
        showFlash('info', 'Google Sign-In coming soon!')
        // TODO: Implement Google OAuth
        // window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`
    }

    // GitHub OAuth Login
    const handleGithubLogin = () => {
        showFlash('info', 'GitHub Sign-In coming soon!')
        // TODO: Implement GitHub OAuth
        // window.location.href = `${import.meta.env.VITE_API_URL}/auth/github`
    }

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-white">
            {/* Flash Message Toast */}
            {flashMessage.message && (
                <div className={`fixed top-4 right-4 z-50 max-w-md w-full mx-4 sm:mx-0 animate-slideIn shadow-2xl ${
                    flashMessage.type === 'error' ? 'bg-red-500' :
                    flashMessage.type === 'success' ? 'bg-green-500' :
                    'bg-blue-500'
                }`} style={{
                    borderRadius: '12px',
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    <div className="p-4 flex items-start gap-3">
                        <div className="flex-shrink-0">
                            {flashMessage.type === 'error' && (
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                            {flashMessage.type === 'success' && (
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                            {flashMessage.type === 'info' && (
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                        </div>
                        <div className="flex-1">
                            <p className="text-white font-medium text-sm">{flashMessage.message}</p>
                        </div>
                        <button 
                            onClick={() => setFlashMessage({ type: '', message: '' })}
                            className="flex-shrink-0 text-white hover:text-gray-200 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Left Side - Visual Section with Gradient */}
            <div className="lg:w-1/2 relative bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center p-8 lg:p-16 min-h-[40vh] lg:min-h-screen overflow-hidden">
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute inset-0" style={{
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 60px, rgba(0,0,0,0.4) 60px, rgba(0,0,0,0.4) 120px)',
                    }}></div>
                </div>

                <div className="relative z-10 text-center lg:text-left max-w-md">
                    <div className="mb-8">
                        <div className="inline-flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
                                <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                </svg>
                            </div>
                            <span className="text-white text-2xl font-bold tracking-tight">CodexSpace</span>
                        </div>
                    </div>
                    
                    <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-4 leading-tight">
                        Welcome back
                    </h1>
                    
                    <p className="text-white text-opacity-90 text-base lg:text-lg leading-relaxed">
                        Time waits for no one. Neither should your ideas. Log in to access your collaborative workspace.
                    </p>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="lg:w-1/2 flex items-center justify-center p-8 lg:p-16 bg-white">
                <div className="w-full max-w-md">
                    <div className="mb-8">
                        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                            Sign In to Your Account
                        </h2>
                        <p className="text-gray-500 text-sm">
                            Enter your email & password to continue
                        </p>
                    </div>

                    {/* Social Sign In Buttons */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <button 
                            onClick={handleGoogleLogin}
                            type="button"
                            className="flex items-center justify-center gap-2 p-3 border-2 border-gray-200 rounded-lg font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 cursor-pointer">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            <span className="hidden sm:inline">Google</span>
                        </button>
                        <button 
                            onClick={handleGithubLogin}
                            type="button"
                            className="flex items-center justify-center gap-2 p-3 border-2 border-gray-200 rounded-lg font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 cursor-pointer">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                            </svg>
                            <span className="hidden sm:inline">GitHub</span>
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white text-gray-500">or</span>
                        </div>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={submitHandler} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="email">
                                Email Address
                            </label>
                            <input
                                onChange={(e) => setEmail(e.target.value)}
                                value={email}
                                type="email"
                                id="email"
                                disabled={isLoading}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="password">
                                Password
                            </label>
                            <input
                                onChange={(e) => setPassword(e.target.value)}
                                value={password}
                                type="password"
                                id="password"
                                disabled={isLoading}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                placeholder="Enter your password"
                            />
                            <div className="text-right mt-2">
                                <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                                    Forgot Password?
                                </a>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 cursor-pointer bg-black text-white rounded-lg font-semibold hover:bg-gray-900 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Signing In...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <p className="text-center text-gray-600 text-sm mt-8">
                        Don't have an account? <Link to="/register" className="text-black font-semibold hover:underline">Register Now</Link>
                    </p>
                </div>
            </div>

            <style jsx>{`
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    )
}

export default Login
