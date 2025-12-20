"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { CourseData } from "@/actions/get-course-data";
import { GradeWeight, Task } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X, Trash2, Plus } from "lucide-react";
import {
  updateGradeWeight,
  createGradeWeight,
  deleteGradeWeight,
} from "@/actions/courses";

interface CourseStrategySidebarProps {
  course: CourseData;
}

export function CourseStrategySidebar({ course }: CourseStrategySidebarProps) {
  // State for editing grade weights
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editedName, setEditedName] = React.useState("");
  const [editedWeight, setEditedWeight] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  // State for adding new grade weight
  const [isAdding, setIsAdding] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newWeight, setNewWeight] = React.useState("");

  // 1. Calculate Weights and Scores
  const { completedWeight, currentWeightedScore, remainingWeight } =
    React.useMemo(() => {
      let completedWeight = 0;
      let currentWeightedScore = 0;

      // Group tasks by gradeWeightId to distribute weight
      const tasksByWeight: Record<string, Task[]> = {};
      course.tasks.forEach((task) => {
        if (task.gradeWeightId) {
          if (!tasksByWeight[task.gradeWeightId]) {
            tasksByWeight[task.gradeWeightId] = [];
          }
          tasksByWeight[task.gradeWeightId].push(task);
        }
      });

      // Iterate through grade weights to calculate contributions
      course.grade_weights.forEach((gw) => {
        const gwTasks = tasksByWeight[gw.id] || [];
        const totalTasksInGw = gwTasks.length;
        const weightPercent = parseFloat(gw.weightPercent?.toString() || "0");

        if (totalTasksInGw > 0) {
          const weightPerTask = weightPercent / totalTasksInGw;

          gwTasks.forEach((task) => {
            if (task.scoreReceived !== null) {
              completedWeight += weightPerTask;
              const score = parseFloat(task.scoreReceived.toString());
              const max = parseFloat(task.scoreMax?.toString() || "100");
              const percentage = max > 0 ? score / max : 0;
              currentWeightedScore += percentage * weightPerTask;
            }
          });
        }
      });

      // Handle tasks without grade weights or if logic needs adjustment
      // For now, only weighted tasks contribute to the "decided" portion.

      return {
        completedWeight,
        currentWeightedScore,
        remainingWeight: 100 - completedWeight,
      };
    }, [course]);

  // 2. State for What-If Calculator
  const [whatIfScore, setWhatIfScore] = React.useState([85]);

  const projectedGrade = React.useMemo(() => {
    // Formula: CurrentWeightedScore + (SliderValue * RemainingWeight / 100)
    // Note: CurrentWeightedScore is already weighted (e.g. 35 out of 40 possible points)
    // Actually, CurrentWeightedScore should be: (Points Earned / Points Possible so far) * CompletedWeight?
    // No, standard formula: Sum(Score% * Weight).
    // Example: Midterm (20%) - Scored 90%. Contribution = 0.9 * 20 = 18.
    // CurrentWeightedScore = 18.
    // Remaining Weight = 80.
    // If I average 85% on remaining: 0.85 * 80 = 68.
    // Total = 18 + 68 = 86.

    const futureContribution = (whatIfScore[0] / 100) * remainingWeight;
    return currentWeightedScore + futureContribution;
  }, [currentWeightedScore, remainingWeight, whatIfScore]);

  // Calculate total weight for grade weights
  const totalWeight = React.useMemo(() => {
    return course.grade_weights.reduce((sum, weight) => {
      return sum + parseFloat(weight.weightPercent?.toString() || "0");
    }, 0);
  }, [course.grade_weights]);

  const isValidTotal = Math.abs(totalWeight - 100) < 0.01;

  // Handlers for editing grade weights
  const handleEdit = (gradeWeight: GradeWeight) => {
    setEditingId(gradeWeight.id);
    setEditedName(gradeWeight.name);
    setEditedWeight(gradeWeight.weightPercent?.toString() || "0");
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditedName("");
    setEditedWeight("");
  };

  const handleSave = async (gradeWeightId: string) => {
    setIsSaving(true);
    try {
      await updateGradeWeight(gradeWeightId, {
        name: editedName,
        weightPercent: parseFloat(editedWeight),
      });
      setEditingId(null);
      setEditedName("");
      setEditedWeight("");
    } catch (error) {
      console.error("Failed to update grade weight:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (gradeWeightId: string) => {
    if (!confirm("Are you sure you want to delete this grade weight?")) {
      return;
    }
    setIsSaving(true);
    try {
      await deleteGradeWeight(gradeWeightId);
    } catch (error) {
      console.error("Failed to delete grade weight:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNew = () => {
    setIsAdding(true);
    setNewName("");
    setNewWeight("");
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewName("");
    setNewWeight("");
  };

  const handleSaveNew = async () => {
    if (!newName.trim() || !newWeight) {
      return;
    }
    setIsSaving(true);
    try {
      await createGradeWeight({
        courseId: course.id,
        name: newName,
        weightPercent: String(parseFloat(newWeight)),
      });
      setIsAdding(false);
      setNewName("");
      setNewWeight("");
    } catch (error) {
      console.error("Failed to create grade weight:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 lg:sticky lg:top-6">
      {/* Widget A: Grade Weights */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Grade Weights
          </CardTitle>
          <Badge
            variant={isValidTotal ? "default" : "destructive"}
            className="text-xs"
          >
            Total: {totalWeight.toFixed(1)}%
          </Badge>
        </CardHeader>
        <CardContent>
          {course.grade_weights.length === 0 && !isAdding ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              No grade weights defined yet.
            </div>
          ) : null}
          {(course.grade_weights.length > 0 || isAdding) && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-right text-xs">Weight</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {course.grade_weights.map((weight) => (
                    <TableRow key={weight.id}>
                      <TableCell className="font-medium text-xs py-2">
                        {editingId === weight.id ? (
                          <Input
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            className="h-7 text-xs"
                            disabled={isSaving}
                          />
                        ) : (
                          weight.name
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs py-2">
                        {editingId === weight.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              value={editedWeight}
                              onChange={(e) => setEditedWeight(e.target.value)}
                              className="h-7 text-xs w-24 text-right"
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              disabled={isSaving}
                            />
                            <span className="text-xs">%</span>
                          </div>
                        ) : (
                          `${parseFloat(
                            weight.weightPercent?.toString() || "0",
                          ).toFixed(1)}%`
                        )}
                      </TableCell>
                      <TableCell className="text-right py-2">
                        {editingId === weight.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => handleSave(weight.id)}
                              disabled={isSaving}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={handleCancel}
                              disabled={isSaving}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => handleEdit(weight)}
                              disabled={isSaving}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => handleDelete(weight.id)}
                              disabled={isSaving}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {isAdding && (
                    <TableRow>
                      <TableCell className="font-medium text-xs py-2">
                        <Input
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="h-7 text-xs"
                          placeholder="Category name"
                          disabled={isSaving}
                          autoFocus
                        />
                      </TableCell>
                      <TableCell className="text-right text-xs py-2">
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            value={newWeight}
                            onChange={(e) => setNewWeight(e.target.value)}
                            className="h-7 text-xs w-24 text-right"
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            placeholder="0"
                            disabled={isSaving}
                          />
                          <span className="text-xs">%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={handleSaveNew}
                            disabled={isSaving || !newName.trim() || !newWeight}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={handleCancelAdd}
                            disabled={isSaving}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {!isValidTotal && (
                <div className="mt-3 text-xs text-destructive">
                  ⚠️ Warning: Grade weights do not add up to 100%
                </div>
              )}
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3"
            onClick={handleAddNew}
            disabled={isSaving || isAdding}
          >
            <Plus className="h-3 w-3 mr-2" />
            Add Grade Weight
          </Button>
        </CardContent>
      </Card>

      {/* Widget C: What-If Calculator */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            What-If Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>If I average...</span>
              <span className="font-bold">{whatIfScore[0]}%</span>
            </div>
            <Slider
              value={whatIfScore}
              onValueChange={setWhatIfScore}
              max={100}
              step={1}
              className="py-2"
            />
            <p className="text-xs text-muted-foreground">
              ...on remaining tasks
            </p>
          </div>

          <div className="pt-4 border-t">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Final Grade</p>
              <div className="text-4xl font-bold tracking-tight">
                {projectedGrade.toFixed(1)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
