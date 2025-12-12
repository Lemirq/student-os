"use client";

import { Control, FieldValues, Resolver, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { gradeWeightSchema } from "@/lib/schemas";
import { createGradeWeight } from "@/actions/courses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Plus } from "lucide-react";

export function AddGradeWeightForm({ courseId }: { courseId: string }) {
  const form = useForm<z.infer<typeof gradeWeightSchema>>({
    resolver: zodResolver(gradeWeightSchema) as unknown as Resolver<
      z.infer<typeof gradeWeightSchema>
    > &
      FieldValues,
    defaultValues: {
      course_id: courseId,
      name: "",
      weight_percent: 0,
    },
  });

  async function onSubmit(
    values: Omit<z.infer<typeof gradeWeightSchema>, "course_id">,
  ) {
    await createGradeWeight({ ...values, course_id: courseId });
    form.reset({ course_id: courseId, name: "", weight_percent: 0 });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) =>
          onSubmit(
            values as unknown as Omit<
              z.infer<typeof gradeWeightSchema>,
              "course_id"
            >,
          ),
        )}
        className="flex items-end gap-2"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormControl>
                <Input placeholder="Assignments" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="weight_percent"
          render={({ field }) => (
            <FormItem className="w-24">
              <FormControl>
                <Input type="number" placeholder="%" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </form>
    </Form>
  );
}
