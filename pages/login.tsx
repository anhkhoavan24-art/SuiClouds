import React from 'react'
import Head from 'next/head'
import { useAuth } from '../contexts/AuthContext'
import LoginPage from '../pages/LoginPage'

const Login: React.FC = () => {
  return (
    <>
      <Head>
        <title>SuiCloud - Login</title>
      </Head>
      <LoginPage />
    </>
  )
}

export default Login
