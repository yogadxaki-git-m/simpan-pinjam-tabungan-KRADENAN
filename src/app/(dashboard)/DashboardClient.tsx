'use client'

import React from 'react'

interface DashboardClientProps {
  children?: React.ReactNode
}

export default function DashboardClient({ children }: DashboardClientProps) {
  return (
    <div className="w-full">
      {children}
    </div>
  )
}