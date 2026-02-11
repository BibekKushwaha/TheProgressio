"use client";
import { selectIsAuthenticated, useAppSelector } from '@repo/store';
import { useRouter } from 'next/navigation';
import React from 'react'

const layout = ({ children }: { children: React.ReactNode }) => {
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const router = useRouter();
    if (!isAuthenticated) {
        router.push('/login');
        return null; // Prevent rendering until redirect happens
    }
  return (
    <>
      {children}
    </>
  )
}

export default layout