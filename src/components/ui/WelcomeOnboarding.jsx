import React from 'react'

export default function WelcomeOnboarding({ theme }) {
	const [open, setOpen] = React.useState(() => {
		try { return localStorage.getItem('tpprover_onboarding_done') !== 'yes' } catch { return true }
	})

	const dismiss = () => {
		setOpen(false)
		try { localStorage.setItem('tpprover_onboarding_done', 'yes') } catch {}
	}

	if (!open) return null

	const go = (to, afterNavigate) => {
		try {
			if (to) {
				window.history.pushState({}, '', to)
				window.dispatchEvent(new PopStateEvent('popstate'))
			}
			if (afterNavigate) setTimeout(afterNavigate, 250)
			setTimeout(dismiss, 300)
		} catch { dismiss() }
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div className="absolute inset-0" style={{ background: 'radial-gradient(1200px 600px at 50% -10%, rgba(59,130,246,0.25), rgba(59,130,246,0.08) 35%, transparent 60%)' }}></div>
			<div className="absolute inset-0 bg-black/40" onClick={dismiss} />
			<div className="relative mx-4 w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden" style={{ backgroundColor: theme?.white }}>
				<div className="p-8">
					<div className="flex items-center gap-3 mb-4">
						<img src="/tpp-logo.png" alt="TPP" className="w-10 h-10 rounded" />
						<h2 className="text-2xl font-extrabold tracking-tight" style={{ color: theme?.primaryDark }}>Welcome to TPP Rover</h2>
					</div>
					<p className="text-sm mb-6" style={{ color: theme?.text }}>
						Let’s get you set up. Pick an action to begin, or explore at your own pace.
					</p>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<button className="group p-4 rounded-xl border text-left hover:shadow transition" style={{ borderColor: theme?.border }} onClick={() => go('/orders', () => window.dispatchEvent(new CustomEvent('tpp:open_orders_new')))}>
							<div className="text-sm font-semibold mb-1" style={{ color: theme?.text }}>Add your first Order</div>
							<div className="text-xs opacity-80" style={{ color: theme?.text }}>Track peptide purchases and delivery status.</div>
						</button>
						<button className="group p-4 rounded-xl border text-left hover:shadow transition" style={{ borderColor: theme?.border }} onClick={() => go('/vendors', () => window.dispatchEvent(new CustomEvent('tpp:open_vendor_new')))}>
							<div className="text-sm font-semibold mb-1" style={{ color: theme?.text }}>Add a Vendor</div>
							<div className="text-xs opacity-80" style={{ color: theme?.text }}>Save trusted vendors and payment methods.</div>
						</button>
						<button className="group p-4 rounded-xl border text-left hover:shadow transition" style={{ borderColor: theme?.border }} onClick={() => go('/protocols', () => window.dispatchEvent(new CustomEvent('tpp:open_protocol_new')))}>
							<div className="text-sm font-semibold mb-1" style={{ color: theme?.text }}>Create a Protocol</div>
							<div className="text-xs opacity-80" style={{ color: theme?.text }}>Plan dosing schedules and durations.</div>
						</button>
						<button className="group p-4 rounded-xl border text-left hover:shadow transition" style={{ borderColor: theme?.border }} onClick={() => go('/recon')}>
							<div className="text-sm font-semibold mb-1" style={{ color: theme?.text }}>Try the Recon Calculator</div>
							<div className="text-xs opacity-80" style={{ color: theme?.text }}>Quickly compute reconstitution amounts.</div>
						</button>
					</div>
					<div className="mt-6 flex items-center justify-between">
						<button className="text-sm underline" onClick={dismiss}>Skip for now</button>
						<button className="px-4 py-2 rounded-md text-sm font-semibold" style={{ backgroundColor: theme?.primary, color: theme?.white }} onClick={dismiss}>Let’s go</button>
					</div>
				</div>
			</div>
		</div>
	)
}


