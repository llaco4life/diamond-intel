import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-background py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
        <Logo size="sm" />
        <nav className="flex items-center gap-5 text-sm text-muted-foreground">
          <Link to="/login" search={{ redirect: undefined }} className="hover:text-foreground">
            Log in
          </Link>
          <Link to="/signup" className="hover:text-foreground">
            Sign up
          </Link>
        </nav>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Diamond Intel
        </p>
      </div>
    </footer>
  );
}
