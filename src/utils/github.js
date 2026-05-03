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

// 읽기: raw URL 사용 (API 제한 없음, 빠름)
export async function fetchFile(path) {
  const res = await fetch(
    `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${path}?t=${Date.now()}`
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`파일 로딩 실패 (${res.status})`)
  const data = await res.json()
  return { data, sha: null } // sha는 저장 시 자동으로 가져옴
}

// SHA 조회 (저장 직전에만 호출)
async function fetchSha(path, token) {
  const res = await fetch(
    `${BASE_URL}/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`,
    { headers: getWriteHeaders(token) }
  )
  if (!res.ok) return null
  return (await res.json()).sha || null
}

export async function saveFile(path, content, sha, token, message) {
  const json = JSON.stringify(content, null, 2)
  const bytes = new TextEncoder().encode(json)
  const b64 = btoa(String.fromCharCode(...bytes))

  // sha 없으면 저장 직전에 가져옴
  const resolvedSha = sha || await fetchSha(path, token)

  const body = { message: message || `Update ${path}`, content: b64, branch: BRANCH }
  if (resolvedSha) body.sha = resolvedSha

  const res = await fetch(
    `${BASE_URL}/repos/${OWNER}/${REPO}/contents/${path}`,
    { method: 'PUT', headers: getWriteHeaders(token), body: JSON.stringify(body) }
  )
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || `GitHub API error: ${res.status}`)
  }
  return (await res.json()).content.sha
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
