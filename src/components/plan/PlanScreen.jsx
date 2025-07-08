import React, { useState, useEffect } from 'react';
import { useUserData } from '../../contexts/UserDataContext';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { Plus, Calendar, X, Tag, Trash2, Edit, Link, Unlink, ArrowUp, ArrowDown } from 'lucide-react';
import { format } from 'date-fns';
import { collection, addDoc, getDocs, query, where, orderBy, arrayContains, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';

// Focus areas in alphabetical order
const FOCUS_AREAS = [
  'Back',
  'Biceps/Triceps', 
  'Cardio',
  'Chest',
  'Legs',
  'Pull',
  'Push',
  'Shoulders'
];

const EXERCISE_CATEGORIES = [
  'compound',
  'isolation', 
  'bodyweight',
  'cardio',
  'flexibility'
];

export default function PlanScreen() {
  const { setCurrentWorkout, deleteExercise, saveScheduledWorkout } = useUserData();
  const navigate = useNavigate();
  const [workoutPlan, setWorkoutPlan] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'hypertrophy',
    focusArea: 'Pull',
    motivation: 7,
    notes: '',
    exercises: [],
    supersets: [] // Array of superset groups
  });
  const [showExerciseSelection, setShowExerciseSelection] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [showAddNewExercise, setShowAddNewExercise] = useState(false);
  const [availableExercises, setAvailableExercises] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingExerciseId, setEditingExerciseId] = useState(null);
  const [selectedExercises, setSelectedExercises] = useState([]); // For multi-select
  const [showScheduleOptions, setShowScheduleOptions] = useState(false);
  const [selectedForSuperset, setSelectedForSuperset] = useState([]); // For superset creation
  const [newExercise, setNewExercise] = useState({
    name: '',
    category: 'compound',
    focusAreas: ['Pull'], 
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
      const exercisesQuery = query(
        collection(db, 'exercises'),
        where('focusAreas', 'array-contains', workoutPlan.focusArea),
        orderBy('name')
      );
      const exercisesSnapshot = await getDocs(exercisesQuery);
      
      const firestoreExercises = exercisesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setAvailableExercises(firestoreExercises);
    } catch (error) {
      console.error('Error loading exercises:', error);
      setAvailableExercises([]);
    }
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
      if (editingExerciseId) {
        const exerciseData = {
          ...newExercise,
          name: newExercise.name.trim(),
          focusAreas: newExercise.focusAreas,
          updatedAt: new Date()
        };

        await updateDoc(doc(db, 'exercises', editingExerciseId), exerciseData);
        setAvailableExercises(prev => 
          prev.map(ex => 
            ex.id === editingExerciseId 
              ? { id: editingExerciseId, ...exerciseData }
              : ex
          ).sort((a, b) => a.name.localeCompare(b.name))
        );

        alert('Exercise updated successfully!');
      } else {
        const exerciseData = {
          ...newExercise,
          name: newExercise.name.trim(),
          focusAreas: newExercise.focusAreas,
          createdAt: new Date(),
          isCustom: true
        };

        const docRef = await addDoc(collection(db, 'exercises'), exerciseData);

        if (newExercise.focusAreas.includes(workoutPlan.focusArea)) {
          const newExerciseWithId = { id: docRef.id, ...exerciseData };
          setAvailableExercises(prev => [...prev, newExerciseWithId].sort((a, b) => a.name.localeCompare(b.name)));
        }

        alert('Exercise added successfully!');
      }

      setNewExercise({
        name: '',
        category: 'compound',
        focusAreas: [workoutPlan.focusArea],
        description: '',
        instructions: ''
      });
      
      setEditingExerciseId(null);
      setShowAddNewExercise(false);
    } catch (error) {
      console.error('Error saving exercise:', error);
      alert('Error saving exercise: ' + error.message);
    }
  };

  const handleDeleteExercise = async (exerciseId, exerciseName) => {
    if (confirm(`Are you sure you want to delete "${exerciseName}"? This action cannot be undone.`)) {
      try {
        await deleteExercise(exerciseId);
        setAvailableExercises(prev => prev.filter(ex => ex.id !== exerciseId));
        alert('Exercise deleted successfully!');
      } catch (error) {
        console.error('Error deleting exercise:', error);
        alert('Error deleting exercise: ' + error.message);
      }
    }
  };

  const handleEditExercise = (exercise) => {
    setEditingExerciseId(exercise.id);
    setNewExercise({
      name: exercise.name,
      category: exercise.category,
      focusAreas: exercise.focusAreas || [workoutPlan.focusArea],
      description: exercise.description || '',
      instructions: exercise.instructions || ''
    });
    setShowAddNewExercise(true);
  };

  const toggleFocusArea = (focusArea) => {
    setNewExercise(prev => ({
      ...prev,
      focusAreas: prev.focusAreas.includes(focusArea)
        ? prev.focusAreas.filter(area => area !== focusArea)
        : [...prev.focusAreas, focusArea]
    }));
  };

  const addExerciseToWorkout = (exercise) => {
    const isCardio = exercise.category === 'cardio' || exercise.focusAreas.includes('Cardio');
    
    const newExercise = {
      id: Date.now(),
      name: exercise.name,
      category: exercise.category,
      focusAreas: exercise.focusAreas,
      isCardio: isCardio,
      exerciseId: exercise.id,
      supersetId: null, // Will be set when added to superset
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
    
    setWorkoutPlan(prev => ({
      ...prev,
      exercises: [...prev.exercises, newExercise]
    }));
  };

  // Superset functions
  const createSuperset = () => {
    if (selectedForSuperset.length < 2) {
      alert('Please select at least 2 exercises to create a superset');
      return;
    }

    const supersetId = Date.now();
    const updatedExercises = workoutPlan.exercises.map(exercise => {
      if (selectedForSuperset.includes(exercise.id)) {
        return { ...exercise, supersetId };
      }
      return exercise;
    });

    const newSuperset = {
      id: supersetId,
      name: `Superset ${workoutPlan.supersets.length + 1}`,
      exerciseIds: selectedForSuperset,
      sets: 3 // Default number of superset rounds
    };

    setWorkoutPlan(prev => ({
      ...prev,
      exercises: updatedExercises,
      supersets: [...prev.supersets, newSuperset]
    }));

    setSelectedForSuperset([]);
  };

  const removeFromSuperset = (exerciseId) => {
    const exercise = workoutPlan.exercises.find(ex => ex.id === exerciseId);
    if (!exercise || !exercise.supersetId) return;

    const superset = workoutPlan.supersets.find(ss => ss.id === exercise.supersetId);
    if (!superset) return;

    const updatedExerciseIds = superset.exerciseIds.filter(id => id !== exerciseId);
    
    // If only one exercise left, remove the superset entirely
    if (updatedExerciseIds.length < 2) {
      setWorkoutPlan(prev => ({
        ...prev,
        exercises: prev.exercises.map(ex => 
          ex.supersetId === exercise.supersetId ? { ...ex, supersetId: null } : ex
        ),
        supersets: prev.supersets.filter(ss => ss.id !== exercise.supersetId)
      }));
    } else {
      // Update superset and remove exercise from it
      setWorkoutPlan(prev => ({
        ...prev,
        exercises: prev.exercises.map(ex => 
          ex.id === exerciseId ? { ...ex, supersetId: null } : ex
        ),
        supersets: prev.supersets.map(ss => 
          ss.id === exercise.supersetId 
            ? { ...ss, exerciseIds: updatedExerciseIds }
            : ss
        )
      }));
    }
  };

  const toggleExerciseForSuperset = (exerciseId) => {
    setSelectedForSuperset(prev => 
      prev.includes(exerciseId) 
        ? prev.filter(id => id !== exerciseId)
        : [...prev, exerciseId]
    );
  };

  const moveExercise = (exerciseId, direction) => {
    const exercises = [...workoutPlan.exercises];
    const index = exercises.findIndex(ex => ex.id === exerciseId);
    
    if (direction === 'up' && index > 0) {
      [exercises[index], exercises[index - 1]] = [exercises[index - 1], exercises[index]];
    } else if (direction === 'down' && index < exercises.length - 1) {
      [exercises[index], exercises[index + 1]] = [exercises[index + 1], exercises[index]];
    }
    
    setWorkoutPlan(prev => ({ ...prev, exercises }));
  };

  const addSelectedExercises = () => {
    selectedExercises.forEach(exercise => {
      addExerciseToWorkout(exercise);
    });
    setSelectedExercises([]);
    setShowExerciseSelection(false);
  };

  const toggleExerciseSelection = (exercise) => {
    setSelectedExercises(prev => {
      const isSelected = prev.some(ex => ex.id === exercise.id);
      if (isSelected) {
        return prev.filter(ex => ex.id !== exercise.id);
      } else {
        return [...prev, exercise];
      }
    });
  };

  const isExerciseSelected = (exercise) => {
    return selectedExercises.some(ex => ex.id === exercise.id);
  };

  const selectAllExercises = () => {
    if (selectedExercises.length === filteredExercises.length) {
      setSelectedExercises([]);
    } else {
      setSelectedExercises([...filteredExercises]);
    }
  };

  const removeExercise = (exerciseId) => {
    // Remove from superset if needed
    removeFromSuperset(exerciseId);
    
    // Remove exercise
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

  const scheduleWorkout = async () => {
    if (workoutPlan.exercises.length === 0) {
      alert('Please add at least one exercise to schedule a workout.');
      return;
    }

    try {
      const [year, month, day] = workoutPlan.date.split('-').map(Number);
      const workoutDate = new Date(year, month - 1, day, 12, 0, 0, 0);
      
      const scheduledWorkoutData = {
        ...workoutPlan,
        date: workoutDate,
        scheduledFor: workoutDate
      };

      await saveScheduledWorkout(scheduledWorkoutData);
      
      alert(`Workout scheduled for ${format(workoutDate, 'MMMM d, yyyy')}!`);
      
      setWorkoutPlan({
        date: format(new Date(), 'yyyy-MM-dd'),
        type: 'hypertrophy',
        focusArea: 'Pull',
        motivation: 7,
        notes: '',
        exercises: [],
        supersets: []
      });
      
      setShowScheduleOptions(false);
    } catch (error) {
      console.error('Error scheduling workout:', error);
      alert('Error scheduling workout: ' + error.message);
    }
  };

  const filteredExercises = availableExercises.filter(exercise =>
    exercise.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get superset for exercise
  const getExerciseSuperset = (exerciseId) => {
    const exercise = workoutPlan.exercises.find(ex => ex.id === exerciseId);
    if (!exercise || !exercise.supersetId) return null;
    return workoutPlan.supersets.find(ss => ss.id === exercise.supersetId);
  };

  // Render exercise with superset indicators
  const renderExerciseItem = (exercise, index) => {
    const superset = getExerciseSuperset(exercise.id);
    const isInSuperset = !!superset;
    const isSelectedForNewSuperset = selectedForSuperset.includes(exercise.id);
    
    return (
      <div 
        key={exercise.id} 
        className={`border-2 rounded-lg bg-white ${
          isInSuperset ? 'border-purple-300 bg-purple-50' : 'border-secondary-200'
        } ${isSelectedForNewSuperset ? 'ring-2 ring-blue-400' : ''}`}
      >
        {/* Superset header */}
        {isInSuperset && superset.exerciseIds[0] === exercise.id && (
          <div className="bg-purple-500 text-white px-3 py-1 text-xs font-medium rounded-t-lg flex items-center justify-between">
            <span>🔗 {superset.name} ({superset.exerciseIds.length} exercises)</span>
            <span>{superset.sets} rounds</span>
          </div>
        )}
        
        <div className="p-3">
          <div className="flex justify-between items-start">
            <div 
              className="flex-1 cursor-pointer hover:bg-gray-50 p-2 rounded"
              onClick={() => setSelectedExercise(exercise.id)}
            >
              <div className="font-medium text-secondary-900 flex items-center">
                {isInSuperset && (
                  <span className="text-purple-600 mr-2 text-sm">
                    {superset.exerciseIds.indexOf(exercise.id) + 1}.
                  </span>
                )}
                {exercise.name}
                {exercise.isCardio && (
                  <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                    Cardio
                  </span>
                )}
              </div>
              <div className="text-sm text-secondary-600">
                {exercise.sets.length} sets planned • {exercise.category}
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
            
            <div className="flex flex-col gap-1 ml-2">
              {/* Move up/down buttons */}
              <div className="flex gap-1">
                <button
                  onClick={() => moveExercise(exercise.id, 'up')}
                  disabled={index === 0}
                  className="p-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
                  title="Move up"
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  onClick={() => moveExercise(exercise.id, 'down')}
                  disabled={index === workoutPlan.exercises.length - 1}
                  className="p-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
                  title="Move down"
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
              </div>
              
              {/* Superset controls */}
              <div className="flex gap-1">
                <button
                  onClick={() => toggleExerciseForSuperset(exercise.id)}
                  className={`p-1 rounded ${
                    isSelectedForNewSuperset 
                      ? 'bg-blue-500 text-white' 
                      : 'text-blue-600 hover:bg-blue-100'
                  }`}
                  title={isSelectedForNewSuperset ? 'Remove from superset selection' : 'Select for superset'}
                >
                  <Link className="h-3 w-3" />
                </button>
                
                {isInSuperset && (
                  <button
                    onClick={() => removeFromSuperset(exercise.id)}
                    className="p-1 text-purple-600 hover:bg-purple-100 rounded"
                    title="Remove from superset"
                  >
                    <Unlink className="h-3 w-3" />
                  </button>
                )}
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
          </div>
        </div>
      </div>
    );
  };

  // Component continues with existing conditional renders...
  if (showAddNewExercise) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-secondary-900">
              {editingExerciseId ? 'Edit Exercise' : 'Add New Exercise'}
            </h2>
            <button
              onClick={() => {
                setShowAddNewExercise(false);
                setEditingExerciseId(null);
                setNewExercise({
                  name: '',
                  category: 'compound',
                  focusAreas: [workoutPlan.focusArea],
                  description: '',
                  instructions: ''
                });
              }}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-secondary-600 mb-2 block">Exercise Name *</label>
              <Input
                placeholder="e.g., Bicep Curls"
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
                <Tag className="inline h-4 w-4 mr-1" />
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
                {editingExerciseId ? 'Update Exercise' : 'Add Exercise'}
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => {
                  setShowAddNewExercise(false);
                  setEditingExerciseId(null);
                  setNewExercise({
                    name: '',
                    category: 'compound',
                    focusAreas: [workoutPlan.focusArea],
                    description: '',
                    instructions: ''
                  });
                }}
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
              onClick={() => {
                setShowExerciseSelection(false);
                setSelectedExercises([]);
              }}
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
          
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm text-secondary-600">
              {workoutPlan.focusArea} Exercises ({filteredExercises.length})
            </div>
            {filteredExercises.length > 0 && (
              <button
                onClick={selectAllExercises}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                {selectedExercises.length === filteredExercises.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>
          
          <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
            {filteredExercises.map((exercise, index) => (
              <div key={exercise.id || index} className="border-2 border-secondary-200 rounded-lg bg-white p-3">
                <div className="flex justify-between items-start">
                  <div 
                    className="flex-1 cursor-pointer hover:bg-gray-50 p-2 rounded"
                    onClick={() => handleEditExercise(exercise)}
                  >
                    <div className="font-medium text-secondary-900 flex items-center">
                      <input
                        type="checkbox"
                        checked={isExerciseSelected(exercise)}
                        onChange={() => toggleExerciseSelection(exercise)}
                        onClick={(e) => e.stopPropagation()}
                        className="mr-3 w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                      {exercise.name}
                    </div>
                    <div className="text-xs text-secondary-500 capitalize ml-7">
                      {exercise.category}
                      {exercise.isCustom && ' • Custom'}
                      <span className="text-primary-600 ml-2">• Click to edit</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2 ml-7">
                      {exercise.focusAreas?.map(area => (
                        <span 
                          key={area}
                          className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-2">
                    <Button 
                      size="sm" 
                      onClick={() => addExerciseToWorkout(exercise)}
                      variant="outline"
                    >
                      Add Single
                    </Button>
                    {exercise.isCustom && (
                      <button
                        onClick={() => handleDeleteExercise(exercise.id, exercise.name)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                        title="Delete exercise"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
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
                No exercises found for {workoutPlan.focusArea}.
                <br />Add some exercises to get started!
              </div>
            )}
          </div>
          
          {selectedExercises.length > 0 && (
            <div className="bg-primary-50 border-2 border-primary-200 rounded-lg p-4 mb-4">
              <div className="text-sm text-primary-800 mb-3">
                <strong>{selectedExercises.length}</strong> exercise{selectedExercises.length !== 1 ? 's' : ''} selected
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={addSelectedExercises}
                  className="flex-1"
                >
                  Add Selected ({selectedExercises.length})
                </Button>
                <Button 
                  onClick={() => setSelectedExercises([])}
                  variant="secondary"
                  size="sm"
                >
                  Clear
                </Button>
              </div>
            </div>
          )}
          
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
          
          {exercise.isCardio ? (
            // Cardio Exercise Planning
            <>
              <div className="text-sm text-secondary-600 mb-3">Cardio Sets</div>
              <div className="space-y-3">
                {exercise.sets.map((set, index) => (
                  <div key={index} className="p-3 border-2 border-secondary-200 rounded-lg space-y-3">
                    <div className="text-sm font-medium">Set {index + 1}:</div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Distance (mi)"
                        value={set.distance}
                        onChange={(e) => {
                          const newSets = [...exercise.sets];
                          newSets[index].distance = e.target.value;
                          updateExerciseSets(exercise.id, newSets);
                        }}
                      />
                      <Input
                        placeholder="Duration (min)"
                        value={set.duration}
                        onChange={(e) => {
                          const newSets = [...exercise.sets];
                          newSets[index].duration = e.target.value;
                          updateExerciseSets(exercise.id, newSets);
                        }}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Floors Climbed"
                        value={set.floorsClimbed}
                        onChange={(e) => {
                          const newSets = [...exercise.sets];
                          newSets[index].floorsClimbed = e.target.value;
                          updateExerciseSets(exercise.id, newSets);
                        }}
                      />
                      <Input
                        placeholder="Weighted Vest (lbs)"
                        value={set.weightedVest}
                        onChange={(e) => {
                          const newSets = [...exercise.sets];
                          newSets[index].weightedVest = e.target.value;
                          updateExerciseSets(exercise.id, newSets);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            // Regular Exercise Planning  
            <>
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
            </>
          )}
          
          <Button 
            className="w-full mt-4"
            onClick={() => {
              const newSet = exercise.isCardio 
                ? { distance: '', floorsClimbed: '', weightedVest: '', duration: '', completed: false }
                : { weight: '', reps: '', completed: false };
              const newSets = [...exercise.sets, newSet];
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
          {FOCUS_AREAS.map(area => (
            <option key={area} value={area}>{area}</option>
          ))}
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
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-secondary-900">Planned Exercises</h3>
            
            {/* Superset creation controls */}
            {selectedForSuperset.length > 0 && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={createSuperset}
                  disabled={selectedForSuperset.length < 2}
                  className="flex items-center"
                >
                  <Link className="h-3 w-3 mr-1" />
                  Create Superset ({selectedForSuperset.length})
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setSelectedForSuperset([])}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
          
          {selectedForSuperset.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <div className="text-sm text-blue-800">
                <strong>Creating Superset:</strong> Select 2+ exercises and click "Create Superset"
                <br />
                <span className="text-xs">Selected: {selectedForSuperset.length} exercise{selectedForSuperset.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            {workoutPlan.exercises.map((exercise, index) => renderExerciseItem(exercise, index))}
          </div>
          
          <div className="flex gap-3 mt-6">
            <Button onClick={startWorkout} className="flex-1">
              Start Now
            </Button>
            <Button 
              onClick={() => setShowScheduleOptions(true)}
              variant="secondary" 
              className="flex-1"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Schedule
            </Button>
          </div>
        </Card>
      )}

      {/* Schedule Options Modal */}
      {showScheduleOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-secondary-900">Schedule Workout</h3>
              <button
                onClick={() => setShowScheduleOptions(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-secondary-600 mb-2 block">Workout Date</label>
                <Input
                  type="date"
                  value={workoutPlan.date}
                  onChange={(e) => setWorkoutPlan(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              
              <div className="bg-primary-50 p-4 rounded-lg">
                <h4 className="font-medium text-secondary-900 mb-2">Workout Summary</h4>
                <div className="text-sm text-secondary-600">
                  <div>Type: <span className="capitalize">{workoutPlan.type}</span></div>
                  <div>Focus: {workoutPlan.focusArea}</div>
                  <div>Exercises: {workoutPlan.exercises.length}</div>
                  {workoutPlan.supersets.length > 0 && (
                    <div>Supersets: {workoutPlan.supersets.length}</div>
                  )}
                  <div>Date: {(() => {
                    const [year, month, day] = workoutPlan.date.split('-').map(Number);
                    const displayDate = new Date(year, month - 1, day);
                    return format(displayDate, 'MMMM d, yyyy');
                  })()}</div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button onClick={scheduleWorkout} className="flex-1">
                  Schedule Workout
                </Button>
                <Button 
                  onClick={() => setShowScheduleOptions(false)}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
