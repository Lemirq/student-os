import {
  Bot,
  Bell,
  Calendar,
  BarChart3,
  Kanban,
  FileText,
  CreditCard,
  CalendarDays,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import { SpotlightGrid, SpotlightCard } from "@/components/ui/spotlight-grid";

// New features - recently implemented
const newFeatures = [
  {
    name: "AI Copilot",
    description:
      "Upload your syllabus and let AI extract all assignments, exams, and weights. Create tasks with natural language like 'Add midterm for CSC108 next Tuesday'.",
    icon: Bot,
  },
  {
    name: "Deadline Notifications",
    description:
      "Get push notifications at 24h, 6h, and 1h before deadlines. Never miss an assignment again with intelligent reminders.",
    icon: Bell,
  },
  {
    name: "Schedule Import",
    description:
      "Import your class schedule from Acorn (.ics). View all lectures, tutorials, and labs in a weekly calendar with course colors.",
    icon: Calendar,
  },
  {
    name: "Grade Analytics",
    description:
      "Track weighted grades per course. See grade gaps, calculate what you need on finals, and monitor high-stakes assignments.",
    icon: BarChart3,
  },
  {
    name: "Multi-View Tasks",
    description:
      "Switch between list, kanban board, and calendar views. Drag-and-drop to reschedule. Instant updates with optimistic UI.",
    icon: Kanban,
  },
  {
    name: "Rich Task Notes",
    description:
      "Add formatted notes to tasks with the Tiptap editor. Bold, lists, links, and more to keep your study materials organized.",
    icon: FileText,
  },
];

// Core features - original
const coreFeatures = [
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
];

import * as motion from "framer-motion/client";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function Features() {
  return (
    <section
      id="features"
      className="container mx-auto space-y-16 bg-slate-50 py-8 dark:bg-transparent md:py-12 lg:py-24 px-4"
    >
      {/* New Features Section */}
      <div>
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
          <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
            Features
          </h2>
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
            Everything you need to succeed in your academic journey. Built by
            students, for students.
          </p>
        </div>
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <SpotlightGrid className="mx-auto mt-8 grid justify-center gap-4 sm:grid-cols-2 md:max-w-5xl md:grid-cols-3">
            {newFeatures.map((feature) => (
              <motion.div variants={item} key={feature.name}>
                <SpotlightCard className="h-full">
                  <div className="flex flex-col justify-between rounded-md p-6 h-full">
                    <feature.icon className="size-8 text-foreground mb-3 shrink-0" />
                    <div className="space-y-2">
                      <h3 className="font-bold">{feature.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </SpotlightCard>
              </motion.div>
            ))}
          </SpotlightGrid>
        </motion.div>
      </div>

      {/* Core Features Section */}
      <div>
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
          <h3 className="font-heading text-2xl leading-[1.1] sm:text-2xl md:text-4xl">
            And More
          </h3>
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
            Core tools to keep you organized throughout the semester.
          </p>
        </div>
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <SpotlightGrid className="mx-auto mt-8 grid justify-center gap-4 sm:grid-cols-2 md:max-w-4xl">
            {coreFeatures.map((feature) => (
              <motion.div variants={item} key={feature.name}>
                <SpotlightCard className="h-full">
                  <div className="flex flex-col justify-between rounded-md p-6 h-full">
                    <feature.icon className="size-8 text-foreground mb-3 shrink-0" />
                    <div className="space-y-2">
                      <h3 className="font-bold">{feature.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </SpotlightCard>
              </motion.div>
            ))}
          </SpotlightGrid>
        </motion.div>
      </div>
    </section>
  );
}
