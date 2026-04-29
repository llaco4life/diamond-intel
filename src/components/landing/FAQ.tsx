import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "How much does Diamond Intel cost?",
    a: "Free during beta. We'll give plenty of notice before any pricing changes — your data stays yours.",
  },
  {
    q: "Do players need their own account?",
    a: "Yes. Players sign up with the team join code their head coach shares. Each player has their own development log and only sees what's appropriate for their role.",
  },
  {
    q: "Can one organization run multiple teams?",
    a: "Absolutely. A head coach can run 12U, 14U, and 16U under one organization. Each team has its own roster, scouting data, and join code — and you can switch teams in one tap.",
  },
  {
    q: "What devices does it work on?",
    a: "Diamond Intel is mobile-first and works as a PWA on any phone or tablet — built for one-handed use in the dugout. It also works great on a laptop for prep and review.",
  },
  {
    q: "Who can see scouting reports?",
    a: "Only coaches in your organization can see scouting reports. Player development logs are private to each player and their coaches.",
  },
];

export function FAQ() {
  return (
    <section className="border-t border-border bg-secondary/40 py-16 lg:py-20">
      <div className="mx-auto max-w-3xl px-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Frequently asked questions
          </h2>
        </div>
        <Accordion type="single" collapsible className="mt-8 rounded-2xl border border-border bg-card px-4 shadow-card">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-border">
              <AccordionTrigger className="text-left text-base font-semibold">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
