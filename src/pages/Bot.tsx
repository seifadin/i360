import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

// Bot page — immediately redirects to /browser with the bot URL
// Bot URL is resolved in SearchBar.tsx before navigation

export default function Bot() {
  const location = useLocation()
  const navigate = useNavigate()
  const url = location.state?.url ?? ''

  useEffect(() => {
    navigate('/browser', { state: { url }, replace: true })
  }, [])

  return null
}
