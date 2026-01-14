import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserContext } from '../context/user.context'
import axios from '../config/axios'

const UserAuth = ({ children }) => {
    const { user, setUser } = useContext(UserContext)
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token')

            // If no token, redirect to login immediately
            if (!token) {
                setUser(null) // Clear user from context
                navigate('/login')
                setLoading(false)
                return
            }

            // If user already exists in context, we're good
            if (user) {
                setLoading(false)
                return
            }

            // Fetch user profile if we have token but no user in context
            try {
                const response = await axios.get('/users/profile')
                setUser(response.data.user)
                setLoading(false)
            } catch (error) {
                console.error('Failed to fetch user profile:', error)
                // If profile fetch fails, token is invalid - clear everything and redirect
                localStorage.removeItem('token')
                setUser(null)
                navigate('/login')
                setLoading(false)
            }
        }

        checkAuth()
    }, [navigate, setUser]) // Removed 'user' from dependencies to prevent infinite loop

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-600">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
                    <p className="mt-4 text-white font-medium">Loading...</p>
                </div>
            </div>
        )
    }

    return <>{children}</>
}

export default UserAuth
