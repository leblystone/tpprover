import React from 'react'

export default function Dashboard() {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-3">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded border bg-white p-4">Summary</div>
        <div className="rounded border bg-white p-4">Recent Activity</div>
      </div>
    </section>
  )
}