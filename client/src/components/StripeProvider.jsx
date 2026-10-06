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
            colorPrimary: '#B2541C',
            colorBackground: '#FFFFFF',
            colorText: '#1F1A16',
            colorDanger: '#dc2626',
            fontFamily: 'Poppins, system-ui, sans-serif',
            borderRadius: '9999px',
          },
          rules: {
            '.Input': {
              border: '1px solid #D8CCC2',
              padding: '12px 16px',
              borderRadius: '9999px',
            },
            '.Input:focus': {
              border: '2px solid #B2541C',
              boxShadow: '0 0 0 2px rgba(212, 175, 55, 0.1)',
            },
          },
        },
      }}
    >
      {children}
    </Elements>
  );
};
