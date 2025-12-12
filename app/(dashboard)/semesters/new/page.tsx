"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Resolver, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { semesterSchema } from "@/lib/schemas";
import { createSemester } from "@/actions/courses";

export default function NewSemesterPage() {
  const form = useForm<z.infer<typeof semesterSchema>>({
    resolver: zodResolver(semesterSchema) as unknown as Resolver<
      z.infer<typeof semesterSchema>
    >,
    defaultValues: {
      name: "",
      year_level: 1,
      start_date: "",
      end_date: "",
      is_current: true,
    },
  });

  async function onSubmit(values: z.infer<typeof semesterSchema>) {
    await createSemester(values);
  }

  return (
    <div className="max-w-md mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-6">Create New Semester</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Semester Name</FormLabel>
                <FormControl>
                  <Input placeholder="Fall 2025" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="year_level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Year Level</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="end_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button type="submit">Create Semester</Button>
        </form>
      </Form>
    </div>
  );
}
