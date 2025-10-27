'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function NavbarWrapper() {
  const pathname = usePathname();
  
  // Masquer la navbar sur la page de login
  if (pathname === '/login') {
    return null;
  }
  
  return <Navbar />;
}
