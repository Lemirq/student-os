"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Resolver, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { courseSchema } from "@/lib/schemas";
import { createCourse } from "@/actions/courses";
import { useParams, useRouter } from "next/navigation";

export default function NewCoursePage() {
  const params = useParams();
  const router = useRouter();
  const semesterId = params.id as string;

  const form = useForm<z.infer<typeof courseSchema>>({
    resolver: zodResolver(courseSchema) as unknown as Resolver<
      z.infer<typeof courseSchema>
    >,
    defaultValues: {
      semester_id: semesterId,
      code: "",
      name: "",
      color: "#3b82f6", // Default blue
      goal_grade: 85,
    },
  });

  async function onSubmit(values: z.infer<typeof courseSchema>) {
    await createCourse(values);
    router.push("/dashboard");
  }

  return (
    <div className="max-w-md mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-6">Add Course</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Course Code</FormLabel>
                <FormControl>
                  <Input placeholder="CSC101" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Course Name</FormLabel>
                <FormControl>
                  <Input placeholder="Intro to CS" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <Input type="color" className="w-12 h-10 p-1" {...field} />
                    <Input placeholder="#3b82f6" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="goal_grade"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Goal Grade (%)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">Create Course</Button>
        </form>
      </Form>
    </div>
  );
}
