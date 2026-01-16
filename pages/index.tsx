import type { NextPage } from 'next'
import Head from 'next/head'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../contexts/AuthContext'
import Dashboard from './Dashboard'

const Home: NextPage = () => {
  const { currentUser, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/login')
    }
  }, [currentUser, loading, router])

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-sui-50 text-sui-600">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-current border-t-transparent" />
      </div>
    )
  }

  if (!currentUser) {
    return null // Will redirect to /login
  }

  return (
    <>
      <Head>
        <title>SuiCloud - Dashboard</title>
      </Head>
      <div className="min-h-screen w-full bg-[url('https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=2940&auto=format&fit=crop')] bg-cover bg-center bg-fixed">
        <div className="absolute inset-0 bg-sui-50/80 backdrop-blur-sm z-0"></div>
        <div className="relative z-10 h-screen overflow-hidden">
          <Dashboard />
        </div>
      </div>
    </>
  )
}

export default Home
