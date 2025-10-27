export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Pas de padding-top pour la page login
  return <>{children}</>;
}
