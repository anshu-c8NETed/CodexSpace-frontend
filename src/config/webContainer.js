// frontend/src/config/webContainer.js
import { WebContainer } from '@webcontainer/api';

// IMPORTANT: Only ONE instance should exist per browser tab
let webcontainerInstance = null;
let bootPromise = null;

/**
 * Check if WebContainer is supported in current environment
 * @returns {boolean} True if supported, false otherwise
 */
export function isWebContainerSupported() {
    // Check for SharedArrayBuffer support (CRITICAL for WebContainer)
    if (typeof SharedArrayBuffer === 'undefined') {
        console.error('❌ WebContainer Error: SharedArrayBuffer is not available');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('This usually means the required security headers are missing.');
        console.error('');
        console.error('📋 Required headers in vite.config.js:');
        console.error('   Cross-Origin-Embedder-Policy: require-corp');
        console.error('   Cross-Origin-Opener-Policy: same-origin');
        console.error('');
        console.error('💡 Solution:');
        console.error('   1. Update vite.config.js with the headers');
        console.error('   2. Restart dev server (npm run dev)');
        console.error('   3. Hard refresh browser (Ctrl+Shift+R)');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        return false;
    }

    // Check if running in secure context (HTTPS or localhost)
    if (!window.isSecureContext) {
        console.error('❌ WebContainer Error: Not a secure context');
        console.error('WebContainer requires HTTPS or localhost');
        console.error('Current URL:', window.location.href);
        return false;
    }

    // Check browser compatibility
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    const isEdge = /Edg/.test(navigator.userAgent);
    
    if (!isChrome && !isEdge) {
        console.warn('⚠️ WebContainer Warning: Browser may not be fully supported');
        console.warn('Recommended browsers: Chrome 92+ or Edge 92+');
        console.warn('Current browser:', navigator.userAgent);
    }

    return true;
}

/**
 * Get or create WebContainer instance (Singleton pattern)
 * This ensures only one instance exists per browser tab
 * @returns {Promise<WebContainer>} The WebContainer instance
 */
export async function getWebContainer() {
    // Check support before attempting to boot
    if (!isWebContainerSupported()) {
        throw new Error(
            'WebContainer is not supported in this environment. ' +
            'Please ensure security headers are configured in vite.config.js and restart the dev server.'
        );
    }

    // If instance already exists, return it immediately
    if (webcontainerInstance) {
        console.log('✓ Reusing existing WebContainer instance');
        return webcontainerInstance;
    }

    // If boot is in progress, wait for it
    if (bootPromise) {
        console.log('⏳ WebContainer boot already in progress, waiting...');
        return bootPromise;
    }

    // Start new boot process
    console.log('🚀 Booting new WebContainer instance...');
    console.log('This may take 2-3 seconds...');
    
    const bootStartTime = Date.now();
    
    bootPromise = WebContainer.boot()
        .then(instance => {
            const bootTime = Date.now() - bootStartTime;
            webcontainerInstance = instance;
            console.log(`✅ WebContainer booted successfully in ${bootTime}ms`);
            console.log('WebContainer instance:', instance);
            bootPromise = null;
            return instance;
        })
        .catch(error => {
            const bootTime = Date.now() - bootStartTime;
            console.error(`❌ WebContainer boot failed after ${bootTime}ms`);
            console.error('Error details:', error);
            bootPromise = null;
            
            // Provide helpful error messages based on error type
            if (error.message.includes('SharedArrayBuffer')) {
                throw new Error(
                    'WebContainer requires SharedArrayBuffer support. ' +
                    'This means your security headers are not configured correctly. ' +
                    'Please add the required headers to vite.config.js and restart the dev server.'
                );
            }
            
            if (error.message.includes('cross-origin')) {
                throw new Error(
                    'WebContainer requires proper CORS headers. ' +
                    'Please ensure Cross-Origin-Embedder-Policy and Cross-Origin-Opener-Policy ' +
                    'are set correctly in vite.config.js'
                );
            }
            
            // Generic error with helpful context
            throw new Error(
                `WebContainer failed to initialize: ${error.message}. ` +
                'This usually indicates missing security headers or browser incompatibility. ' +
                'Please check the console for detailed error messages.'
            );
        });

    return bootPromise;
}

/**
 * Reset WebContainer instance (use only when necessary)
 * Call this when you need to completely restart WebContainer
 */
export function resetWebContainer() {
    console.log('🔄 Resetting WebContainer instance');
    
    if (webcontainerInstance) {
        // Note: WebContainer API doesn't provide a destroy() method
        // We simply clear our reference and let garbage collection handle it
        console.log('Clearing existing instance reference');
        webcontainerInstance = null;
    }
    
    if (bootPromise) {
        console.log('Clearing pending boot promise');
        bootPromise = null;
    }
    
    console.log('✓ WebContainer reset complete');
}

/**
 * Get diagnostic information about WebContainer state
 * Useful for debugging
 */
export function getDiagnostics() {
    return {
        isSupported: isWebContainerSupported(),
        hasInstance: !!webcontainerInstance,
        isBooting: !!bootPromise,
        hasSharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
        isSecureContext: window.isSecureContext,
        userAgent: navigator.userAgent,
        url: window.location.href
    };
}

// Export diagnostics function to window for easy debugging
if (typeof window !== 'undefined') {
    window.getWebContainerDiagnostics = getDiagnostics;
}

export default {
    getWebContainer,
    resetWebContainer,
    isWebContainerSupported,
    getDiagnostics
};
