import React, { useState, useEffect } from 'react';
import { useUserData } from '../../contexts/UserDataContext';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { Clock, Check, Edit, Plus, Minus, X, Search } from 'lucide-react';
import { format, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function WorkoutScreen() {
  const { currentWorkout, setCurrentWorkout, saveWorkout, calculateTotalWeight } = useUserData();
  const navigate = useNavigate();
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const [workoutRating, setWorkoutRating] = useState(8);
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [showWorkoutComplete, setShowWorkoutComplete] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [availableExercises, setAvailableExercises] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

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

  const loadAvailableExercises = async () => {
    try {
      const exercisesQuery = query(
        collection(db, 'exercises'),
        where('focusAreas', 'array-contains', currentWorkout.focusArea),
        orderBy('name')
      );
      const exercisesSnapshot = await getDocs(exercisesQuery);
      
      const exercises = exercisesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setAvailableExercises(exercises);
    } catch (error) {
      console.error('Error loading exercises:', error);
      setAvailableExercises([]);
    }
  };

  useEffect(() => {
    if (showAddExercise) {
      loadAvailableExercises();
    }
  }, [showAddExercise]);

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

  const addSetToExercise = (exerciseIndex) => {
    const updatedWorkout = { ...currentWorkout };
    const exercise = updatedWorkout.exercises[exerciseIndex];
    
    const newSet = exercise.isCardio ? {
      distance: '',
      floorsClimbed: '',
      weightedVest: '',
      duration: '',
      completed: false
    } : {
      weight: '',
      reps: '',
      completed: false
    };
    
    updatedWorkout.exercises[exerciseIndex].sets.push(newSet);
    setCurrentWorkout(updatedWorkout);
  };

  const removeSetFromExercise = (exerciseIndex, setIndex) => {
    const updatedWorkout = { ...currentWorkout };
    if (updatedWorkout.exercises[exerciseIndex].sets.length > 1) {
      updatedWorkout.exercises[exerciseIndex].sets.splice(setIndex, 1);
      setCurrentWorkout(updatedWorkout);
    }
  };

  const addExerciseToWorkout = (exercise) => {
    const isCardio = exercise.category === 'cardio' || exercise.focusAreas.includes('Cardio');
    
    const newExercise = {
      id: Date.now(),
      name: exercise.name,
      category: exercise.category,
      focusAreas: exercise.focusAreas,
      isCardio: isCardio,
      sets: isCardio ? [
        { distance: '', floorsClimbed: '', weightedVest: '', duration: '', completed: false },
        { distance: '', floorsClimbed: '', weightedVest: '', duration: '', completed: false },
        { distance: '', floorsClimbed: '', weightedVest: '', duration: '', completed: false },
        { distance: '', floorsClimbed: '', weightedVest: '', duration: '', completed: false }
      ] : [
        { weight: '', reps: '', completed: false },
        { weight: '', reps: '', completed: false },
        { weight: '', reps: '', completed: false },
        { weight: '', reps: '', completed: false }
      ]
    };
    
    const updatedWorkout = { ...currentWorkout };
    updatedWorkout.exercises.push(newExercise);
    setCurrentWorkout(updatedWorkout);
    setShowAddExercise(false);
  };

  const removeExerciseFromWorkout = (exerciseIndex) => {
    if (confirm('Remove this exercise from the workout?')) {
      const updatedWorkout = { ...currentWorkout };
      updatedWorkout.exercises.splice(exerciseIndex, 1);
      
      // Adjust current exercise index if needed
      if (currentExerciseIndex >= updatedWorkout.exercises.length && updatedWorkout.exercises.length > 0) {
        setCurrentExerciseIndex(updatedWorkout.exercises.length - 1);
      } else if (updatedWorkout.exercises.length === 0) {
        setShowWorkoutComplete(true);
      }
      
      setCurrentWorkout(updatedWorkout);
    }
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

  // Process exercises to ensure we have the actual values
  const processedExercises = currentWorkout.exercises.map(exercise => ({
    ...exercise,
    sets: exercise.sets.map(set => ({
      ...set,
      // For regular exercises, use actual values or fall back to planned values
      weight: set.actualWeight || set.weight || '',
      reps: set.actualReps || set.reps || '',
      // For cardio exercises
      distance: set.actualDistance || set.distance || '',
      duration: set.actualDuration || set.duration || '',
      floorsClimbed: set.actualFloorsClimbed || set.floorsClimbed || '',
      weightedVest: set.actualWeightedVest || set.weightedVest || ''
    }))
  }));

  const completedWorkout = {
    ...currentWorkout,
    exercises: processedExercises,
    endTime: new Date(),
    duration: differenceInMinutes(new Date(), currentWorkout.startTime),
    rating: workoutRating,
    notes: workoutNotes,
    totalWeight: calculateTotalWeight(processedExercises),
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
  
  const filteredExercises = availableExercises.filter(exercise =>
    exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !currentWorkout.exercises.some(ex => ex.name === exercise.name)
  );

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

  if (showAddExercise) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-secondary-900">Add Exercise</h2>
            <button
              onClick={() => setShowAddExercise(false)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <Input
            placeholder="🔍 Search exercises..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4"
          />
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {filteredExercises.map((exercise) => (
              <div key={exercise.id} className="border-2 border-secondary-200 rounded-lg bg-white p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium text-secondary-900">{exercise.name}</div>
                    <div className="text-xs text-secondary-500 capitalize">
                      {exercise.category}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {exercise.focusAreas?.slice(0, 2).map(area => (
                        <span 
                          key={area}
                          className="text-xs bg-primary-100 text-primary-700 px-1 py-0.5 rounded"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => addExerciseToWorkout(exercise)}>
                    + Add
                  </Button>
                </div>
              </div>
            ))}
            
            {filteredExercises.length === 0 && (
              <div className="text-center text-secondary-500 py-4">
                {searchTerm ? `No exercises found matching "${searchTerm}"` : 'All exercises already added'}
              </div>
            )}
          </div>
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
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={() => setShowAddExercise(true)}
              className="mt-1"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Exercise
            </Button>
          </div>
        </div>
      </Card>

      {/* Current Exercise */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-secondary-900">
            {currentExercise.name}
            {currentExercise.isCardio && (
              <span className="ml-2 text-sm bg-green-100 text-green-700 px-2 py-1 rounded">
                Cardio
              </span>
            )}
          </h2>
          <button
            onClick={() => removeExerciseFromWorkout(currentExerciseIndex)}
            className="p-1 text-red-600 hover:bg-red-100 rounded"
            title="Remove exercise"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="space-y-4">
          {currentExercise.sets.map((set, setIndex) => (
            <div key={setIndex} className="border-2 border-secondary-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm text-secondary-600">
                  Set {setIndex + 1}
                  {/* Show planned values if they exist */}
                  {!currentExercise.isCardio && set.weight && set.reps && (
                    <span className="text-primary-600 ml-2">
                      (Planned: {set.weight} × {set.reps})
                    </span>
                  )}
                </div>
                {currentExercise.sets.length > 1 && (
                  <button
                    onClick={() => removeSetFromExercise(currentExerciseIndex, setIndex)}
                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                    title="Remove set"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                )}
              </div>
              
              {currentExercise.isCardio ? (
                // Cardio Exercise Logging
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Distance (mi)"
                      value={set.actualDistance || set.distance || ''}
                      onChange={(e) => updateSet(currentExerciseIndex, setIndex, 'actualDistance', e.target.value)}
                    />
                    <Input
                      placeholder="Duration (min)"
                      value={set.actualDuration || set.duration || ''}
                      onChange={(e) => updateSet(currentExerciseIndex, setIndex, 'actualDuration', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Floors Climbed"
                      value={set.actualFloorsClimbed || set.floorsClimbed || ''}
                      onChange={(e) => updateSet(currentExerciseIndex, setIndex, 'actualFloorsClimbed', e.target.value)}
                    />
                    <Input
                      placeholder="Weighted Vest (lbs)"
                      value={set.actualWeightedVest || set.weightedVest || ''}
                      onChange={(e) => updateSet(currentExerciseIndex, setIndex, 'actualWeightedVest', e.target.value)}
                    />
                  </div>
                  <div className="flex justify-center">
                    <Button
                      variant={set.completed ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => completeSet(currentExerciseIndex, setIndex)}
                      disabled={set.completed}
                    >
                      {set.completed ? '✓ Completed' : 'Complete Set'}
                    </Button>
                  </div>
                </div>
              ) : (
                // Regular Exercise Logging
                <div className="flex items-center gap-3">
                  <Input
                    placeholder="Weight"
                    value={set.actualWeight || set.weight || ''}
                    onChange={(e) => updateSet(currentExerciseIndex, setIndex, 'actualWeight', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Reps"
                    value={set.actualReps || set.reps || ''}
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
              )}
            </div>
          ))}
        </div>
        
        <Button 
          onClick={() => addSetToExercise(currentExerciseIndex)}
          variant="secondary"
          className="w-full mt-4 flex items-center justify-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Set
        </Button>
        
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
