import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="border-t border-border bg-background py-16 lg:py-20">
      <div className="mx-auto max-w-4xl px-4">
        <div className="relative overflow-hidden rounded-3xl bg-primary p-10 text-center text-primary-foreground shadow-elevated lg:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full bg-primary-foreground/10 blur-3xl"
          />
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to bring intel to your dugout?
          </h2>
          <p className="mx-auto mt-3 max-w-xl opacity-90">
            Sign up free, create your team, and share your join code with your players in minutes.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link to="/signup">
                Sign up free
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link to="/login" search={{ redirect: undefined }}>
                Log in
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-xs opacity-80">Free during beta · No credit card required</p>
        </div>
      </div>
    </section>
  );
}
