import React, { useEffect } from 'react'
import { Check, AlertTriangle, Info, X } from 'lucide-react'

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`toast toast-${type} animate-slide-in`}>
      <div className="flex items-center gap-2 px-3 py-2 rounded bg-white shadow border">
        {type === 'success' && <Check className="h-4 w-4" />}
        {type === 'error' && <AlertTriangle className="h-4 w-4" />}
        {type === 'warning' && <Info className="h-4 w-4" />}
        <span className="text-sm">{message}</span>
        <button onClick={onClose} className="ml-auto p-1 rounded hover:bg-black hover:bg-opacity-10">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}

export { Toast, ToastContainer }