"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

type WorkoutExerciseStep = {
  id: string;
  name: string;
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
};

type WorkoutPlayerProps = {
  steps: WorkoutExerciseStep[];
};

export function WorkoutPlayer({ steps }: WorkoutPlayerProps) {
  const [index, setIndex] = React.useState(0);

  if (!steps.length) {
    return (
      <div className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
        No exercises in this workout.
      </div>
    );
  }

  const current = steps[index];

  return (
    <div className="space-y-3 rounded-md border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">
            Step {index + 1} of {steps.length}
          </h2>
          <p className="text-lg font-semibold">{current.name}</p>
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        {current.sets && current.reps && (
          <p>
            {current.sets} sets × {current.reps} reps
          </p>
        )}
        {current.duration && <p>Duration: {current.duration} sec</p>}
      </div>
      <div className="flex items-center justify-between">
        <Button
          size="sm"
          variant="outline"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          Previous
        </Button>
        <Button
          size="sm"
          onClick={() =>
            setIndex((i) => (i + 1 < steps.length ? i + 1 : i))
          }
          disabled={index + 1 >= steps.length}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

