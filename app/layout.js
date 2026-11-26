import './globals.css';

export const metadata = {
  title: 'Kothakota Panchayat Election Results',
  description: 'Live ward member and sarpanch counting results',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
