
import React from 'react';
import Modal from './Modal';
import { CheckCircle, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PlanCard = ({ theme, plan, currentPlan, onSelect, isSelected }) => {
  const isCurrent = plan.name === currentPlan;

  return (
    <div
      className={`rounded-lg border-2 p-6 cursor-pointer transition-all duration-300 ${
        isSelected ? 'border-blue-500 shadow-xl' : 'border-gray-300 hover:shadow-lg'
      }`}
      style={{
        borderColor: isSelected ? theme.primary : theme.border,
        boxShadow: isSelected ? `0 0 15px ${theme.primary}50` : 'none',
      }}
      onClick={() => !isCurrent && onSelect(plan)}
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-bold" style={{ color: theme.text }}>
            {plan.name}
          </h3>
          <p className="text-sm mt-1" style={{ color: theme.textLight }}>
            {plan.description}
          </p>
        </div>
        {plan.isPopular && (
          <div className="bg-yellow-400 text-yellow-900 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
            <Zap size={12} />
            Most Popular
          </div>
        )}
      </div>

      <div className="my-6">
        <span className="text-4xl font-extrabold" style={{ color: theme.primaryDark }}>
          ${plan.price}
        </span>
        <span className="text-lg font-medium" style={{ color: theme.textLight }}>
          /{plan.interval}
        </span>
        {plan.priceDetails && (
          <p className="text-sm mt-1" style={{ color: theme.textLight }}>
            {plan.priceDetails}
          </p>
        )}
      </div>

      <ul className="space-y-3 text-sm">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-center gap-3">
            <CheckCircle size={16} className="text-green-500" />
            <span style={{ color: theme.text }}>{feature}</span>
          </li>
        ))}
      </ul>
      
      {isCurrent ? (
        <button
          disabled
          className="w-full mt-6 py-3 rounded-lg font-semibold text-center text-gray-500 bg-gray-200"
        >
          Current Plan
        </button>
      ) : (
        <button
          className={`w-full mt-6 py-3 rounded-lg font-semibold text-center transition-all ${
            isSelected ? 'text-white' : `text-white`
          }`}
          style={{ 
            backgroundColor: isSelected ? theme.primaryDark : theme.primary,
            opacity: isSelected ? 1 : 0.9,
          }}
        >
          {isSelected ? 'Selected' : 'Select Plan'}
        </button>
      )}
    </div>
  );
};

export default function SubscriptionModal({ isOpen, onClose, theme, currentPlan }) {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = React.useState(null);

  const plans = [
    {
      name: 'Monthly',
      price: 12,
      interval: 'month',
      description: 'Flexible, month-to-month access.',
      features: [
        'Unlimited Protocols',
        'Advanced Scheduling',
        'Vendor & Order Tracking',
        'Data Sync & Backup',
      ],
      stripePriceId: 'price_monthly_id', // Replace with your actual Stripe Price ID
    },
    {
      name: 'Annual',
      price: 100,
      interval: 'year',
      priceDetails: 'Billed annually (saves 30%)',
      description: 'Best value for long-term planning.',
      features: [
        'All Monthly features',
        'Priority Support',
        'Early Access to New Features',
        'Exclusive Content Library',
      ],
      isPopular: true,
      stripePriceId: 'price_annual_id', // Replace with your actual Stripe Price ID
    },
    {
      name: 'Lifetime',
      price: 300,
      interval: 'once',
      description: 'One-time payment, forever access.',
      features: [
        'All Annual features',
        'Permanent Access, No Subscriptions',
        'Future Updates Included',
        'Founding Member Badge',
      ],
      stripePriceId: 'price_lifetime_id', // Replace with your actual Stripe Price ID
    },
  ];

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
  };

  const handleCheckout = () => {
    if (selectedPlan) {
      console.log('Proceeding to checkout with:', selectedPlan);
      // Here you would integrate with Stripe Checkout
      // For now, let's just navigate to the account page as a placeholder
      onClose();
      navigate('/account?plan=' + selectedPlan.name.toLowerCase());
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Choose Your Plan"
      theme={theme}
      maxWidth="max-w-4xl"
      footer={
        <div className="flex justify-end gap-4 w-full">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all"
          >
            Maybe Later
          </button>
          <button
            onClick={handleCheckout}
            disabled={!selectedPlan}
            className="px-6 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={{ backgroundColor: theme.primary }}
          >
            Proceed to Checkout
          </button>
        </div>
      }
    >
      <div className="p-4">
        <p className="text-center text-gray-600 mb-8">
          Your trial has ended. Select a plan to continue with full access to The Pep Planner.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <PlanCard
              key={plan.name}
              theme={theme}
              plan={plan}
              currentPlan={currentPlan}
              onSelect={handleSelectPlan}
              isSelected={selectedPlan?.name === plan.name}
            />
          ))}
        </div>
      </div>
    </Modal>
  );
}
