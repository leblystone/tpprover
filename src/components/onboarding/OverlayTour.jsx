import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import logo from '../../assets/tpp-logo.png'

export default function OverlayTour({ open, steps, currentIndex, onIndexChange, onFinish, theme, onRequestInstall }) {
	const [positions, setPositions] = useState({})
	const [tooltipSize, setTooltipSize] = useState({ width: 300, height: 120 })
	const svgRef = useRef(null)
	const tooltipRef = useRef(null)

	const step = steps[currentIndex]
	const canPrev = currentIndex > 0
	const canNext = currentIndex < steps.length - 1

	useEffect(() => {
		if (!open) return
		let raf
		const calc = () => {
			setPositions(prev => {
				const next = { ...prev }
				steps.forEach(s => {
					const el = document.querySelector(s.target)
					if (el) {
						const rect = el.getBoundingClientRect()
						next[s.target] = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, rect }
					}
				})
				return next
			})
			raf = requestAnimationFrame(calc)
		}
		calc()
		return () => cancelAnimationFrame(raf)
	}, [open, steps])

	useEffect(() => {
		if (!open || !step) return
		const el = document.querySelector(step.target)
		if (el && el.scrollIntoView) {
			try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }) } catch {}
		}
	}, [open, currentIndex, step])

	const from = step ? positions[step.target] : null
	const getTargetPos = (pos, position) => {
		const MARGIN = 20
		switch (position) {
			case 'top': return { x: pos.rect.left + pos.rect.width / 2, y: pos.rect.top - MARGIN }
			case 'bottom': return { x: pos.rect.left + pos.rect.width / 2, y: pos.rect.bottom + MARGIN }
			case 'left': return { x: pos.rect.left - MARGIN, y: pos.rect.top + pos.rect.height / 2 }
			case 'right': return { x: pos.rect.right + MARGIN, y: pos.rect.top + pos.rect.height / 2 }
			default: return { x: pos.x, y: pos.y }
		}
	}

	// Choose a placement that fits within the viewport
	const choosePlacement = () => {
		const preferred = step?.position || 'right'
		if (preferred === 'center') return 'center'
		const order = [preferred, 'left', 'bottom', 'top']
		const vw = window.innerWidth
		const vh = window.innerHeight
		for (const p of order) {
			if (!from) break
			const center = getTargetPos(from, p)
			const halfW = tooltipSize.width / 2
			const halfH = tooltipSize.height / 2
			let x = center.x
			let y = center.y
			if (p === 'top') y = y - halfH - 10
			if (p === 'bottom') y = y + halfH + 10
			if (p === 'left') x = x - halfW - 10
			if (p === 'right') x = x + halfW + 10
			const fits = x - halfW >= 8 && x + halfW <= vw - 8 && y - halfH >= 8 && y + halfH <= vh - 8
			if (fits) return p
		}
		return preferred
	}

	const resolvedPosition = choosePlacement()
	const targetPos = from ? getTargetPos(from, resolvedPosition) : null

	// Compute pixel-based tooltip position with viewport clamping
	const computeTooltipPos = () => {
		if (!from || !targetPos) return null
		const vw = window.innerWidth
		const vh = window.innerHeight
		let x = 0
		let y = 0
		const gap = 12
		if (resolvedPosition === 'top') {
			x = targetPos.x - tooltipSize.width / 2
			y = targetPos.y - tooltipSize.height - gap
		} else if (resolvedPosition === 'bottom') {
			x = targetPos.x - tooltipSize.width / 2
			y = targetPos.y + gap
		} else if (resolvedPosition === 'left') {
			x = targetPos.x - tooltipSize.width - gap
			y = targetPos.y - tooltipSize.height / 2
		} else { // right
			x = targetPos.x + gap
			y = targetPos.y - tooltipSize.height / 2
		}
		// Clamp inside viewport with padding
		const pad = 8
		x = Math.max(pad, Math.min(vw - tooltipSize.width - pad, x))
		y = Math.max(pad, Math.min(vh - tooltipSize.height - pad, y))
		return { x, y }
	}

	const tooltipPos = computeTooltipPos()

	// Measure tooltip size to improve fit calculations
	useEffect(() => {
		if (!open) return
		const el = tooltipRef.current
		if (el) {
			const r = el.getBoundingClientRect()
			if (r.width && r.height) setTooltipSize({ width: r.width, height: r.height })
		}
	}, [open, currentIndex])

	return (
		<AnimatePresence>
			{open && (
					<motion.div className="fixed inset-0 z-[10000] bg-black/70" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
						<AnimatePresence mode="wait">
							{from && resolvedPosition !== 'center' && (
								<motion.svg key={`line-${currentIndex}`} ref={svgRef} width="100%" height="100%" className="absolute inset-0 pointer-events-none" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
									<g>
										<motion.path d={`M ${from.x} ${from.y} L ${targetPos.x} ${targetPos.y}`} stroke="white" strokeWidth="2" fill="none" initial={{pathLength:0, opacity:0}} animate={{pathLength:1, opacity:1}} />
										<circle cx={targetPos.x} cy={targetPos.y} r="4" fill="white" />
									</g>
								</motion.svg>
							)}
						</AnimatePresence>
					<AnimatePresence mode="wait">
					{resolvedPosition === 'center' ? (
						<motion.div
							key={`center-${currentIndex}`}
							className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-xl shadow-2xl max-w-lg w-[90%] text-center border"
							style={{ borderColor: theme.border }}
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -8 }}
						>
							{step.title && (
								<h2 className="text-2xl font-bold mb-3" style={{ color: theme.primaryDark }}>{step.title}</h2>
							)}
							<div className="text-sm mb-6" style={{ color: theme.text }}>{step.content}</div>
							<div className="flex justify-center mb-6">
								<img src={logo} alt="The Pep Planner Logo" className="h-20 w-20 rounded-full shadow-lg object-cover" />
							</div>
							<div className="flex items-center justify-center gap-3">
								{onRequestInstall && (
									<button onClick={onRequestInstall} className="px-5 py-2 rounded-md text-white font-semibold" style={{ backgroundColor: theme.primary }}>Install App</button>
								)}
								<button onClick={onFinish} className="px-5 py-2 rounded-md text-sm font-semibold" style={{ border: `1px solid ${theme.border}`, color: theme.text }}>Finish</button>
							</div>
						</motion.div>
					) : from && tooltipPos ? (
						<motion.div key={`tip-${currentIndex}`} ref={tooltipRef} className="absolute p-3 rounded text-white text-sm bg-black/70 max-w-sm shadow-lg" style={{
							left: tooltipPos.x,
							top: tooltipPos.y
						}} initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-8}}>
							{step.title && (<div className="text-base font-bold mb-1" style={{color:theme.textOnPrimary}}>{step.title}</div>)}
							<div className="leading-snug">{step.content}</div>
						</motion.div>
					) : (
						<motion.div key={`fallback-${currentIndex}`} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-4 rounded text-white text-sm bg-black/70 max-w-sm shadow-lg" initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-8}}>
							{step.title && (<div className="text-base font-bold mb-2" style={{color:theme.textOnPrimary}}>{step.title}</div>)}
							<div className="leading-snug">{step.content}</div>
							<div className="mt-2 text-xs opacity-80">(This section will scroll into view when ready.)</div>
						</motion.div>
					)}
					</AnimatePresence>
					{resolvedPosition !== 'center' && (
						<div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-lg border flex items-center gap-1 p-1">
							<button disabled={!canPrev} onClick={() => onIndexChange(currentIndex-1)} className="px-3 py-1.5 text-sm rounded-full disabled:opacity-40" style={{color:theme.text}}>Back</button>
							<div className="px-3 text-xs" style={{color:theme.textMuted}}>{currentIndex+1} / {steps.length}</div>
							{canNext ? (
								<button onClick={() => onIndexChange(currentIndex+1)} className="px-3 py-1.5 text-sm rounded-full text-white" style={{backgroundColor:theme.primary}}>Next</button>
							) : (
								<button onClick={onFinish} className="px-3 py-1.5 text-sm rounded-full text-white" style={{backgroundColor:theme.primary}}>Finish</button>
							)}
							<button onClick={onFinish} className="px-3 py-1.5 text-sm rounded-full" style={{color:theme.text}}>Skip</button>
						</div>
					)}
				</motion.div>
			)}
		</AnimatePresence>
	)
}


