import React from 'react'

export default function Checkbox({ id, checked, onChange, label, className = '', theme }) {
	const cid = id || `chk_${Math.random().toString(36).slice(2)}`
	return (
        <>
            <style>{`
                .checkbox-wrapper-themed label { color: ${theme.text}; }
                .checkbox-wrapper-themed label span { border-color: ${theme.text}; }
                .checkbox-wrapper-themed label span:before, .checkbox-wrapper-themed label span:after { background: ${theme.text}; }
                .checkbox-wrapper-themed input[type=checkbox]:checked + label span { background-color: ${theme.primary}; border-color: ${theme.primary}; }
                .checkbox-wrapper-themed input[type=checkbox]:checked + label span:after, .checkbox-wrapper-themed input[type=checkbox]:checked + label span:before { background: ${theme.textOnPrimary}; }
                .checkbox-wrapper-themed input[type=checkbox]:checked + label:hover span { background-color: ${theme.primaryDark}; border-color: ${theme.primaryDark}; }
            `}</style>
    		<div className={`checkbox-wrapper-24 checkbox-wrapper-themed inline-flex items-center ${className}`}>
    			<input type="checkbox" id={cid} checked={!!checked} onChange={e => onChange?.(e.target.checked)} />
    			<label htmlFor={cid}>
    				<span></span>
    				{label}
    			</label>
    		</div>
        </>
	)
}


