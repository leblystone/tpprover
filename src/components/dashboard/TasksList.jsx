 import React from 'react'
 import { CheckSquare, Square, Droplet, Pill } from 'lucide-react'

export default function TasksList({ tasks, theme, onToggle }) {
  if (!tasks || tasks.length === 0) {
    return <p style={{ color: theme.textLight }}>No research scheduled for today.</p>
  }

  return (
    <ul className="space-y-4">
      {tasks.map(task => (
        <li key={task.id} className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: task.completed ? 'rgba(217,177,166,0.35)' : theme.background }}>
          <div className="flex items-center">
            <button onClick={() => onToggle(task.id)} className="mr-4">
              {task.completed ? <CheckSquare className="h-6 w-6" style={{ color: theme.primary }} /> : <Square className="h-6 w-6" style={{ color: theme.textLight }} />}
            </button>
            <div className={task.completed ? 'line-through transition-all' : 'transition-all'}>
              <span className="font-semibold">{task.name}</span>
              <span className="text-sm ml-2" style={{ color: theme.textLight }}>{task.dose}{task.unit}</span>
            </div>
          </div>
          <div className="flex items-center text-sm" style={{ color: theme.textLight }}>
            {task.type === 'vitamin' ? <Pill className="h-4 w-4 mr-2" /> : <Droplet className="h-4 w-4 mr-2" />}
            <span>{task.time}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}


