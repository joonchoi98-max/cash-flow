const OWNER = 'joonchoi98-max'
const REPO = 'cash-flow'
const BRANCH = 'main'
const BASE_URL = 'https://api.github.com'

function getHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

export async function fetchFile(path, token) {
  const res = await fetch(
    `${BASE_URL}/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`,
    { headers: token ? getHeaders(token) : { Accept: 'application/vnd.github+json' } }
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
  const data = await res.json()
  const content = atob(data.content.replace(/\n/g, ''))
  return { data: JSON.parse(content), sha: data.sha }
}

export async function saveFile(path, content, sha, token, message) {
  const body = {
    message: message || `Update ${path}`,
    content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2)))),
    branch: BRANCH,
  }
  if (sha) body.sha = sha

  const res = await fetch(
    `${BASE_URL}/repos/${OWNER}/${REPO}/contents/${path}`,
    { method: 'PUT', headers: getHeaders(token), body: JSON.stringify(body) }
  )
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || `GitHub API error: ${res.status}`)
  }
  const result = await res.json()
  return result.content.sha
}

export async function verifyToken(token) {
  try {
    const res = await fetch(`${BASE_URL}/repos/${OWNER}/${REPO}`, {
      headers: getHeaders(token),
    })
    if (!res.ok) return false
    const data = await res.json()
    return data.permissions?.push === true
  } catch {
    return false
  }
}
