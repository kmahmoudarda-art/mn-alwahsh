export default function PayPalDonateButton() {
  return (
    <a
      href="https://www.paypal.com/donate/?hosted_button_id=4GTLP26S9E27G"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px',
        borderRadius: 12,
        background: '#0070ba',
        color: '#fff',
        fontSize: 10,
        fontFamily: 'var(--font-cairo)',
        fontWeight: 700,
        textDecoration: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      ❤️ تبرع لنستمر
    </a>
  );
}