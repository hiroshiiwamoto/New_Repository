// Google Drive アクセストークンのモジュール内共有状態。
// Auth コンポーネントからは setter/clearer 経由で更新し、他ファイルからは
// getter / refresh で参照する。React コンポーネントと同居しないことで
// Fast Refresh の制約 (only-export-components) を回避している。

import { auth, googleProvider } from '../firebase'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'

let _googleAccessToken = null

export function getGoogleAccessToken() {
  return _googleAccessToken
}

export function setGoogleAccessToken(token) {
  _googleAccessToken = token
}

export function clearGoogleAccessToken() {
  _googleAccessToken = null
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
