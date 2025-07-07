import React, { useState } from 'react';
import { useUserData } from '../../contexts/UserDataContext';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { Plus, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const EXERCISE_DATABASE = {
  push: [
    { name: 'Bench Press', category: 'compound' },
    { name: 'Push-ups', category: 'bodyweight' },
    { name: 'Overhead Press', category: 'compound' },
    { name: 'Dumbbell Press', category: 'isolation' },
    { name: 'Tricep Dips', category: 'bodyweight' },
    { name: 'Lateral Raises', category: 'isolation' }
  ],
  pull: [
    { name: 'Pull-ups', category: 'bodyweight' },
    { name: 'Lat Pulldown', category: 'compound' },
    { name: 'Barbell Rows', category: 'compound' },
    { name: 'Cable Rows', category: 'compound' },
    { name: 'Face Pulls', category: 'isolation' },
    { name: 'Bicep Curls', category: 'isolation' }
  ],
  legs: [
    { name: 'Squat', category: 'compound' },
    { name: 'Deadlift', category: 'compound' },
    { name: 'Leg Press', category: 'compound' },
    { name: 'Lunges', category: 'bodyweight' },
    { name: 'Calf Raises', category: 'isolation' },
    { name: 'Leg Curls', category: 'isolation' }
  ]
};

export default function PlanScreen() {
  const { setCurrentWorkout } = useUserData();
  const navigate = useNavigate();
  const [workoutPlan, setWorkoutPlan] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'hypertrophy',
    focusArea: 'pull',
    motivation: 7,
    notes: '',
    exercises: []
  });
  const [showExerciseSelection, setShowExerciseSelection] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [customExercise, setCustomExercise] = useState('');

  const addExerciseToWorkout = (exercise) => {
    const newExercise = {
      id: Date.now(),
      name: exercise.name,
      category: exercise.category,
      sets: [
        { weight: '', reps: '', completed: false },
        { weight: '', reps: '', completed: false },
        { weight: '', reps: '', completed: false }
      ]
    };
    
    setWorkoutPlan(prev => ({
      ...prev,
      exercises: [...prev.exercises, newExercise]
    }));
    setShowExerciseSelection(false);
  };

  const addCustomExercise = () => {
    if (customExercise.trim()) {
      addExerciseToWorkout({ name: customExercise, category: 'custom' });
      setCustomExercise('');
    }
  };

  const removeExercise = (exerciseId) => {
    setWorkoutPlan(prev => ({
      ...prev,
      exercises: prev.exercises.filter(ex => ex.id !== exerciseId)
    }));
  };

  const updateExerciseSets = (exerciseId, sets) => {
    setWorkoutPlan(prev => ({
      ...prev,
      exercises: prev.exercises.map(ex => 
        ex.id === exerciseId ? { ...ex, sets } : ex
      )
    }));
  };

  const startWorkout = () => {
    if (workoutPlan.exercises.length === 0) {
      alert('Please add at least one exercise to your workout plan.');
      return;
    }
    
    setCurrentWorkout({
      ...workoutPlan,
      startTime: new Date(),
      status: 'active'
    });
    navigate('/workout');
  };

  if (showExerciseSelection) {
    const exercises = EXERCISE_DATABASE[workoutPlan.focusArea] || [];
    
    return (
      <div className="p-4 max-w-md mx-auto">
        <Card className="p-6">
          <h2 className="text-xl font-bold text-secondary-900 mb-6 text-center">Add Exercises</h2>
          
          <Input
            placeholder="🔍 Search exercises..."
            className="mb-4"
          />
          
          <div className="text-sm text-secondary-600 mb-3 capitalize">
            {workoutPlan.focusArea} Exercises
          </div>
          
          <div className="space-y-3 mb-6">
            {exercises.map((exercise, index) => (
              <div key={index} className="flex justify-between items-center p-3 border-2 border-secondary-200 rounded-lg bg-white">
                <div className="font-medium text-secondary-900">{exercise.name}</div>
                <Button size="sm" onClick={() => addExerciseToWorkout(exercise)}>
                  + Add
                </Button>
              </div>
            ))}
          </div>
          
          <div className="text-sm text-secondary-600 mb-3">Custom Exercise</div>
          <div className="flex gap-3">
            <Input
              placeholder="Exercise name"
              value={customExercise}
              onChange={(e) => setCustomExercise(e.target.value)}
              className="flex-1"
            />
            <Button onClick={addCustomExercise} disabled={!customExercise.trim()}>
              Add
            </Button>
          </div>
          
          <Button 
            variant="secondary" 
            className="w-full mt-4"
            onClick={() => setShowExerciseSelection(false)}
          >
            Done
          </Button>
        </Card>
      </div>
    );
  }

  if (selectedExercise) {
    const exercise = workoutPlan.exercises.find(ex => ex.id === selectedExercise);
    
    return (
      <div className="p-4 max-w-md mx-auto">
        <Card className="p-6">
          <h2 className="text-xl font-bold text-secondary-900 mb-6 text-center">
            {exercise.name}
          </h2>
          
          <div className="text-sm text-secondary-600 mb-3">Planned Sets</div>
          
          <div className="space-y-3">
            {exercise.sets.map((set, index) => (
              <div key={index} className="flex items-center gap-3 p-3 border-2 border-secondary-200 rounded-lg">
                <span className="text-sm font-medium">Set {index + 1}:</span>
                <Input
                  placeholder="Weight"
                  value={set.weight}
                  onChange={(e) => {
                    const newSets = [...exercise.sets];
                    newSets[index].weight = e.target.value;
                    updateExerciseSets(exercise.id, newSets);
                  }}
                  className="flex-1"
                />
                <Input
                  placeholder="Reps"
                  value={set.reps}
                  onChange={(e) => {
                    const newSets = [...exercise.sets];
                    newSets[index].reps = e.target.value;
                    updateExerciseSets(exercise.id, newSets);
                  }}
                  className="flex-1"
                />
              </div>
            ))}
          </div>
          
          <Button 
            className="w-full mt-4"
            onClick={() => {
              const newSets = [...exercise.sets, { weight: '', reps: '', completed: false }];
              updateExerciseSets(exercise.id, newSets);
            }}
          >
            + Add Set
          </Button>
          
          <Button 
            variant="secondary" 
            className="w-full mt-3"
            onClick={() => setSelectedExercise(null)}
          >
            Save Exercise
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-secondary-900">Plan Workout</h1>
      
      <Card className="p-6">
        <Input
          type="date"
          value={workoutPlan.date}
          onChange={(e) => setWorkoutPlan(prev => ({ ...prev, date: e.target.value }))}
          className="mb-4"
        />
        
        <div className="text-sm text-secondary-600 mb-3">Workout Type</div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Button
            variant={workoutPlan.type === 'hypertrophy' ? 'primary' : 'outline'}
            onClick={() => setWorkoutPlan(prev => ({ ...prev, type: 'hypertrophy' }))}
          >
            Hypertrophy
          </Button>
          <Button
            variant={workoutPlan.type === 'power' ? 'primary' : 'outline'}
            onClick={() => setWorkoutPlan(prev => ({ ...prev, type: 'power' }))}
          >
            Power
          </Button>
        </div>
        
        <div className="text-sm text-secondary-600 mb-3">Focus Area</div>
        <select
          className="w-full px-4 py-3 border-2 border-primary-300 rounded-lg focus:border-primary-500 focus:outline-none mb-4"
          value={workoutPlan.focusArea}
          onChange={(e) => setWorkoutPlan(prev => ({ ...prev, focusArea: e.target.value }))}
        >
          <option value="pull">Pull</option>
          <option value="push">Push</option>
          <option value="legs">Legs</option>
        </select>
        
        <div className="text-sm text-secondary-600 mb-3">Motivation Level</div>
        <div className="flex items-center gap-2 mb-4">
          {[1,2,3,4,5,6,7,8,9,10].map(num => (
            <button
              key={num}
              onClick={() => setWorkoutPlan(prev => ({ ...prev, motivation: num }))}
              className={`w-8 h-8 rounded ${
                num <= workoutPlan.motivation 
                  ? 'bg-yellow-400 text-yellow-900' 
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              ⭐
            </button>
          ))}
          <span className="ml-2 text-sm font-medium">{workoutPlan.motivation}/10</span>
        </div>
        
        <div className="text-sm text-secondary-600 mb-3">Notes</div>
        <Input
          placeholder="Feeling strong today!"
          value={workoutPlan.notes}
          onChange={(e) => setWorkoutPlan(prev => ({ ...prev, notes: e.target.value }))}
          className="mb-4"
        />
        
        <Button 
          onClick={() => setShowExerciseSelection(true)}
          className="w-full flex items-center justify-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Exercises
        </Button>
      </Card>

      {workoutPlan.exercises.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-secondary-900 mb-4">Planned Exercises</h3>
          <div className="space-y-3">
            {workoutPlan.exercises.map((exercise) => (
              <div 
                key={exercise.id} 
                className="flex justify-between items-center p-3 border-2 border-secondary-200 rounded-lg bg-white cursor-pointer hover:bg-gray-50"
                onClick={() => setSelectedExercise(exercise.id)}
              >
                <div>
                  <div className="font-medium text-secondary-900">{exercise.name}</div>
                  <div className="text-sm text-secondary-600">{exercise.sets.length} sets planned</div>
                </div>
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeExercise(exercise.id);
                  }}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
          
          <Button onClick={startWorkout} className="w-full mt-4">
            Start Workout
          </Button>
        </Card>
      )}
    </div>
  );
}
