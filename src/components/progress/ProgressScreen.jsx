import React, { useState, useMemo } from 'react';
import { useUserData } from '../../contexts/UserDataContext';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, subWeeks, subMonths, isAfter } from 'date-fns';
import { Edit, Trash2, X, Calendar, Clock, TrendingUp } from 'lucide-react';

export default function ProgressScreen() {
  const { workouts, measurements, updateWorkout, deleteWorkout } = useUserData();
  const [timeRange, setTimeRange] = useState('week');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingWorkout, setEditingWorkout] = useState(null);
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

  // Filter workouts by date range
  const filteredWorkouts = useMemo(() => {
    const startDate = getDateRange();
    return workouts.filter(workout => {
      const workoutDate = workout.date?.toDate ? workout.date.toDate() : new Date(workout.date);
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
      const measurementDate = m.date?.toDate ? m.date.toDate() : new Date(m.date);
      return isAfter(measurementDate, startDate) && m.weight;
    });

    return filteredMeasurements
      .slice(0, 10) // Limit to 10 most recent
      .reverse()
      .map(m => ({
        date: format(m.date?.toDate ? m.date.toDate() : new Date(m.date), 'MMM d'),
        weight: m.weight
      }));
  }, [measurements, timeRange]);

  // Prepare chart data for workout volume
  const volumeChartData = useMemo(() => {
    return filteredWorkouts
      .slice(0, 10)
      .reverse()
      .map(workout => ({
        date: format(workout.date?.toDate ? workout.date.toDate() : new Date(workout.date), 'MMM d'),
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

  const handleEditWorkout = (workout) => {
    setEditingWorkout(workout.id);
    setEditWorkoutData({
      date: format(workout.date?.toDate ? workout.date.toDate() : new Date(workout.date), 'yyyy-MM-dd'),
      type: workout.type || 'hypertrophy',
      focusArea: workout.focusArea || 'push',
      motivation: workout.motivation || 5,
      rating: workout.rating || 5,
      duration: workout.duration || 0,
      notes: workout.notes || '',
      exercises: workout.exercises || []
    });
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

  const handleDeleteWorkout = async (workoutId) => {
    if (confirm('Are you sure you want to delete this workout? This action cannot be undone.')) {
      try {
        await deleteWorkout(workoutId);
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

  if (editingWorkout) {
    return (
      <div className="p-4 max-w-md mx-auto">
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
              
              <div className="flex gap-3 pt-4">
                <Button 
                  type="submit"
                  className="flex-1"
                >
                  Save Changes
                </Button>
                <Button 
                  type="button"
                  onClick={cancelEdit}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </form>
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

      {/* Recent Workouts with Edit/Delete */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-secondary-900 mb-4">
          <TrendingUp className="inline h-5 w-5 mr-2" />
          Recent Workouts
        </h3>
        
        <div className="space-y-3">
          {filteredWorkouts.slice(0, 10).map((workout) => {
            // Debug logging - remove after fixing
            console.log('Displaying workout:', workout);
            
            return (
              <div key={workout.id} className="border-2 border-secondary-200 rounded-lg bg-white">
                <div className="flex justify-between items-center p-3">
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
                        {format(workout.date?.toDate ? workout.date.toDate() : new Date(workout.date), 'MMM d')}
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
                        onClick={() => handleEditWorkout(workout)}
                        className="p-1 text-primary-600 hover:bg-primary-100 rounded"
                        title="Edit workout"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteWorkout(workout.id)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                        title="Delete workout"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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
