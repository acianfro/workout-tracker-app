import React, { useState, useMemo } from 'react';
import { useUserData } from '../../contexts/UserDataContext';
import Card from '../ui/Card';
import Input from '../ui/Input';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, subWeeks, subMonths, isAfter } from 'date-fns';

export default function ProgressScreen() {
  const { workouts, measurements } = useUserData();
  const [timeRange, setTimeRange] = useState('week');
  const [searchTerm, setSearchTerm] = useState('');

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
            exerciseMap.set(exercise.name, {
              name: exercise.name,
              lastWeight: exercise.sets?.find(s => s.actualWeight)?.actualWeight || 
                         exercise.sets?.find(s => s.weight)?.weight || 'BW',
              lastReps: exercise.sets?.find(s => s.actualReps)?.actualReps || 
                       exercise.sets?.find(s => s.reps)?.reps || '--',
              date: workout.date
            });
          }
        }
      });
    });
    
    return Array.from(exerciseMap.values());
  }, [workouts, searchTerm]);

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

      {/* Recent Workouts */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-secondary-900 mb-4">Recent Workouts</h3>
        
        <div className="space-y-3">
          {filteredWorkouts.slice(0, 5).map((workout) => (
            <div key={workout.id} className="flex justify-between items-center p-3 border-2 border-secondary-200 rounded-lg bg-white">
              <div>
                <div className="font-medium text-secondary-900 capitalize">
                  {workout.focusArea} Day
                </div>
                <div className="text-sm text-secondary-600">
                  {format(workout.date?.toDate ? workout.date.toDate() : new Date(workout.date), 'MMM d')} • 
                  {workout.duration}min • 
                  {(workout.totalWeight || 0).toLocaleString()} lbs
                </div>
              </div>
              <div className="text-sm text-secondary-600">
                {workout.rating}/10
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
