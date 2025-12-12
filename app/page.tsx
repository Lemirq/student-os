import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 gap-4">
      <h1 className="text-4xl font-bold">StudentOS</h1>
      <p className="text-xl">Welcome to your student operating system.</p>
      <Link href="/settings">
        <Button>Go to Settings</Button>
      </Link>
    </div>
  );
}
