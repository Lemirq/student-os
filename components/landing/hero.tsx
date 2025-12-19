import Link from "next/link";
import { Button } from "@/components/ui/button";

import * as motion from "framer-motion/client";

export function Hero() {
  return (
    <section className="space-y-6 pb-8 pt-36 lg:py-32">
      <div className="container mx-auto flex max-w-5xl flex-col items-center gap-4 text-center px-4">
        {/* <Link
          href="/dashboard"
          className="rounded-2xl bg-muted px-4 py-1.5 text-sm font-medium"
          target="_blank"
        >
          Follow along on Twitter
        </Link> */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-4"
        >
          <h1 className="font-heading text-3xl sm:text-5xl md:text-6xl lg:text-7xl">
            Your Academic Life, Organized
          </h1>
          <p className="max-w-2xl leading-normal text-muted-foreground sm:text-xl sm:leading-8">
            The all-in-one workspace for students. Track assignments, manage
            study debt, and visualize your semester progress with ease.
          </p>
        </motion.div>
        <div className="space-x-4">
          <Link href="/dashboard">
            <Button size="lg">Get Started</Button>
          </Link>
          <Link href="#features">
            <Button variant="outline" size="lg">
              Learn More
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
