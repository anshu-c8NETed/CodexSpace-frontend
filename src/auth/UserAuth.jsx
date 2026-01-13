import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const UserAuth = ({ children }) => {
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        console.log('UserAuth mounted')
        
        const token = localStorage.getItem('token')
        
        if (!token) {
            console.log('No token - redirecting')
            navigate('/login', { replace: true })
        } else {
            console.log('Token found - showing content')
            setTimeout(() => {
                setLoading(false)
            }, 100)
        }
    }, [navigate])

    if (loading) {
        return (
            <div style={{ 
                minHeight: '100vh', 
                background: '#09090b', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'white'
            }}>
                <p>Loading...</p>
            </div>
        )
    }

    console.log('UserAuth rendering children')
    return <>{children}</>
}

export default UserAuth
