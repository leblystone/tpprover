
const InfoCard = ({ icon: Icon, label, value, theme }) => (
  <div 
    className="flex items-center justify-between p-5 rounded-[2rem] border-2 transition-all shadow-sm"
    style={{ 
      backgroundColor: theme.cardBackground,
      borderColor: 'transparent'
    }}
  >
    <div className="flex items-center gap-4">
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: theme.primary + '10' }}
      >
        <Icon size={18} style={{ color: theme.primary }} />
      </div>
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider opacity-40" style={{ color: theme.text }}>
          {label}
        </div>
        <div className="text-base font-black tracking-tight" style={{ color: theme.text }}>
          {value}
        </div>
      </div>
    </div>
  </div>
)

const EmailStatusCard = ({ isVerified, theme, onSendVerification, isSending, cooldown = 0 }) => {
  const isDisabled = isSending || cooldown > 0
  
  return (
    <div 
      className="p-5 rounded-[2rem] border-2 transition-all shadow-sm overflow-hidden"
      style={{ 
        backgroundColor: theme.cardBackground,
        borderColor: 'transparent'
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ 
              backgroundColor: isVerified ? theme.primary + '15' : '#c87a5c15'
            }}
          >
            <Mail size={18} style={{ color: isVerified ? theme.primary : '#c87a5c' }} />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-40" style={{ color: theme.text }}>
              Email Verification
            </div>
            <div 
              className="text-sm font-black tracking-tight" 
              style={{ color: isVerified ? theme.primary : '#c87a5c' }}
            >
              {isVerified ? 'Verified Account' : 'Action Required: Unverified'}
            </div>
          </div>
        </div>
        
        {!isVerified && (
          <button
            onClick={onSendVerification}
            disabled={isDisabled}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 hover:shadow-md active:scale-95"
            style={{ 
              backgroundColor: theme.primary,
              color: '#ffffff'
            }}
          >
            {isSending ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
            <span>{isSending ? 'Sending' : cooldown > 0 ? `${cooldown}s` : 'Verify'}</span>
          </button>
        )}
      </div>

      {!isVerified && (
        <div className="mt-4 pt-4 border-t border-dashed" style={{ borderColor: theme.border }}>
          <div className="flex gap-2 text-[11px] leading-relaxed opacity-70" style={{ color: theme.text }}>
            <ShieldCheck size={14} className="shrink-0 mt-0.5" style={{ color: '#c87a5c' }} />
            <p>Verification ensures the security of your research protocols and enables secure password recovery.</p>
          </div>
        </div>
      )}
    </div>
  )
}


