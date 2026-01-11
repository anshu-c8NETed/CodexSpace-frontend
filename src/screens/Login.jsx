import React, { useState, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from '../config/axios'
import { UserContext } from '../context/user.context'

const Login = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const { setUser } = useContext(UserContext)
    const navigate = useNavigate()

    function submitHandler(e) {
        e.preventDefault()
        axios.post('/users/login', {
            email,
            password
        }).then((res) => {
            console.log(res.data)
            localStorage.setItem('token', res.data.token)
            setUser(res.data.user)
            navigate('/')
        }).catch((err) => {
            console.log(err.response.data)
        })
    }

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-white">
            {/* Left Side - Visual Section with Gradient */}
            <div className="lg:w-1/2 relative bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center p-8 lg:p-16 min-h-[40vh] lg:min-h-screen overflow-hidden">
                {/* Diagonal Stripes Pattern */}
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute inset-0" style={{
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 60px, rgba(0,0,0,0.4) 60px, rgba(0,0,0,0.4) 120px)',
                    }}></div>
                </div>

                {/* Content */}
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

                    {/* Google Sign In Button */}
                    <button className="w-full flex items-center justify-center gap-3 p-4 bg-black cursor-pointer text-white rounded-lg font-medium hover:bg-gray-900 transition-colors duration-200 mb-6">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Continue with Google
                    </button>

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
                                E-mail
                            </label>
                            <input
                                onChange={(e) => setEmail(e.target.value)}
                                type="email"
                                id="email"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
                                placeholder="E-mail"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="password">
                                Password
                            </label>
                            <input
                                onChange={(e) => setPassword(e.target.value)}
                                type="password"
                                id="password"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
                                placeholder="Password"
                            />
                            <div className="text-right mt-2">
                                <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                                    Forgot Password?
                                </a>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-4 cursor-pointer bg-black text-white rounded-lg font-semibold hover:bg-gray-900 transition-colors duration-200 mt-6"
                        >
                            Sign In
                        </button>
                    </form>

                    <p className="text-center text-gray-600 text-sm mt-8">
                        Don't Have an account? <Link to="/register" className="text-black font-semibold hover:underline">Take me</Link>
                    </p>
                </div>
            </div>

            <style jsx>{`
                @keyframes subtle-pulse {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </div>
    )
}

export default Login