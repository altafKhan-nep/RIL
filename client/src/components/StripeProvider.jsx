import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export const StripeProvider = ({ children, amount }) => {
  return (
    <Elements
      stripe={stripePromise}
      options={{
        amount: Math.round(amount * 100),
        currency: 'usd',
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#a43c12',
            colorBackground: '#ffffff',
            colorText: '#1c1b1f',
            colorDanger: '#dc2626',
            fontFamily: 'Inter, system-ui, sans-serif',
            borderRadius: '9999px',
          },
          rules: {
            '.Input': {
              border: '1px solid #e0e0e0',
              padding: '12px 16px',
              borderRadius: '9999px',
            },
            '.Input:focus': {
              border: '2px solid #a43c12',
              boxShadow: '0 0 0 2px rgba(164, 60, 18, 0.1)',
            },
          },
        },
      }}
    >
      {children}
    </Elements>
  );
};
