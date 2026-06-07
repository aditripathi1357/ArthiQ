import { useState, useEffect } from 'react'
import { getCompanyProfile, getCompanyOverview } from '../api/client'

export default function useCompany(symbol) {
  const [profile, setProfile] = useState(null)
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!symbol) return
    setLoading(true)
    setError(null)

    Promise.allSettled([
      getCompanyProfile(symbol),
      getCompanyOverview(symbol),
    ]).then(([profileRes, overviewRes]) => {
      if (profileRes.status === 'fulfilled') {
        setProfile(profileRes.value.data)
      }
      if (overviewRes.status === 'fulfilled') {
        setOverview(overviewRes.value.data)
      }
      if (profileRes.status === 'rejected' && overviewRes.status === 'rejected') {
        setError('Failed to fetch company data')
      }
    }).finally(() => setLoading(false))
  }, [symbol])

  return { profile, overview, loading, error }
}
