import React, { useState, useEffect } from 'react';
import { useUserData } from '../../contexts/UserDataContext';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { Clock, Check, Edit, Plus, Minus, X, Search, Link, ArrowRight } from 'lucide-react';
import { format, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { collection, getDocs, query, where, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function WorkoutScreen() {
  const { currentWorkout, setCurrentWorkout, saveWorkout, calculateTotalWeight } = useUserData();
  const navigate = useNavigate();
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSupersetRound, setCurrentSupersetRound] = useState(1);
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const [workoutRating, setWorkoutRating] = useState(8);
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [showWorkoutComplete, setShowWorkoutComplete] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showAddNewExercise, setShowAddNewExercise] = useState(false);
  const [availableExercises, setAvailableExercises] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newExercise, setNewExercise] = useState({
    name: '',
    category: 'compound',
    focusAreas: [],
    description: '',
    instructions: ''
  });

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
    if (showAddExercise && currentWorkout) {
      loadAvailableExercises();
      setNewExercise(prev => ({
        ...prev,
        focusAreas: [currentWorkout.focusArea]
      }));
    }
  }, [showAddExercise, currentWorkout]);

  // Get current superset info
  const getCurrentSuperset = () => {
    if (!currentWorkout?.supersets) return null;
    
    const currentExercise = currentWorkout.exercises[currentExerciseIndex];
    if (!currentExercise?.supersetId) return null;
    
    return currentWorkout.supersets.find(ss => ss.id === currentExercise.supersetId);
  };

  // Get exercises in current superset
  const getSupersetExercises = (superset) => {
    if (!superset) return [];
    return superset.exerciseIds
      .map(id => currentWorkout.exercises.find(ex => ex.id === id))
      .filter(Boolean);
  };

  // Check if we're in a superset and what position
  const getSupersetPosition = () => {
    const superset = getCurrentSuperset();
    if (!superset) return null;
    
    const currentExercise = currentWorkout.exercises[currentExerciseIndex];
    const position = superset.exerciseIds.indexOf(currentExercise.id);
    const isLastInSuperset = position === superset.exerciseIds.length - 1;
    
    return {
      superset,
      position,
      isLastInSuperset,
      exerciseCount: superset.exerciseIds.length
    };
  };

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
      supersetId: null,
      sets: isCardio ? [
        { distance: '', floorsClimbed: '', weightedVest: '', duration: '', completed: false },
        { distance: '', floorsClimbed: '', weightedVest: '', duration: '', completed: false },
        { distance: '', floorsClimbed: '', weightedVest: '', duration: '', completed: false }
      ] : [
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

  const handleAddNewExercise = async () => {
    if (!newExercise.name.trim()) {
      alert('Please enter an exercise name');
      return;
    }

    if (newExercise.focusAreas.length === 0) {
      alert('Please select at least one focus area');
      return;
    }

    try {
      const exerciseData = {
        ...newExercise,
        name: newExercise.name.trim(),
        focusAreas: newExercise.focusAreas,
        createdAt: new Date(),
        isCustom: true
      };

      const docRef = await addDoc(collection(db, 'exercises'), exerciseData);
      const newExerciseWithId = { id: docRef.id, ...exerciseData };
      setAvailableExercises(prev => [...prev, newExerciseWithId].sort((a, b) => a.name.localeCompare(b.name)));

      setNewExercise({
        name: '',
        category: 'compound',
        focusAreas: [currentWorkout.focusArea],
        description: '',
        instructions: ''
      });
      
      setShowAddNewExercise(false);
      addExerciseToWorkout(newExerciseWithId);
      
      alert('Exercise added to inventory and workout!');
    } catch (error) {
      console.error('Error adding new exercise:', error);
      alert('Error adding exercise: ' + error.message);
    }
  };

  const toggleFocusArea = (focusArea) => {
    setNewExercise(prev => ({
      ...prev,
      focusAreas: prev.focusAreas.includes(focusArea)
        ? prev.focusAreas.filter(area => area !== focusArea)
        : [...prev.focusAreas, focusArea]
    }));
  };

  const removeExerciseFromWorkout = (exerciseIndex) => {
    if (confirm('Remove this exercise from the workout?')) {
      const updatedWorkout = { ...currentWorkout };
      updatedWorkout.exercises.splice(exerciseIndex, 1);
      
      if (currentExerciseIndex >= updatedWorkout.exercises.length && updatedWorkout.exercises.length > 0) {
        setCurrentExerciseIndex(updatedWorkout.exercises.length - 1);
      } else if (updatedWorkout.exercises.length === 0) {
        setShowWorkoutComplete(true);
      }
      
      setCurrentWorkout(updatedWorkout);
    }
  };

  const nextExercise = () => {
    const supersetInfo = getSupersetPosition();
    
    if (supersetInfo) {
      // We're in a superset
      if (supersetInfo.isLastInSuperset) {
        // Completed all exercises in this round of the superset
        if (currentSupersetRound < supersetInfo.superset.rounds) {
          // Move to next round, go back to first exercise in superset
          setCurrentSupersetRound(prev => prev + 1);
          const firstExerciseIndex = currentWorkout.exercises.findIndex(
            ex => ex.id === supersetInfo.superset.exerciseIds[0]
          );
          setCurrentExerciseIndex(firstExerciseIndex);
        } else {
          // Completed all rounds of superset, move to next non-superset exercise
          setCurrentSupersetRound(1);
          const nextIndex = findNextNonSupersetExercise();
          if (nextIndex !== -1) {
            setCurrentExerciseIndex(nextIndex);
          } else {
            setShowWorkoutComplete(true);
          }
        }
      } else {
        // Move to next exercise in current superset round
        const nextExerciseId = supersetInfo.superset.exerciseIds[supersetInfo.position + 1];
        const nextIndex = currentWorkout.exercises.findIndex(ex => ex.id === nextExerciseId);
        setCurrentExerciseIndex(nextIndex);
      }
    } else {
      // Regular exercise, move to next
      if (currentExerciseIndex < currentWorkout.exercises.length - 1) {
        setCurrentExerciseIndex(currentExerciseIndex + 1);
        setCurrentSupersetRound(1); // Reset for potential next superset
      } else {
        setShowWorkoutComplete(true);
      }
    }
  };

  // Find the next exercise that's not part of the current superset
  const findNextNonSupersetExercise = () => {
    const currentSuperset = getCurrentSuperset();
    if (!currentSuperset) return currentExerciseIndex + 1;
    
    for (let i = currentExerciseIndex + 1; i < currentWorkout.exercises.length; i++) {
      const exercise = currentWorkout.exercises[i];
      if (!exercise.supersetId || exercise.supersetId !== currentSuperset.id) {
        return i;
      }
    }
    return -1; // No more exercises
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

  const FOCUS_AREAS = [
    'Back', 'Biceps/Triceps', 'Cardio', 'Chest', 'Legs', 'Pull', 'Push', 'Shoulders'
  ];

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
              <label className="text-sm text-secondary-600 mb-2 block">
                Focus Areas * (Select all that apply)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {FOCUS_AREAS.map(focusArea => (
                  <button
                    key={focusArea}
                    type="button"
                    onClick={() => toggleFocusArea(focusArea)}
                    className={`p-2 text-sm rounded-lg border-2 transition-colors ${
                      newExercise.focusAreas.includes(focusArea)
                        ? 'bg-primary-500 text-white border-primary-500'
                        : 'bg-white text-secondary-700 border-secondary-300 hover:border-primary-300'
                    }`}
                  >
                    {focusArea}
                  </button>
                ))}
              </div>
              <div className="text-xs text-secondary-500 mt-2">
                Selected: {newExercise.focusAreas.join(', ')}
              </div>
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
                Add to Inventory & Workout
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
          
          <div className="text-sm text-secondary-600 mb-4 bg-primary-50 p-3 rounded-lg">
            <strong>Focus Area:</strong> {currentWorkout.focusArea}
            <br />
            Showing exercises that include this focus area
          </div>
          
          <Input
            placeholder="🔍 Search exercises..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4"
          />
          
          <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
            {filteredExercises.map((exercise) => (
              <div key={exercise.id} className="border-2 border-secondary-200 rounded-lg bg-white p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium text-secondary-900">{exercise.name}</div>
                    <div className="text-xs text-secondary-500 capitalize">
                      {exercise.category}
                      {exercise.isCustom && ' • Custom'}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {exercise.focusAreas?.slice(0, 3).map(area => (
                        <span 
                          key={area}
                          className="text-xs bg-primary-100 text-primary-700 px-1 py-0.5 rounded"
                        >
                          {area}
                        </span>
                      ))}
                      {exercise.focusAreas?.length > 3 && (
                        <span className="text-xs text-secondary-500">
                          +{exercise.focusAreas.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => addExerciseToWorkout(exercise)}>
                    + Add
                  </Button>
                </div>
              </div>
            ))}
            
            {filteredExercises.length === 0 && searchTerm && (
              <div className="text-center text-secondary-500 py-4">
                No exercises found matching "{searchTerm}"
              </div>
            )}

            {filteredExercises.length === 0 && !searchTerm && (
              <div className="text-center text-secondary-500 py-4">
                No available exercises for {currentWorkout.focusArea} focus area.
                <br />Create a new exercise below!
              </div>
            )}
          </div>
          
          <Button 
            onClick={() => setShowAddNewExercise(true)}
            variant="secondary"
            className="w-full flex items-center justify-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Exercise to Inventory
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
          
          {currentWorkout.supersets && currentWorkout.supersets.length > 0 && (
            <div className="mb-6 p-3 bg-purple-50 border-2 border-purple-200 rounded-lg">
              <div className="text-sm text-purple-800">
                🔗 Completed {currentWorkout.supersets.length} superset{currentWorkout.supersets.length !== 1 ? 's' : ''}!
              </div>
            </div>
          )}
          
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

  const supersetInfo = getSupersetPosition();

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

      {/* Superset Info - Clear and Prominent */}
      {supersetInfo && (
        <Card className="p-4 bg-purple-50 border-2 border-purple-200">
          <div className="text-center">
            <div className="font-bold text-purple-900 text-lg mb-2">
              🔗 {supersetInfo.superset.name}
            </div>
            <div className="text-purple-700 font-medium text-lg mb-3">
              Round {currentSupersetRound} of {supersetInfo.superset.rounds}
            </div>
            
            {/* Exercise sequence display */}
            <div className="flex items-center justify-center gap-2 overflow-x-auto">
              {getSupersetExercises(supersetInfo.superset).map((exercise, index) => (
                <div key={exercise.id} className="flex items-center flex-shrink-0">
                  <span className={`text-sm px-3 py-2 rounded-full font-medium ${
                    exercise.id === currentExercise.id 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-purple-200 text-purple-700'
                  }`}>
                    {index + 1}. {exercise.name}
                  </span>
                  {index < supersetInfo.exerciseCount - 1 && (
                    <ArrowRight className="h-4 w-4 text-purple-600 mx-2 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Current Exercise */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-secondary-900">
            {supersetInfo && (
              <span className="text-purple-600 mr-2 text-lg">
                {supersetInfo.position + 1}.
              </span>
            )}
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

        {/* Show current set we're working on for superset */}
        {supersetInfo && (
          <div className="mb-4 p-3 bg-purple-100 rounded-lg">
            <div className="text-center text-purple-800 font-medium">
              Working Set: {currentSupersetRound}
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          {currentExercise.sets.map((set, setIndex) => {
            // For supersets, only show the current round's set
            const isCurrentSet = supersetInfo ? setIndex === currentSupersetRound - 1 : true;
            
            if (supersetInfo && !isCurrentSet) return null;
            
            return (
              <div key={setIndex} className="border-2 border-secondary-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm text-secondary-600">
                    {supersetInfo ? `Round ${currentSupersetRound}` : `Set ${setIndex + 1}`}
                    {!currentExercise.isCardio && set.weight && set.reps && (
                      <span className="text-primary-600 ml-2">
                        (Planned: {set.weight} × {set.reps})
                      </span>
                    )}
                  </div>
                  {!supersetInfo && currentExercise.sets.length > 1 && (
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
            );
          })}
        </div>
        
        {!supersetInfo && (
          <Button 
            onClick={() => addSetToExercise(currentExerciseIndex)}
            variant="secondary"
            className="w-full mt-4 flex items-center justify-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Set
          </Button>
        )}
        
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
          {supersetInfo ? (
            supersetInfo.isLastInSuperset ? (
              currentSupersetRound < supersetInfo.superset.rounds ? 
                `Next Round (${currentSupersetRound + 1}/${supersetInfo.superset.rounds})` : 
                'Next Exercise'
            ) : (
              `Next: ${getSupersetExercises(supersetInfo.superset)[supersetInfo.position + 1]?.name}`
            )
          ) : (
            currentExerciseIndex < currentWorkout.exercises.length - 1 ? 'Next Exercise' : 'Finish Workout'
          )}
        </Button>
      </Card>

      {/* Exercise Navigation */}
      <Card className="p-4">
        <div className="text-sm text-secondary-600 mb-3">Exercises</div>
        <div className="flex gap-2 overflow-x-auto">
          {currentWorkout.exercises.map((exercise, index) => {
            const exerciseSuperset = currentWorkout.supersets?.find(ss => ss.exerciseIds.includes(exercise.id));
            const isInSuperset = !!exerciseSuperset;
            
            return (
              <button
                key={exercise.id}
                onClick={() => {
                  setCurrentExerciseIndex(index);
                  // If clicking on a superset exercise, determine the correct round
                  if (exerciseSuperset) {
                    const exercisePosition = exerciseSuperset.exerciseIds.indexOf(exercise.id);
                    // Keep current round if clicking within same superset, reset if different
                    const currentSuperset = getCurrentSuperset();
                    if (!currentSuperset || currentSuperset.id !== exerciseSuperset.id) {
                      setCurrentSupersetRound(1);
                    }
                  } else {
                    setCurrentSupersetRound(1);
                  }
                }}
                className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium ${
                  index === currentExerciseIndex
                    ? isInSuperset 
                      ? 'bg-purple-500 text-white'
                      : 'bg-primary-500 text-white'
                    : index < currentExerciseIndex
                    ? 'bg-green-500 text-white'
                    : isInSuperset
                    ? 'bg-purple-200 text-purple-700'
                    : 'bg-secondary-200 text-secondary-700'
                } ${isInSuperset ? 'border-2 border-purple-300' : ''}`}
              >
                {isInSuperset && (
                  <Link className="h-3 w-3 inline mr-1" />
                )}
                {exercise.name}
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
