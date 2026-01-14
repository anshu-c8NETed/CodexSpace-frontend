import { io } from 'socket.io-client';

let socketInstance = null;
let currentProjectId = null;

/**
 * Initialize socket with optional projectId
 * FIXED: Properly handles both global (null projectId) and project-specific connections
 */
export const initializeSocket = (projectId = null) => {
    // If socket exists and connected for same context, reuse it
    if (socketInstance && currentProjectId === projectId && socketInstance.connected) {
        console.log('♻️ Reusing existing socket connection');
        return socketInstance;
    }

    // Disconnect old socket if project changed
    if (socketInstance && currentProjectId !== projectId) {
        console.log('🔄 Project changed, disconnecting old socket');
        socketInstance.disconnect();
        socketInstance = null;
    }

    currentProjectId = projectId;

    // Create socket configuration
    const socketConfig = {
        auth: {
            token: localStorage.getItem('token')
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 10000,
        transports: ['websocket', 'polling']
    };

    // FIXED: Add projectId to query only if it exists, otherwise connect globally
    if (projectId) {
        socketConfig.query = { projectId };
        console.log('🔌 Connecting to project room:', projectId);
    } else {
        console.log('🔌 Connecting globally for notifications');
    }

    socketInstance = io(import.meta.env.VITE_API_URL, socketConfig);

    socketInstance.on('connect', () => {
        console.log('✅ Socket connected:', socketInstance.id);
        if (projectId) {
            console.log('📍 Connected to project:', projectId);
        } else {
            console.log('📍 Connected globally (listening for invitations)');
        }
    });

    socketInstance.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error.message);
    });

    socketInstance.on('disconnect', (reason) => {
        console.log('⚠️ Socket disconnected:', reason);
    });

    return socketInstance;
}

export const receiveMessage = (eventName, cb) => {
    if (!socketInstance) {
        console.error('Socket not initialized');
        return;
    }
    socketInstance.on(eventName, cb);
}

export const sendMessage = (eventName, data) => {
    if (!socketInstance) {
        console.error('Socket not initialized');
        return;
    }
    socketInstance.emit(eventName, data);
}

export const disconnectSocket = () => {
    if (socketInstance) {
        console.log('🔌 Disconnecting socket');
        socketInstance.disconnect();
        socketInstance = null;
        currentProjectId = null;
    }
}

export const getSocket = () => {
    return socketInstance;
}
