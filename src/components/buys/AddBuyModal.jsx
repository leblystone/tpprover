 import React, { useState, useEffect } from 'react'
 import { PlusCircle } from 'lucide-react'
 import Modal from '../common/Modal'
 import TextInput from '../common/inputs/TextInput'

export default function AddBuyModal({ open, onClose, onSave, theme }) {
  const [form, setForm] = useState({ name: '', vendor: '', date: '' })
  useEffect(() => {
    if (open) {
      const d = new Date()
      d.setDate(d.getDate() + 7)
      setForm({ name: '', vendor: '', date: d.toISOString().slice(0,10) })
    }
  }, [open])

  return (
    <Modal open={open} onClose={onClose} title="Schedule Upcoming Buy" theme={theme} footer={(
      <div className="flex items-center w-full">
        <button onClick={onClose} className="text-sm font-medium" style={{ color: theme?.textLight || theme?.text, background: 'none', border: 'none', padding: 0 }}>Cancel</button>
        <button onClick={() => onSave?.(form)} className="ml-auto px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: theme?.primary, color: theme?.textOnPrimary || '#fff' }}>Save</button>
      </div>
    )}>
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center justify-center w-8 h-8">
            <PlusCircle size={32} style={{ color: theme.primary }} />
          </div>
          <div className="flex flex-col gap-0.5">
            <h4 className="text-lg font-black tracking-wide" style={{ color: theme.text }}>Schedule Buy</h4>
            <div className="flex items-center gap-2 ml-1">
              <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                Upcoming Purchase
              </span>
            </div>
          </div>
        </div>
        <div className="space-y-3">
        <TextInput label="Item" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="BPC-157 10mg" theme={theme} />
        <TextInput label="Vendor (optional)" value={form.vendor} onChange={v => setForm({ ...form, vendor: v })} placeholder="Vendor name" theme={theme} />
        <TextInput label="Target Date" value={form.date} onChange={v => setForm({ ...form, date: v })} placeholder="YYYY-MM-DD" theme={theme} />
      </div>
    </Modal>
  )
}



                Upcoming Purchase
              </span>
            </div>
          </div>
        </div>
        <div className="space-y-3">
        <TextInput label="Item" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="BPC-157 10mg" theme={theme} />
        <TextInput label="Vendor (optional)" value={form.vendor} onChange={v => setForm({ ...form, vendor: v })} placeholder="Vendor name" theme={theme} />
        <TextInput label="Target Date" value={form.date} onChange={v => setForm({ ...form, date: v })} placeholder="YYYY-MM-DD" theme={theme} />
      </div>
    </Modal>
  )
}



                Upcoming Purchase
              </span>
            </div>
          </div>
        </div>
        <div className="space-y-3">
        <TextInput label="Item" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="BPC-157 10mg" theme={theme} />
        <TextInput label="Vendor (optional)" value={form.vendor} onChange={v => setForm({ ...form, vendor: v })} placeholder="Vendor name" theme={theme} />
        <TextInput label="Target Date" value={form.date} onChange={v => setForm({ ...form, date: v })} placeholder="YYYY-MM-DD" theme={theme} />
      </div>
    </Modal>
  )
}



                Upcoming Purchase
              </span>
            </div>
          </div>
        </div>
        <div className="space-y-3">
        <TextInput label="Item" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="BPC-157 10mg" theme={theme} />
        <TextInput label="Vendor (optional)" value={form.vendor} onChange={v => setForm({ ...form, vendor: v })} placeholder="Vendor name" theme={theme} />
        <TextInput label="Target Date" value={form.date} onChange={v => setForm({ ...form, date: v })} placeholder="YYYY-MM-DD" theme={theme} />
      </div>
    </Modal>
  )
}


