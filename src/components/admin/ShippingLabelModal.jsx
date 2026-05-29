import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { AdminModal, AdminButton } from './adminUi';

function toast(type, message) {
  window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { type, message } }));
}

function addressFromOrder(order) {
  const a = order.shippingAddress || {};
  return {
    name: order.shippingName || order.customerName || '',
    line1: a.line1 || a.street1 || '',
    line2: a.line2 || a.street2 || '',
    city: a.city || '',
    state: a.state || '',
    postal_code: a.postal_code || a.zip || '',
    country: a.country || 'US',
  };
}

function formatShipTo(address) {
  return [
    address.name,
    address.line1,
    address.line2,
    [address.city, address.state, address.postal_code].filter(Boolean).join(', '),
    address.country && address.country !== 'US' ? address.country : '',
  ].filter(Boolean);
}

export default function ShippingLabelModal({ order, theme, onClose, onPurchased }) {
  const [modalOpen, setModalOpen] = useState(true);
  const [step, setStep] = useState('address');
  const [shipTo, setShipTo] = useState(() => addressFromOrder(order));
  const [rates, setRates] = useState([]);
  const [shipmentId, setShipmentId] = useState(null);
  const [selectedRate, setSelectedRate] = useState(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm';
  const inputStyle = { borderColor: theme.border, backgroundColor: theme.background, color: theme.text };
  const setAddr = (field, value) => setShipTo((prev) => ({ ...prev, [field]: value }));

  const shippingPayload = {
    line1: shipTo.line1.trim(),
    line2: shipTo.line2.trim() || null,
    city: shipTo.city.trim(),
    state: shipTo.state.trim(),
    postal_code: shipTo.postal_code.trim(),
    country: shipTo.country.trim() || 'US',
  };

  const handleGetRates = async () => {
    if (!shippingPayload.line1 || !shippingPayload.city || !shippingPayload.state || !shippingPayload.postal_code) {
      toast('warning', 'Street, city, state, and ZIP are required');
      return;
    }
    setLoadingRates(true);
    setRates([]);
    setShipmentId(null);
    setSelectedRate(null);
    try {
      const fn = getFunctions();
      const createLabel = httpsCallable(fn, 'createShippingLabel');
      const { data } = await createLabel({
        orderId: order.id,
        shippingName: shipTo.name.trim(),
        shippingAddress: shippingPayload,
        saveAddress: true,
      });
      setShipmentId(data.shipmentId || null);
      setRates(data.rates || []);
      if (!data.rates?.length) {
        toast('warning', 'No rates returned — check the address');
        return;
      }
      setStep('rates');
    } catch (err) {
      console.error('Get rates error:', err);
      toast('error', err.message || 'Failed to get shipping rates');
    } finally {
      setLoadingRates(false);
    }
  };

  const handlePurchase = async () => {
    const rate = selectedRate;
    const sid = rate?.shipmentId || shipmentId;
    if (!rate?.id || !sid) {
      toast('error', 'Missing rate — go back and select a service again');
      return;
    }
    setPurchasing(true);
    try {
      const fn = getFunctions();
      const purchaseLabel = httpsCallable(fn, 'purchaseShippingLabel');
      const { data } = await purchaseLabel({ orderId: order.id, shipmentId: sid, rateId: rate.id });
      onPurchased(order.id, {
        ...data,
        shippingName: shipTo.name.trim(),
        shippingAddress: shippingPayload,
      });
      onClose();
    } catch (err) {
      console.error('Purchase label error:', err);
      toast('error', err.message || 'Failed to purchase label');
    } finally {
      setPurchasing(false);
    }
  };

  const closeModal = () => setModalOpen(false);

  return (
    <AdminModal open={modalOpen} onClose={onClose} theme={theme}>
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: theme.border }}>
        <h3 className="text-base font-bold" style={{ color: theme.text }}>
          {step === 'address' && 'Ship to — verify address'}
          {step === 'rates' && 'Choose shipping service'}
          {step === 'confirm' && 'Confirm label purchase'}
        </h3>
        <AdminButton variant="ghost" theme={theme} onClick={closeModal} className="!text-sm !px-2 !py-1" aria-label="Close">
          ✕
        </AdminButton>
      </div>

      <div className="p-4 space-y-4 min-h-[280px]">
          {step === 'address' && (
            <>
              <p className="text-xs" style={{ color: theme.textLight }}>
                Edit the address if needed, then get rates. Changes are saved on the order.
              </p>
              <input type="text" value={shipTo.name} onChange={(e) => setAddr('name', e.target.value)} placeholder="Recipient name" className={inputClass} style={inputStyle} />
              <input type="text" value={shipTo.line1} onChange={(e) => setAddr('line1', e.target.value)} placeholder="Street address *" className={inputClass} style={inputStyle} />
              <input type="text" value={shipTo.line2} onChange={(e) => setAddr('line2', e.target.value)} placeholder="Apt, suite, etc." className={inputClass} style={inputStyle} />
              <div className="grid grid-cols-3 gap-2">
                <input type="text" value={shipTo.city} onChange={(e) => setAddr('city', e.target.value)} placeholder="City *" className={inputClass} style={inputStyle} />
                <input type="text" value={shipTo.state} onChange={(e) => setAddr('state', e.target.value)} placeholder="State *" className={inputClass} style={inputStyle} />
                <input type="text" value={shipTo.postal_code} onChange={(e) => setAddr('postal_code', e.target.value)} placeholder="ZIP *" className={inputClass} style={inputStyle} />
              </div>
              <input type="text" value={shipTo.country} onChange={(e) => setAddr('country', e.target.value)} placeholder="Country" className={inputClass} style={inputStyle} />
              <AdminButton
                variant="primary"
                theme={theme}
                loading={loadingRates}
                onClick={handleGetRates}
                className="w-full !min-h-[42px]"
              >
                {loadingRates ? 'Loading rates…' : 'Get shipping rates'}
              </AdminButton>
            </>
          )}

          {step === 'rates' && (
            <>
              <div className="text-xs rounded-lg p-3" style={{ backgroundColor: `${theme.text}06`, color: theme.textLight }}>
                {formatShipTo(shipTo).map((line) => <div key={line}>{line}</div>)}
                <button type="button" onClick={() => setStep('address')} className="underline mt-2 block" style={{ color: theme.text }}>
                  Edit address
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {rates.map((rate) => (
                  <button
                    key={rate.id}
                    type="button"
                    onClick={() => {
                      setSelectedRate(rate);
                      setStep('confirm');
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-lg border transition-all duration-150 ease-out hover:shadow-sm hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 text-left"
                    style={{ borderColor: theme.border, backgroundColor: theme.background }}
                  >
                    <div>
                      <p className="text-sm font-semibold" style={{ color: theme.text }}>{rate.carrier} — {rate.service}</p>
                      {rate.delivery_days && (
                        <p className="text-xs mt-0.5" style={{ color: theme.textLight }}>
                          {rate.delivery_days} business day{rate.delivery_days !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-bold" style={{ color: theme.primary }}>${Number(rate.rate).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'confirm' && selectedRate && (
            <>
              <div className="rounded-lg border p-4 space-y-3 text-sm" style={{ borderColor: theme.border }}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: theme.textLight }}>Service</p>
                  <p style={{ color: theme.text }}>
                    {selectedRate.carrier} — {selectedRate.service}
                    <span className="font-bold ml-2">${Number(selectedRate.rate).toFixed(2)}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: theme.textLight }}>Ship to</p>
                  <div className="leading-relaxed" style={{ color: theme.text }}>
                    {formatShipTo(shipTo).map((line) => <div key={line}>{line}</div>)}
                  </div>
                </div>
                <p className="text-xs" style={{ color: theme.textLight }}>
                  This charges your EasyPost account and emails the customer when the label is purchased.
                </p>
              </div>
              <div className="flex gap-2">
                <AdminButton
                  variant="secondary"
                  theme={theme}
                  disabled={purchasing}
                  onClick={() => setStep('rates')}
                  className="flex-1 !min-h-[42px]"
                >
                  Back
                </AdminButton>
                <AdminButton
                  variant="primary"
                  theme={theme}
                  loading={purchasing}
                  onClick={handlePurchase}
                  className="flex-1 !min-h-[42px]"
                >
                  {purchasing ? 'Purchasing…' : `Purchase label — $${Number(selectedRate.rate).toFixed(2)}`}
                </AdminButton>
              </div>
            </>
          )}
      </div>
    </AdminModal>
  );
}
