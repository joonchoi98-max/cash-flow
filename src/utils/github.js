const OWNER = 'joonchoi98-max'
const REPO = 'cash-flow'
const BRANCH = 'main'
const BASE_URL = 'https://api.github.com'

function getWriteHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

export async function fetchFile(path) {
  const res = await fetch(
    `${BASE_URL}/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`,
    { headers: { Accept: 'application/vnd.github+json' } }
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
  const data = await res.json()
  // UTF-8 디코딩 (한글 깨짐 방지)
  const bytes = atob(data.content.replace(/\n/g, ''))
  const uint8 = new Uint8Array([...bytes].map(c => c.charCodeAt(0)))
  const content = new TextDecoder('utf-8').decode(uint8)
  return { data: JSON.parse(content), sha: data.sha }
}

export async function saveFile(path, content, sha, token, message) {
  const json = JSON.stringify(content, null, 2)
  const bytes = new TextEncoder().encode(json)
  const b64 = btoa(String.fromCharCode(...bytes))

  const body = { message: message || `Update ${path}`, content: b64, branch: BRANCH }
  if (sha) body.sha = sha

  const res = await fetch(
    `${BASE_URL}/repos/${OWNER}/${REPO}/contents/${path}`,
    { method: 'PUT', headers: getWriteHeaders(token), body: JSON.stringify(body) }
  )
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || `GitHub API error: ${res.status}`)
  }
  const result = await res.json()
  return result.content.sha
}

export async function verifyWriteToken(token) {
  try {
    const res = await fetch(`${BASE_URL}/repos/${OWNER}/${REPO}`, {
      headers: getWriteHeaders(token),
    })
    if (!res.ok) return false
    const data = await res.json()
    return data.permissions?.push === true
  } catch {
    return false
  }
}
