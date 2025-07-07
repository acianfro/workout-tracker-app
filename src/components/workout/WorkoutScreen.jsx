import React, { useState, useEffect } from 'react';
import { useUserData } from '../../contexts/UserDataContext';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { Clock, Check, Edit } from 'lucide-react';
import { format, differenceInMinutes, differenceInSeconds } from 'date-fns';

export default function WorkoutScreen() {
  const { currentWorkout, setCurrentWorkout, saveWorkout, calculateTotalWeight } = useUserData();
  const navigate = useNavigate();
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const [workoutRating, setWorkoutRating] = useState(8);
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [showWorkoutComplete, setShowWorkoutComplete] = useState(false);

  useEffect(() => {
    if (!currentWorkout) {
      navigate('/plan');
      return;
    }

    // Update elapsed time every second
    const timer = setInterval(() => {
      if (currentWorkout?.startTime) {
        const minutes = differenceInMinutes(new Date(), currentWorkout.startTime);
        const seconds = differenceInSeconds(new Date(), currentWorkout.startTime) % 60;
        setElapsedTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentWorkout, navigate]);

  const updateSet = (exerciseIndex, setIndex, field, value) => {
    const updatedWorkout = { ...currentWorkout };
    updatedWorkout.exercises[exerciseIndex].sets[setIndex][field] = value;
    setCurrentWorkout(updatedWorkout);
  };

  const completeSet = (exerciseIndex, setIndex) => {
    const updatedWorkout = { ...currentWorkout };
    updatedWorkout.exercises[exerciseIndex].sets[setIndex].completed = true;
    setCurrentWorkout(updatedWorkout);
  };

  const nextExercise = () => {
    if (currentExerciseIndex < currentWorkout.exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    } else {
      setShowWorkoutComplete(true);
    }
  };

  const finishWorkout = async () => {
    if (!currentWorkout) return;

    const completedWorkout = {
      ...currentWorkout,
      endTime: new Date(),
      duration: differenceInMinutes(new Date(), currentWorkout.startTime),
      rating: workoutRating,
      notes: workoutNotes,
      totalWeight: calculateTotalWeight(currentWorkout.exercises),
      status: 'completed'
    };

    try {
      await saveWorkout(completedWorkout);
      setCurrentWorkout(null);
      navigate('/progress');
    } catch (error) {
      console.error('Error saving workout:', error);
    }
  };

  if (!currentWorkout) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <Card className="p-6 text-center">
          <h2 className="text-xl font-bold text-secondary-900 mb-4">No Active Workout</h2>
          <p className="text-secondary-600 mb-6">Plan a workout to get started!</p>
          <Button onClick={() => navigate('/plan')}>
            Plan Workout
          </Button>
        </Card>
      </div>
    );
  }

  if (showWorkoutComplete) {
    const totalWeight = calculateTotalWeight(currentWorkout.exercises);
    const duration = differenceInMinutes(new Date(), currentWorkout.startTime);

    return (
      <div className="p-4 max-w-md mx-auto">
        <Card className="p-6 text-center">
          <h2 className="text-xl font-bold text-secondary-900 mb-4">🎉 Workout Complete!</h2>
          
          <div className="text-lg font-medium text-secondary-900 mb-6">
            ⏱️ Total time: {duration} minutes
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-primary-50 border-2 border-primary-200 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-secondary-900">
                {totalWeight.toLocaleString()}
              </div>
              <div className="text-sm text-secondary-600">lbs lifted</div>
            </div>
            <div className="bg-primary-50 border-2 border-primary-200 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-secondary-900">
                {currentWorkout.exercises.length}
              </div>
              <div className="text-sm text-secondary-600">exercises</div>
            </div>
          </div>
          
          <div className="text-sm text-secondary-600 mb-3">Rate your workout</div>
          <div className="flex items-center justify-center gap-2 mb-4">
            {[1,2,3,4,5,6,7,8,9,10].map(num => (
              <button
                key={num}
                onClick={() => setWorkoutRating(num)}
                className={`w-8 h-8 rounded ${
                  num <= workoutRating 
                    ? 'bg-yellow-400 text-yellow-900' 
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                ⭐
              </button>
            ))}
            <span className="ml-2 text-sm font-medium">{workoutRating}/10</span>
          </div>
          
          <Input
            placeholder="Workout notes..."
            value={workoutNotes}
            onChange={(e) => setWorkoutNotes(e.target.value)}
            className="mb-6"
          />
          
          <div className="flex gap-3">
            <Button onClick={finishWorkout} className="flex-1">
              Save Workout
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => setShowWorkoutComplete(false)}
              className="flex-1"
            >
              Continue
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const currentExercise = currentWorkout.exercises[currentExerciseIndex];
  if (!currentExercise) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-secondary-900">⏱️ Active Workout</h1>
            <p className="text-sm text-secondary-600">{elapsedTime} elapsed</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-secondary-600">
              Exercise {currentExerciseIndex + 1} of {currentWorkout.exercises.length}
            </div>
          </div>
        </div>
      </Card>

      {/* Current Exercise */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-secondary-900 mb-4 text-center">
          {currentExercise.name}
        </h2>
        
        <div className="space-y-4">
          {currentExercise.sets.map((set, setIndex) => (
            <div key={setIndex} className="border-2 border-secondary-200 rounded-lg p-4">
              <div className="text-sm text-secondary-600 mb-2">
                Set {setIndex + 1} - Planned: {set.weight || 'BW'} × {set.reps || '--'}
              </div>
              
              <div className="flex items-center gap-3">
                <Input
                  placeholder="Weight"
                  value={set.actualWeight || ''}
                  onChange={(e) => updateSet(currentExerciseIndex, setIndex, 'actualWeight', e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Reps"
                  value={set.actualReps || ''}
                  onChange={(e) => updateSet(currentExerciseIndex, setIndex, 'actualReps', e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant={set.completed ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => completeSet(currentExerciseIndex, setIndex)}
                  disabled={set.completed}
                >
                  {set.completed ? <Check className="h-4 w-4" /> : '✓'}
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        <Input
          placeholder="Exercise notes..."
          value={currentExercise.notes || ''}
          onChange={(e) => {
            const updatedWorkout = { ...currentWorkout };
            updatedWorkout.exercises[currentExerciseIndex].notes = e.target.value;
            setCurrentWorkout(updatedWorkout);
          }}
          className="mt-4"
        />
        
        <Button onClick={nextExercise} className="w-full mt-4">
          {currentExerciseIndex < currentWorkout.exercises.length - 1 ? 'Next Exercise' : 'Finish Workout'}
        </Button>
      </Card>

      {/* Exercise Navigation */}
      <Card className="p-4">
        <div className="text-sm text-secondary-600 mb-3">Exercises</div>
        <div className="flex gap-2 overflow-x-auto">
          {currentWorkout.exercises.map((exercise, index) => (
            <button
              key={exercise.id}
              onClick={() => setCurrentExerciseIndex(index)}
              className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium ${
                index === currentExerciseIndex
                  ? 'bg-primary-500 text-white'
                  : index < currentExerciseIndex
                  ? 'bg-green-500 text-white'
                  : 'bg-secondary-200 text-secondary-700'
              }`}
            >
              {exercise.name}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
