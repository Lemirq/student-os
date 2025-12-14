import {
  CreditCard,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
} from "lucide-react";

const features = [
  {
    name: "Study Debt Monitor",
    description:
      "Visualize your unfinished tasks as financial debt. Keep your 'academic credit score' high by staying on top of your work.",
    icon: CreditCard,
  },
  {
    name: "Semester Progress",
    description:
      "Track your semester progress with a visual timeline. Know exactly where you are in the academic year.",
    icon: CalendarDays,
  },
  {
    name: "Assignment Heatmap",
    description:
      "See your workload intensity at a glance. Identify busy weeks before they happen.",
    icon: BarChart3,
  },
  {
    name: "Smart Task Management",
    description:
      "Organize tasks by course, priority, and due date. Never miss a deadline again.",
    icon: CheckCircle2,
  },
  {
    name: "Course Analytics",
    description:
      "Analyze your performance in each course. Understand where you need to focus your efforts.",
    icon: BookOpen,
  },
  {
    name: "Time Tracking",
    description:
      "Log time spent on assignments and study sessions. optimize your study habits.",
    icon: Clock,
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="container mx-auto space-y-6 bg-slate-50 py-8 dark:bg-transparent md:py-12 lg:py-24"
    >
      <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
        <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
          Features
        </h2>
        <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
          Everything you need to succeed in your academic journey. Built by
          students, for students.
        </p>
      </div>
      <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-5xl md:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.name}
            className="relative overflow-hidden rounded-lg border bg-background p-2"
          >
            <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
              <feature.icon className="h-12 w-12" />
              <div className="space-y-2">
                <h3 className="font-bold">{feature.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
