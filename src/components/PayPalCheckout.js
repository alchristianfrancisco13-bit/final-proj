import { useEffect, useRef, useState } from 'react';
import { PAYPAL_CONFIG } from '../config';

export default function PayPalCheckout({ amount = 1000, onSuccess = () => {}, onError = () => {} }) {
  const ref = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Load PayPal SDK script
    const id = 'paypal-sdk';
    if (document.getElementById(id)) {
      setLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.id = id;
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CONFIG.CLIENT_ID}&currency=${PAYPAL_CONFIG.CURRENCY}`;
    script.async = true;
    script.onload = () => setLoaded(true);
    script.onerror = () => onError(new Error('Failed to load PayPal SDK'));
    document.body.appendChild(script);

    return () => {
      // do not remove script on unmount (other components may use it)
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (!window.paypal || !ref.current) return;

    // Clear previous buttons
    ref.current.innerHTML = '';

    window.paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'pill', label: 'pay' },
      createOrder: function(data, actions) {
        return actions.order.create({
          purchase_units: [{ amount: { value: amount.toString(), currency_code: PAYPAL_CONFIG.CURRENCY } }]
        });
      },
      onApprove: function(data, actions) {
        return actions.order.capture().then(function(details) {
          try {
            onSuccess(details);
          } catch (e) {
            console.error('onSuccess handler error', e);
          }
        });
      },
      onError: function(err) {
        onError(err);
      }
    }).render(ref.current);
  }, [loaded, amount]);

  return <div ref={ref} />;
}
