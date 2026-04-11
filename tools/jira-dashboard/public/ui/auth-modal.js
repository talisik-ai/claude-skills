export function showAuthModal() {
  document.getElementById('auth-modal').classList.remove('hidden');
}

export function hideAuthModal() {
  document.getElementById('auth-modal').classList.add('hidden');
}

export function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

export function clearAuthError() {
  const el = document.getElementById('auth-error');
  el.textContent = '';
  el.classList.add('hidden');
}

export function getCredentials() {
  return {
    email: document.getElementById('auth-email').value.trim(),
    token: document.getElementById('auth-token').value.trim(),
  };
}
