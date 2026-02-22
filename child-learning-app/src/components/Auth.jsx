import { useState, useEffect } from 'react'
import { auth, googleProvider } from '../firebase'
import { signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth'
import { toast } from '../utils/toast'
import Loading from './Loading'
import SettingsModal from './SettingsModal'
import './Auth.css'

// Google Drive アクセストークンを管理
let _googleAccessToken = null

export function getGoogleAccessToken() {
  return _googleAccessToken
}

export async function refreshGoogleAccessToken() {
  try {
    const result = await signInWithPopup(auth, googleProvider)
    const credential = GoogleAuthProvider.credentialFromResult(result)
    if (credential) {
      _googleAccessToken = credential.accessToken
    }
    return _googleAccessToken
  } catch (error) {
    console.error('Error refreshing Google token:', error)
    return null
  }
}

function Auth({ onAuthChange }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
      if (!currentUser) {
        _googleAccessToken = null
      }
      if (onAuthChange) {
        onAuthChange(currentUser)
      }
    })

    return () => unsubscribe()
  }, [onAuthChange])

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const credential = GoogleAuthProvider.credentialFromResult(result)
      if (credential) {
        _googleAccessToken = credential.accessToken
      }
    } catch (error) {
      console.error('Error signing in with Google:', error)
      toast.error('ログインに失敗しました: ' + error.message)
    }
  }

  const handleSignOut = async () => {
    try {
      _googleAccessToken = null
      await signOut(auth)
    } catch (error) {
      console.error('Error signing out:', error)
      toast.error('ログアウトに失敗しました: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="auth-container">
        <Loading message="読み込み中..." />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>📘 SAPIX 学習管理</h2>
          <p className="auth-description">
            Googleアカウントでログインして、<br />
            デバイス間でデータを同期しましょう
          </p>
          <button onClick={handleGoogleSignIn} className="google-signin-btn">
            <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Googleでログイン
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-user-info">
      <div className="user-profile">
        {user.photoURL && (
          <img src={user.photoURL} alt="Profile" className="user-avatar" />
        )}
        <span className="user-name">{user.displayName || user.email}</span>
      </div>
      <button
        onClick={() => setShowSettings(true)}
        className="settings-gear-btn"
        title="設定"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      </button>
      <button onClick={handleSignOut} className="signout-btn">
        ログアウト
      </button>
      {showSettings && (
        <SettingsModal
          userId={user.uid}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

export default Auth
