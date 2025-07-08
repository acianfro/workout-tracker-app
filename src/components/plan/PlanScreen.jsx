import React, { useState, useEffect } from 'react';
import { useUserData } from '../../contexts/UserDataContext';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { Plus, Calendar, X } from 'lucide-react';
import { format } from 'date-fns';
import { collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';

// Default exercise database (fallback)
const DEFAULT_EXERCISES = {
  push: [
    { name: 'Bench Press', category: 'compound', focusArea: 'push' },
    { name: 'Push-ups', category: 'bodyweight', focusArea: 'push' },
    { name: 'Overhead Press', category: 'compound', focusArea: 'push' },
    { name: 'Dumbbell Press', category: 'isolation', focusArea: 'push' },
    { name: 'Tricep Dips', category: 'bodyweight', focusArea: 'push' },
    { name: 'Lateral Raises', category: 'isolation', focusArea: 'push' }
  ],
  pull: [
    { name: 'Pull-ups', category: 'bodyweight', focusArea: 'pull' },
    { name: 'Lat Pulldown', category: 'compound', focusArea: 'pull' },
    { name: 'Barbell Rows', category: 'compound', focusArea: 'pull' },
    { name: 'Cable Rows', category: 'compound', focusArea: 'pull' },
    { name: 'Face Pulls', category: 'isolation', focusArea: 'pull' },
    { name: 'Bicep Curls', category: 'isolation', focusArea: 'pull' }
  ],
  legs: [
    { name: 'Squat', category: 'compound', focusArea: 'legs' },
    { name: 'Deadlift', category: 'compound', focusArea: 'legs' },
    { name: 'Leg Press', category: 'compound', focusArea: 'legs' },
    { name: 'Lunges', category: 'bodyweight', focusArea: 'legs' },
    { name: 'Calf Raises', category: 'isolation', focusArea: 'legs' },
    { name: 'Leg Curls', category: 'isolation', focusArea: 'legs' }
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
  const [showAddNewExercise, setShowAddNewExercise] = useState(false);
  const [availableExercises, setAvailableExercises] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newExercise, setNewExercise] = useState({
    name: '',
    category: 'compound',
    focusArea: 'pull',
    description: '',
    instructions: ''
  });

  // Load exercises when component mounts or focus area changes
  useEffect(() => {
    if (showExerciseSelection) {
      loadExercises();
    }
  }, [showExerciseSelection, workoutPlan.focusArea]);

  const loadExercises = async () => {
    try {
      // Load exercises from Firestore
      const exercisesQuery = query(
        collection(db, 'exercises'),
        where('focusArea', '==', workoutPlan.focusArea),
        orderBy('name')
      );
      const exercisesSnapshot = await getDocs(exercisesQuery);
      
      if (!exercisesSnapshot.empty) {
        const firestoreExercises = exercisesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAvailableExercises(firestoreExercises);
      } else {
        // Fallback to default exercises if none in Firestore
        const defaultExercises = DEFAULT_EXERCISES[workoutPlan.focusArea] || [];
        setAvailableExercises(defaultExercises);
        
        // Optionally seed the database with default exercises
        await seedDefaultExercises(workoutPlan.focusArea, defaultExercises);
      }
    } catch (error) {
      console.error('Error loading exercises:', error);
      // Fallback to default exercises
      const defaultExercises = DEFAULT_EXERCISES[workoutPlan.focusArea] || [];
      setAvailableExercises(defaultExercises);
    }
  };

  const seedDefaultExercises = async (focusArea, exercises) => {
    try {
      for (const exercise of exercises) {
        await addDoc(collection(db, 'exercises'), exercise);
      }
      console.log(`Seeded ${exercises.length} exercises for ${focusArea}`);
    } catch (error) {
      console.error('Error seeding exercises:', error);
    }
  };

  const handleAddNewExercise = async () => {
    if (!newExercise.name.trim()) {
      alert('Please enter an exercise name');
      return;
    }

    try {
      const exerciseData = {
        ...newExercise,
        name: newExercise.name.trim(),
        focusArea: workoutPlan.focusArea, // Use current focus area
        createdAt: new Date(),
        isCustom: true
      };

      const docRef = await addDoc(collection(db, 'exercises'), exerciseData);
      console.log('New exercise added with ID:', docRef.id);

      // Add to local state immediately
      const newExerciseWithId = { id: docRef.id, ...exerciseData };
      setAvailableExercises(prev => [...prev, newExerciseWithId].sort((a, b) => a.name.localeCompare(b.name)));

      // Reset form
      setNewExercise({
        name: '',
        category: 'compound',
        focusArea: workoutPlan.focusArea,
        description: '',
        instructions: ''
      });
      
      setShowAddNewExercise(false);
      alert('Exercise added successfully!');
    } catch (error) {
      console.error('Error adding new exercise:', error);
      alert('Error adding exercise: ' + error.message);
    }
  };

  const addExerciseToWorkout = (exercise) => {
    const newExercise = {
      id: Date.now(),
      name: exercise.name,
      category: exercise.category,
      focusArea: exercise.focusArea,
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

  // Filter exercises based on search term
  const filteredExercises = availableExercises.filter(exercise =>
    exercise.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (showAddNewExercise) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-secondary-900">Add New Exercise</h2>
            <button
              onClick={() => setShowAddNewExercise(false)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-secondary-600 mb-2 block">Exercise Name *</label>
              <Input
                placeholder="e.g., Bulgarian Split Squats"
                value={newExercise.name}
                onChange={(e) => setNewExercise(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            
            <div>
              <label className="text-sm text-secondary-600 mb-2 block">Exercise Type *</label>
              <select
                className="w-full px-4 py-3 border-2 border-primary-300 rounded-lg focus:border-primary-500 focus:outline-none"
                value={newExercise.category}
                onChange={(e) => setNewExercise(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="compound">Compound (Multi-joint)</option>
                <option value="isolation">Isolation (Single-joint)</option>
                <option value="bodyweight">Bodyweight</option>
                <option value="cardio">Cardio</option>
                <option value="flexibility">Flexibility/Mobility</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm text-secondary-600 mb-2 block">Focus Area</label>
              <select
                className="w-full px-4 py-3 border-2 border-primary-300 rounded-lg focus:border-primary-500 focus:outline-none"
                value={newExercise.focusArea}
                onChange={(e) => setNewExercise(prev => ({ ...prev, focusArea: e.target.value }))}
              >
                <option value="push">Push (Chest, Shoulders, Triceps)</option>
                <option value="pull">Pull (Back, Biceps)</option>
                <option value="legs">Legs (Quads, Hamstrings, Glutes, Calves)</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm text-secondary-600 mb-2 block">Description (Optional)</label>
              <Input
                placeholder="Brief description of the exercise"
                value={newExercise.description}
                onChange={(e) => setNewExercise(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="text-sm text-secondary-600 mb-2 block">Instructions (Optional)</label>
              <textarea
                className="w-full px-4 py-3 border-2 border-primary-300 rounded-lg focus:border-primary-500 focus:outline-none"
                placeholder="How to perform this exercise..."
                rows="3"
                value={newExercise.instructions}
                onChange={(e) => setNewExercise(prev => ({ ...prev, instructions: e.target.value }))}
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button onClick={handleAddNewExercise} className="flex-1">
                Add Exercise
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => setShowAddNewExercise(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (showExerciseSelection) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-secondary-900">Add Exercises</h2>
            <button
              onClick={() => setShowExerciseSelection(false)}
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
          
          <div className="text-sm text-secondary-600 mb-3 capitalize">
            {workoutPlan.focusArea} Exercises ({filteredExercises.length})
          </div>
          
          <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
            {filteredExercises.map((exercise, index) => (
              <div key={exercise.id || index} className="flex justify-between items-center p-3 border-2 border-secondary-200 rounded-lg bg-white">
                <div>
                  <div className="font-medium text-secondary-900">{exercise.name}</div>
                  <div className="text-xs text-secondary-500 capitalize">
                    {exercise.category}
                    {exercise.isCustom && ' • Custom'}
                  </div>
                </div>
                <Button size="sm" onClick={() => addExerciseToWorkout(exercise)}>
                  + Add
                </Button>
              </div>
            ))}
            
            {filteredExercises.length === 0 && searchTerm && (
              <div className="text-center text-secondary-500 py-4">
                No exercises found matching "{searchTerm}"
              </div>
            )}
          </div>
          
          <Button 
            onClick={() => setShowAddNewExercise(true)}
            variant="secondary"
            className="w-full flex items-center justify-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Exercise
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
                  <div className="text-sm text-secondary-600">
                    {exercise.sets.length} sets planned • {exercise.category}
                  </div>
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
