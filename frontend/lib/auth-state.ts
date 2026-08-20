export type AuthStateSnapshot =
  | { status: 'unknown' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; userId: string }

let authStateSnapshot: AuthStateSnapshot = { status: 'unknown' }

export function getAuthStateSnapshot(): AuthStateSnapshot {
  return authStateSnapshot
}

export function setAuthStateSnapshot(next: AuthStateSnapshot): void {
  authStateSnapshot = next
}

export function resetAuthStateSnapshot(): void {
  authStateSnapshot = { status: 'unknown' }
}
