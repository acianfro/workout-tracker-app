import React, { useState, useEffect } from 'react';
import { useUserData } from '../../contexts/UserDataContext';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { Calendar, Clock, Play, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';

export default function ScheduledWorkoutsScreen() {
  const { 
    getScheduledWorkouts, 
    deleteScheduledWorkout, 
    startScheduledWorkout, 
    setCurrentWorkout 
  } = useUserData();
  const navigate = useNavigate();
  const [scheduledWorkouts, setScheduledWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScheduledWorkouts();
  }, []);

  const loadScheduledWorkouts = async () => {
    try {
      const workouts = await getScheduledWorkouts();
      setScheduledWorkouts(workouts);
    } catch (error) {
      console.error('Error loading scheduled workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartWorkout = async (scheduledWorkout) => {
    try {
      const activeWorkout = await startScheduledWorkout(scheduledWorkout);
      setCurrentWorkout(activeWorkout);
      navigate('/workout');
    } catch (error) {
      console.error('Error starting scheduled workout:', error);
      alert('Error starting workout: ' + error.message);
    }
  };

  const handleDeleteWorkout = async (workoutId) => {
    if (confirm('Are you sure you want to delete this scheduled workout?')) {
      try {
        await deleteScheduledWorkout(workoutId);
        await loadScheduledWorkouts(); // Refresh the list
      } catch (error) {
        console.error('Error deleting scheduled workout:', error);
        alert('Error deleting workout: ' + error.message);
      }
    }
  };

  const getDateLabel = (date) => {
    let workoutDate;
    if (date?.toDate) {
      workoutDate = date.toDate();
    } else if (date instanceof Date) {
      workoutDate = date;
    } else {
      workoutDate = new Date(date);
    }
    
    // Create comparison dates at start of day in local timezone
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const workoutDateStart = new Date(workoutDate);
    workoutDateStart.setHours(0, 0, 0, 0);
    
    if (workoutDateStart.getTime() === today.getTime()) return 'Today';
    if (workoutDateStart.getTime() === tomorrow.getTime()) return 'Tomorrow';
    if (workoutDateStart < today) return 'Past Due';
    
    const diffTime = workoutDateStart - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7) return format(workoutDate, 'EEEE'); // Monday, Tuesday, etc.
    return format(workoutDate, 'MMM d, yyyy');
  };

  const getDateColor = (date) => {
    let workoutDate;
    if (date?.toDate) {
      workoutDate = date.toDate();
    } else if (date instanceof Date) {
      workoutDate = date;
    } else {
      workoutDate = new Date(date);
    }
    
    // Create comparison dates at start of day in local timezone
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const workoutDateStart = new Date(workoutDate);
    workoutDateStart.setHours(0, 0, 0, 0);
    
    if (workoutDateStart.getTime() === today.getTime()) return 'text-green-600 bg-green-100';
    if (workoutDateStart.getTime() === tomorrow.getTime()) return 'text-blue-600 bg-blue-100';
    if (workoutDateStart < today) return 'text-red-600 bg-red-100';
    return 'text-secondary-600 bg-secondary-100';
  };

  // Group workouts by date
  const groupedWorkouts = scheduledWorkouts.reduce((groups, workout) => {
    const workoutDate = workout.date?.toDate ? workout.date.toDate() : new Date(workout.date);
    const dateKey = format(workoutDate, 'yyyy-MM-dd');
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(workout);
    return groups;
  }, {});

  const sortedDateKeys = Object.keys(groupedWorkouts).sort();

  if (loading) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <div className="text-center py-8">
          <div className="text-secondary-600">Loading scheduled workouts...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-secondary-900">Scheduled Workouts</h1>
        <Button 
          onClick={() => navigate('/plan')}
          size="sm"
        >
          Plan New
        </Button>
      </div>

      {scheduledWorkouts.length === 0 ? (
        <Card className="p-8 text-center">
          <Calendar className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-secondary-900 mb-2">No Scheduled Workouts</h3>
          <p className="text-secondary-600 mb-4">
            Plan your workouts in advance to stay on track with your fitness goals.
          </p>
          <Button onClick={() => navigate('/plan')}>
            Schedule Your First Workout
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedDateKeys.map(dateKey => (
            <div key={dateKey}>
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-3 ${getDateColor(groupedWorkouts[dateKey][0].date)}`}>
                {getDateLabel(groupedWorkouts[dateKey][0].date)}
              </div>
              
              <div className="space-y-3">
                {groupedWorkouts[dateKey].map((workout) => (
                  <Card key={workout.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-secondary-900 capitalize flex items-center">
                          {workout.focusArea} Day
                          <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded capitalize">
                            {workout.type}
                          </span>
                        </div>
                        
                        <div className="text-sm text-secondary-600 mt-1">
                          {workout.exercises?.length || 0} exercises planned
                        </div>
                        
                        {workout.notes && (
                          <div className="text-xs text-secondary-500 mt-2 italic">
                            "{workout.notes}"
                          </div>
                        )}
                        
                        <div className="text-xs text-secondary-500 mt-2">
                          Motivation: {workout.motivation}/10
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          onClick={() => handleStartWorkout(workout)}
                          className="flex items-center"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Start
                        </Button>
                        
                        <button
                          onClick={() => handleDeleteWorkout(workout.id)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                          title="Delete workout"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Exercise Preview */}
                    {workout.exercises && workout.exercises.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-secondary-200">
                        <div className="text-xs text-secondary-600 mb-2">Exercises:</div>
                        <div className="flex flex-wrap gap-1">
                          {workout.exercises.slice(0, 3).map((exercise, index) => (
                            <span 
                              key={index}
                              className="text-xs bg-secondary-100 text-secondary-700 px-2 py-1 rounded"
                            >
                              {exercise.name}
                            </span>
                          ))}
                          {workout.exercises.length > 3 && (
                            <span className="text-xs text-secondary-500">
                              +{workout.exercises.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
          
          <div className="text-center py-4">
            <Button 
              onClick={() => navigate('/plan')}
              variant="secondary"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Another Workout
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
