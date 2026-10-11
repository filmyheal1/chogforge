import type { Metadata } from 'next';
import StudioFooter from '@/components/StudioFooter';
import './footer.css';

export const metadata: Metadata = {
  title: 'Studio — Footer',
  description: 'Fresh ideas, imagination, and creative collaboration.',
  icons: { icon: '/chog-token.webp' },
};

export default function FooterPage() {
  return (
    <div className="footer-route">
      <StudioFooter />
    </div>
  );
}
