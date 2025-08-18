import React, { useState, useMemo } from 'react';
import { useUserData } from '../../contexts/UserDataContext';
import { useNavigate } from 'react-router-dom';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, subWeeks, subMonths, isAfter } from 'date-fns';
import { Edit, Trash2, X, Calendar, Clock, TrendingUp, Copy, Share, ArrowLeft, Plus, Minus, Check } from 'lucide-react';

export default function ProgressScreen() {
  const { workouts, measurements, updateWorkout, deleteWorkout, setCurrentWorkout } = useUserData();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('week');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingWorkout, setEditingWorkout] = useState(null);
  const [viewingWorkout, setViewingWorkout] = useState(null);
  const [editWorkoutData, setEditWorkoutData] = useState({});

  // Calculate date range
  const getDateRange = () => {
    const now = new Date();
    switch (timeRange) {
      case 'week':
        return subDays(now, 7);
      case 'month':
        return subWeeks(now, 4);
      case 'year':
        return subMonths(now, 12);
      default:
        return subDays(now, 7);
    }
  };

  // Helper function to safely convert dates (ENHANCED)
  const getDisplayDate = (dateValue) => {
    if (!dateValue) return new Date();
    
    // Handle Firestore timestamp
    if (dateValue.toDate) {
      return dateValue.toDate();
    }
    
    // Handle regular Date object or date string
    const date = new Date(dateValue);
    
    // Check if it's a valid date
    if (isNaN(date.getTime())) {
      console.warn('Invalid date encountered:', dateValue);
      return new Date();
    }
    
    console.log('Date conversion:', {
      input: dateValue,
      output: date,
      formatted: format(date, 'MMM d, yyyy'),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
    
    return date;
  };

  // Filter workouts by date range
  const filteredWorkouts = useMemo(() => {
    const startDate = getDateRange();
    return workouts.filter(workout => {
      const workoutDate = getDisplayDate(workout.date);
      return isAfter(workoutDate, startDate);
    });
  }, [workouts, timeRange]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalWorkouts = filteredWorkouts.length;
    const totalWeight = filteredWorkouts.reduce((sum, workout) => sum + (workout.totalWeight || 0), 0);
    
    return {
      totalWorkouts,
      totalWeight,
      averageRating: totalWorkouts > 0 
        ? (filteredWorkouts.reduce((sum, w) => sum + (w.rating || 0), 0) / totalWorkouts).toFixed(1)
        : 0
    };
  }, [filteredWorkouts]);

  // Prepare chart data for weight progress
  const weightChartData = useMemo(() => {
    const startDate = getDateRange();
    const filteredMeasurements = measurements.filter(m => {
      const measurementDate = getDisplayDate(m.date);
      return isAfter(measurementDate, startDate) && m.weight;
    });

    return filteredMeasurements
      .slice(0, 10) // Limit to 10 most recent
      .reverse()
      .map(m => ({
        date: format(getDisplayDate(m.date), 'MMM d'),
        weight: m.weight
      }));
  }, [measurements, timeRange]);

  // Prepare chart data for workout volume
  const volumeChartData = useMemo(() => {
    return filteredWorkouts
      .slice(0, 10)
      .reverse()
      .map(workout => ({
        date: format(getDisplayDate(workout.date), 'MMM d'),
        weight: workout.totalWeight || 0
      }));
  }, [filteredWorkouts]);

  // Get unique exercises for search
  const allExercises = useMemo(() => {
    const exerciseMap = new Map();
    
    workouts.forEach(workout => {
      workout.exercises?.forEach(exercise => {
        if (exercise.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          const existing = exerciseMap.get(exercise.name);
          if (!existing || workout.date > existing.date) {
            // Get the best weight/reps from the exercise sets
            let lastWeight = 'BW';
            let lastReps = '--';
            
            if (exercise.sets && exercise.sets.length > 0) {
              // Find the first set with actual values, or fall back to planned values
              const setWithData = exercise.sets.find(s => 
                (s.actualWeight && s.actualReps) || (s.weight && s.reps)
              );
              
              if (setWithData) {
                lastWeight = setWithData.actualWeight || setWithData.weight || 'BW';
                lastReps = setWithData.actualReps || setWithData.reps || '--';
              }
            }
            
            exerciseMap.set(exercise.name, {
              name: exercise.name,
              lastWeight,
              lastReps,
              date: workout.date
            });
          }
        }
      });
    });
    
    return Array.from(exerciseMap.values());
  }, [workouts, searchTerm]);

  // Handle viewing workout (read-only)
  const handleViewWorkout = (workout) => {
    setViewingWorkout(workout);
  };

  // Handle editing workout
  const handleEditWorkout = (workout) => {
    setEditingWorkout(workout.id);
    const workoutDate = getDisplayDate(workout.date);
    setEditWorkoutData({
      date: format(workoutDate, 'yyyy-MM-dd'),
      type: workout.type || 'hypertrophy',
      focusArea: workout.focusArea || 'push',
      motivation: workout.motivation || 5,
      rating: workout.rating || 5,
      duration: workout.duration || 0,
      notes: workout.notes || '',
      exercises: workout.exercises || []
    });
  };

  // Handle copying workout to plan screen
  const handleCopyWorkout = (workout) => {
    // Create a workout plan from the historical workout
    const workoutPlan = {
      date: format(new Date(), 'yyyy-MM-dd'), // Today's date
      type: workout.type || 'hypertrophy',
      focusArea: workout.focusArea || 'Pull',
      motivation: 7, // Default motivation
      notes: `Copied from ${format(getDisplayDate(workout.date), 'MMM d, yyyy')} workout`,
      exercises: workout.exercises?.map(exercise => ({
        id: Date.now() + Math.random(), // New ID for each exercise
        name: exercise.name,
        category: exercise.category,
        focusAreas: exercise.focusAreas,
        isCardio: exercise.isCardio,
        exerciseId: exercise.exerciseId,
        supersetId: null, // Reset superset associations
        sets: exercise.sets?.map(set => ({
          weight: set.actualWeight || set.weight || '',
          reps: set.actualReps || set.reps || '',
          distance: set.actualDistance || set.distance || '',
          duration: set.actualDuration || set.duration || '',
          floorsClimbed: set.actualFloorsClimbed || set.floorsClimbed || '',
          weightedVest: set.actualWeightedVest || set.weightedVest || '',
          completed: false // Reset completion status
        })) || []
      })) || [],
      supersets: [] // Reset supersets for now - could be enhanced later
    };

    // Set as current workout plan and navigate to plan screen
    setCurrentWorkout(workoutPlan);
    navigate('/plan');
  };

  // Handle sharing workout
  const handleShareWorkout = async (workout) => {
    const workoutDate = getDisplayDate(workout.date);
    const shareText = `💪 ${workout.focusArea} Day Workout
📅 ${format(workoutDate, 'MMM d, yyyy')}
⏱️ ${workout.duration}min • ${(workout.totalWeight || 0).toLocaleString()} lbs
⭐ Rating: ${workout.rating}/10

Exercises:
${workout.exercises?.map(exercise => {
  const setsText = exercise.sets?.map(set => {
    if (exercise.isCardio) {
      const distance = set.actualDistance || set.distance || '0';
      const duration = set.actualDuration || set.duration || '0';
      return `${duration}min × ${distance}mi`;
    } else {
      const weight = set.actualWeight || set.weight || 'BW';
      const reps = set.actualReps || set.reps || '0';
      return `${weight}×${reps}`;
    }
  }).join(', ') || 'No sets recorded';
  return `• ${exercise.name}: ${setsText}`;
}).join('\n') || 'No exercises recorded'}

${workout.notes ? `\nNotes: ${workout.notes}` : ''}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${workout.focusArea} Day Workout`,
          text: shareText
        });
      } catch (error) {
        console.log('Share cancelled or failed');
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        alert('Workout details copied to clipboard!');
      } catch (error) {
        console.error('Failed to copy to clipboard');
        alert('Failed to copy workout details');
      }
    }
  };

  const handleUpdateWorkout = async (workoutId) => {
    try {
      const dataToUpdate = {
        ...editWorkoutData,
        date: new Date(editWorkoutData.date),
        duration: parseInt(editWorkoutData.duration) || 0,
        motivation: parseInt(editWorkoutData.motivation) || 5,
        rating: parseInt(editWorkoutData.rating) || 5
      };
      
      await updateWorkout(workoutId, dataToUpdate);
      setEditingWorkout(null);
      setEditWorkoutData({});
    } catch (error) {
      console.error('Error updating workout:', error);
      alert('Error updating workout: ' + error.message);
    }
  };

  // Update exercise sets in edit mode
  const updateExerciseSets = (exerciseIndex, sets) => {
    setEditWorkoutData(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, index) => 
        index === exerciseIndex ? { ...ex, sets } : ex
      )
    }));
  };

  const addSetToExercise = (exerciseIndex) => {
    const exercise = editWorkoutData.exercises[exerciseIndex];
    const newSet = exercise.isCardio ? {
      distance: '',
      floorsClimbed: '',
      weightedVest: '',
      duration: '',
      actualDistance: '',
      actualFloorsClimbed: '',
      actualWeightedVest: '',
      actualDuration: '',
      completed: false
    } : {
      weight: '',
      reps: '',
      actualWeight: '',
      actualReps: '',
      completed: false
    };
    
    const newSets = [...exercise.sets, newSet];
    updateExerciseSets(exerciseIndex, newSets);
  };

  const removeSetFromExercise = (exerciseIndex, setIndex) => {
    const exercise = editWorkoutData.exercises[exerciseIndex];
    if (exercise.sets.length > 1) {
      const newSets = exercise.sets.filter((_, index) => index !== setIndex);
      updateExerciseSets(exerciseIndex, newSets);
    }
  };

const handleDeleteWorkout = async (workoutId) => {
  if (confirm('Are you sure you want to delete this workout? This action cannot be undone.')) {
    try {
      await deleteWorkout(workoutId);
      // No need to manually refresh - the real-time listener should update automatically
    } catch (error) {
      console.error('Error deleting workout:', error);
      alert('Error deleting workout: ' + error.message);
    }
  }
};

  const cancelEdit = () => {
    setEditingWorkout(null);
    setEditWorkoutData({});
  };

  const cancelView = () => {
    setViewingWorkout(null);
  };

  // Read-only workout detail view
  if (viewingWorkout) {
    return (
      <div className="p-4 max-w-md mx-auto space-y-4">
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-secondary-900">Workout Details</h2>
            <button
              onClick={cancelView}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Workout Summary */}
          <div className="space-y-4 mb-6">
            <div className="bg-primary-50 p-4 rounded-lg">
              <div className="font-medium text-secondary-900 capitalize flex items-center mb-2">
                {viewingWorkout.focusArea || 'Unknown'} Day
                <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded capitalize">
                  {viewingWorkout.type || 'workout'}
                </span>
              </div>
              <div className="text-sm text-secondary-600 space-y-1">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  {format(getDisplayDate(viewingWorkout.date), 'MMMM d, yyyy')}
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  {viewingWorkout.duration || 0} minutes
                </div>
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  {(viewingWorkout.totalWeight || 0).toLocaleString()} lbs total
                </div>
                <div>⭐ Rating: {viewingWorkout.rating || 'N/A'}/10</div>
                {viewingWorkout.notes && (
                  <div className="mt-2 p-2 bg-gray-50 rounded italic text-sm">
                    "{viewingWorkout.notes}"
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button 
                onClick={() => handleCopyWorkout(viewingWorkout)}
                variant="outline"
                className="flex-1 flex items-center justify-center"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Workout
              </Button>
              <Button 
                onClick={() => handleShareWorkout(viewingWorkout)}
                variant="outline"
                className="flex-1 flex items-center justify-center"
              >
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>

          {/* Exercise Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-secondary-900">Exercises ({viewingWorkout.exercises?.length || 0})</h3>
            {viewingWorkout.exercises?.map((exercise, exerciseIndex) => (
              <Card key={exerciseIndex} className="p-4 bg-gray-50">
                <div className="font-medium text-secondary-900 mb-3 flex items-center">
                  {exercise.name}
                  {exercise.isCardio && (
                    <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      Cardio
                    </span>
                  )}
                </div>
                
                <div className="space-y-2">
                  {exercise.sets?.map((set, setIndex) => (
                    <div key={setIndex} className="bg-white p-3 rounded border">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">
                          Set {setIndex + 1}
                        </span>
                        {set.completed && (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      
                      {exercise.isCardio ? (
                        <div className="text-sm text-gray-700 mt-1">
                          {set.actualDistance || set.distance || '0'} miles • {set.actualDuration || set.duration || '0'} min
                          {(set.actualFloorsClimbed || set.floorsClimbed) && (
                            <span> • {set.actualFloorsClimbed || set.floorsClimbed} floors</span>
                          )}
                          {(set.actualWeightedVest || set.weightedVest) && (
                            <span> • {set.actualWeightedVest || set.weightedVest} lbs vest</span>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-700 mt-1">
                          {set.actualWeight || set.weight || 'BW'} × {set.actualReps || set.reps || '0'} reps
                        </div>
                      )}
                    </div>
                  )) || (
                    <div className="text-sm text-gray-500 italic">No sets recorded</div>
                  )}
                </div>

                {exercise.notes && (
                  <div className="mt-3 p-2 bg-blue-50 rounded text-sm italic">
                    Notes: {exercise.notes}
                  </div>
                )}
              </Card>
            )) || (
              <div className="text-center text-gray-500 py-4">
                No exercises recorded for this workout
              </div>
            )}
          </div>

          <Button 
            onClick={cancelView}
            variant="secondary"
            className="w-full mt-6 flex items-center justify-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Progress
          </Button>
        </Card>
      </div>
    );
  }

  // Edit workout view (enhanced with exercise details)
  if (editingWorkout) {
    return (
      <div className="p-4 max-w-md mx-auto space-y-4">
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-secondary-900">Edit Workout</h2>
            <button
              onClick={cancelEdit}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); handleUpdateWorkout(editingWorkout); }}>
            <div className="space-y-4">
              <div>
                <label htmlFor="workout-date" className="text-sm text-secondary-600 mb-2 block">Date</label>
                <Input
                  id="workout-date"
                  name="date"
                  type="date"
                  value={editWorkoutData.date}
                  onChange={(e) => setEditWorkoutData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              
              <div>
                <label htmlFor="workout-type" className="text-sm text-secondary-600 mb-2 block">Workout Type</label>
                <select
                  id="workout-type"
                  name="workoutType"
                  className="w-full px-4 py-3 border-2 border-primary-300 rounded-lg focus:border-primary-500 focus:outline-none"
                  value={editWorkoutData.type}
                  onChange={(e) => setEditWorkoutData(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="hypertrophy">Hypertrophy</option>
                  <option value="power">Power</option>
                  <option value="strength">Strength</option>
                  <option value="endurance">Endurance</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="focus-area" className="text-sm text-secondary-600 mb-2 block">Focus Area</label>
                <select
                  id="focus-area"
                  name="focusArea"
                  className="w-full px-4 py-3 border-2 border-primary-300 rounded-lg focus:border-primary-500 focus:outline-none"
                  value={editWorkoutData.focusArea}
                  onChange={(e) => setEditWorkoutData(prev => ({ ...prev, focusArea: e.target.value }))}
                >
                  <option value="Back">Back</option>
                  <option value="Biceps/Triceps">Biceps/Triceps</option>
                  <option value="Cardio">Cardio</option>
                  <option value="Chest">Chest</option>
                  <option value="Legs">Legs</option>
                  <option value="Pull">Pull</option>
                  <option value="Push">Push</option>
                  <option value="Shoulders">Shoulders</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="duration" className="text-sm text-secondary-600 mb-2 block">Duration (minutes)</label>
                <Input
                  id="duration"
                  name="duration"
                  type="number"
                  placeholder="45"
                  value={editWorkoutData.duration}
                  onChange={(e) => setEditWorkoutData(prev => ({ ...prev, duration: e.target.value }))}
                />
              </div>
              
              <div>
                <label htmlFor="motivation" className="text-sm text-secondary-600 mb-2 block">Motivation Level (1-10)</label>
                <Input
                  id="motivation"
                  name="motivation"
                  type="number"
                  min="1"
                  max="10"
                  value={editWorkoutData.motivation}
                  onChange={(e) => setEditWorkoutData(prev => ({ ...prev, motivation: parseInt(e.target.value) || 5 }))}
                />
              </div>
              
              <div>
                <label htmlFor="rating" className="text-sm text-secondary-600 mb-2 block">Workout Rating (1-10)</label>
                <Input
                  id="rating"
                  name="rating"
                  type="number"
                  min="1"
                  max="10"
                  value={editWorkoutData.rating}
                  onChange={(e) => setEditWorkoutData(prev => ({ ...prev, rating: parseInt(e.target.value) || 5 }))}
                />
              </div>
              
              <div>
                <label htmlFor="notes" className="text-sm text-secondary-600 mb-2 block">Notes</label>
                <textarea
                  id="notes"
                  name="notes"
                  className="w-full px-4 py-3 border-2 border-primary-300 rounded-lg focus:border-primary-500 focus:outline-none"
                  placeholder="Workout notes..."
                  rows="3"
                  value={editWorkoutData.notes}
                  onChange={(e) => setEditWorkoutData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>
          </form>
        </Card>

        {/* Exercise Details in Edit Mode */}
        {editWorkoutData.exercises && editWorkoutData.exercises.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-bold text-secondary-900 mb-4">
              Exercises ({editWorkoutData.exercises.length})
            </h3>
            
            <div className="space-y-4">
              {editWorkoutData.exercises.map((exercise, exerciseIndex) => (
                <Card key={exerciseIndex} className="p-4 bg-gray-50">
                  <div className="font-medium text-secondary-900 mb-3 flex items-center">
                    {exercise.name}
                    {exercise.isCardio && (
                      <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        Cardio
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {exercise.sets?.map((set, setIndex) => (
                      <div key={setIndex} className="bg-white p-3 rounded border">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-600">
                            Set {setIndex + 1}
                          </span>
                          {exercise.sets.length > 1 && (
                            <button
                              onClick={() => removeSetFromExercise(exerciseIndex, setIndex)}
                              className="p-1 text-red-600 hover:bg-red-100 rounded"
                              title="Remove set"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        
                        {exercise.isCardio ? (
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              placeholder="Distance (mi)"
                              value={set.actualDistance || set.distance || ''}
                              onChange={(e) => {
                                const newSets = [...exercise.sets];
                                newSets[setIndex] = { ...set, actualDistance: e.target.value };
                                updateExerciseSets(exerciseIndex, newSets);
                              }}
                            />
                            <Input
                              placeholder="Duration (min)"
                              value={set.actualDuration || set.duration || ''}
                              onChange={(e) => {
                                const newSets = [...exercise.sets];
                                newSets[setIndex] = { ...set, actualDuration: e.target.value };
                                updateExerciseSets(exerciseIndex, newSets);
                              }}
                            />
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              placeholder="Weight"
                              value={set.actualWeight || set.weight || ''}
                              onChange={(e) => {
                                const newSets = [...exercise.sets];
                                newSets[setIndex] = { ...set, actualWeight: e.target.value };
                                updateExerciseSets(exerciseIndex, newSets);
                              }}
                            />
                            <Input
                              placeholder="Reps"
                              value={set.actualReps || set.reps || ''}
                              onChange={(e) => {
                                const newSets = [...exercise.sets];
                                newSets[setIndex] = { ...set, actualReps: e.target.value };
                                updateExerciseSets(exerciseIndex, newSets);
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )) || (
                      <div className="text-sm text-gray-500 italic">No sets recorded</div>
                    )}
                    
                    <Button
                      onClick={() => addSetToExercise(exerciseIndex)}
                      variant="secondary"
                      size="sm"
                      className="w-full flex items-center justify-center"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Set
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-4">
          <div className="flex gap-3">
            <Button 
              onClick={() => handleUpdateWorkout(editingWorkout)}
              className="flex-1"
            >
              Save Changes
            </Button>
            <Button 
              onClick={cancelEdit}
              variant="secondary"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-secondary-900">Progress</h1>

      {/* Time Range Tabs */}
      <Card className="p-4">
        <div className="flex border-b-2 border-secondary-200">
          {['week', 'month', 'year'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 -mb-0.5 ${
                timeRange === range
                  ? 'border-primary-500 text-primary-600 bg-white'
                  : 'border-transparent text-secondary-600 bg-secondary-100'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </Card>

      {/* Stats Overview */}
      <Card className="p-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-primary-50 border-2 border-primary-200 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-secondary-900">
              {stats.totalWorkouts}
            </div>
            <div className="text-sm text-secondary-600">Workouts</div>
          </div>
          <div className="bg-primary-50 border-2 border-primary-200 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-secondary-900">
              {stats.totalWeight.toLocaleString()}
            </div>
            <div className="text-sm text-secondary-600">lbs lifted</div>
          </div>
        </div>

        {/* Weight Progress Chart */}
        {weightChartData.length > 0 && (
          <>
            <div className="text-sm text-secondary-600 mb-3">Weight Progress</div>
            <div className="h-32 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="#3498db" 
                    strokeWidth={2}
                    dot={{ fill: '#3498db', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* Volume Chart */}
        {volumeChartData.length > 0 && (
          <>
            <div className="text-sm text-secondary-600 mb-3">Total Weight Lifted</div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={volumeChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="#2ecc71" 
                    strokeWidth={2}
                    dot={{ fill: '#2ecc71', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </Card>

      {/* Exercise Progress */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-secondary-900 mb-4">Exercise Progress</h3>
        
        <Input
          placeholder="🔍 Search exercises..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4"
        />
        
        <div className="space-y-3">
          {allExercises.slice(0, 5).map((exercise, index) => (
            <div key={index} className="flex justify-between items-center p-3 border-2 border-secondary-200 rounded-lg bg-white">
              <div className="font-medium text-secondary-900">{exercise.name}</div>
              <div className="text-sm text-secondary-600">
                Last: {exercise.lastWeight} × {exercise.lastReps}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Workouts with Enhanced Click Handling */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-secondary-900 mb-4">
          <TrendingUp className="inline h-5 w-5 mr-2" />
          Recent Workouts
        </h3>
        
        <div className="space-y-3">
          {filteredWorkouts.slice(0, 10).map((workout) => (
            <div key={workout.id} className="border-2 border-secondary-200 rounded-lg bg-white">
              <div 
                className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-50"
                onClick={() => handleViewWorkout(workout)}
              >
                <div className="flex-1">
                  <div className="font-medium text-secondary-900 capitalize flex items-center">
                    {workout.focusArea || 'Unknown'} Day
                    <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded capitalize">
                      {workout.type || 'workout'}
                    </span>
                  </div>
                  <div className="text-sm text-secondary-600 flex items-center gap-3">
                   <span className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {format(getDisplayDate(workout.date), 'MMM d, yyyy')}
                    </span>
                    <span className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {workout.duration || 0}min
                    </span>
                    <span>{(workout.totalWeight || 0).toLocaleString()} lbs</span>
                  </div>
                  {workout.notes && (
                    <div className="text-xs text-secondary-500 mt-1 italic">
                      "{workout.notes}"
                    </div>
                  )}
                  {/* Exercise count */}
                  <div className="text-xs text-secondary-500 mt-1">
                    {workout.exercises?.length || 0} exercises • Rating: {workout.rating || 'N/A'}/10
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyWorkout(workout);
                      }}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                      title="Copy workout to plan"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShareWorkout(workout);
                      }}
                      className="p-1 text-green-600 hover:bg-green-100 rounded"
                      title="Share workout"
                    >
                      <Share className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditWorkout(workout);
                      }}
                      className="p-1 text-primary-600 hover:bg-primary-100 rounded"
                      title="Edit workout"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteWorkout(workout.id);
                      }}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                      title="Delete workout"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredWorkouts.length === 0 && (
          <div className="text-center text-secondary-600 py-6">
            No workouts in the selected time range.
          </div>
        )}
      </Card>
    </div>
  );
}
