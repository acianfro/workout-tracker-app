import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  setDoc,
  getDoc,
  getDocs, 
  addDoc, 
  query, 
  orderBy, 
  where,
  updateDoc,
  deleteDoc,
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';

const UserDataContext = createContext();

export function useUserData() {
  return useContext(UserDataContext);
}

export function UserDataProvider({ children }) {
  const { currentUser } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [currentWorkout, setCurrentWorkout] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load user data when user changes
  useEffect(() => {
    if (currentUser) {
      loadUserData();
    } else {
      setUserProfile(null);
      setMeasurements([]);
      setWorkouts([]);
      setCurrentWorkout(null);
    }
  }, [currentUser]);

async function loadUserData() {
  if (!currentUser) return;
  
  setLoading(true);
  try {
    // Load user profile using direct document reference
    const userDocRef = doc(db, 'users', currentUser.uid);
    const userDocSnap = await getDoc(userDocRef);
    
    if (userDocSnap.exists()) {
      console.log('Profile found:', userDocSnap.data());
      setUserProfile({ id: currentUser.uid, ...userDocSnap.data() });
    } else {
      console.log('No user profile found');
      setUserProfile(null); // null indicates no profile exists
    }

    // Set up real-time listeners
    setupMeasurementsListener();
    setupWorkoutsListener();
  } catch (error) {
    console.error('Error loading user data:', error);
    setUserProfile(null);
  } finally {
    setLoading(false);
  }
}

  function setupMeasurementsListener() {
    if (!currentUser) return;

    const measurementsQuery = query(
      collection(db, 'measurements'),
      where('userId', '==', currentUser.uid),
      orderBy('date', 'desc')
    );

    return onSnapshot(measurementsQuery, (snapshot) => {
      const measurementsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMeasurements(measurementsList);
    });
  }

  function setupWorkoutsListener() {
    if (!currentUser) return;

    const workoutsQuery = query(
      collection(db, 'workouts'),
      where('userId', '==', currentUser.uid),
      orderBy('date', 'desc')
    );

    return onSnapshot(workoutsQuery, (snapshot) => {
      const workoutsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setWorkouts(workoutsList);
    });
  }

async function updateUserProfile(profileData) {
  if (!currentUser) return;

  try {
    // Use setDoc with merge: true to create or update the document
    await setDoc(doc(db, 'users', currentUser.uid), profileData, { merge: true });
    setUserProfile(prev => ({ ...prev, ...profileData }));
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
}

async function addMeasurement(measurementData) {
  if (!currentUser) return;

  try {
    // Ensure all required fields are present
    const dataToSave = {
      ...measurementData,
      userId: currentUser.uid,
      createdAt: new Date(),
      // Convert date to Firestore timestamp if it's a string
      date: measurementData.date instanceof Date ? measurementData.date : new Date(measurementData.date)
    };
    
    console.log('Saving measurement data:', dataToSave); // Debug log
    
    const docRef = await addDoc(collection(db, 'measurements'), dataToSave);
    console.log('Measurement saved with ID:', docRef.id); // Debug log
    return docRef.id;
  } catch (error) {
    console.error('Error adding measurement:', error);
    throw error;
  }
}

async function updateMeasurement(measurementId, measurementData) {
  if (!currentUser) return;

  try {
    await updateDoc(doc(db, 'measurements', measurementId), {
      ...measurementData,
      updatedAt: new Date()
    });
    console.log('Measurement updated successfully');
  } catch (error) {
    console.error('Error updating measurement:', error);
    throw error;
  }
}

async function deleteMeasurement(measurementId) {
  if (!currentUser) return;

  try {
    await deleteDoc(doc(db, 'measurements', measurementId));
    console.log('Measurement deleted successfully');
  } catch (error) {
    console.error('Error deleting measurement:', error);
    throw error;
  }
}  

  async function saveWorkout(workoutData) {
    if (!currentUser) return;

    try {
      // Ensure date is properly formatted
      const workoutToSave = {
        ...workoutData,
        userId: currentUser.uid,
        createdAt: new Date()
      };

      // Handle date conversion properly
      if (workoutData.date) {
        if (workoutData.date instanceof Date) {
          workoutToSave.date = workoutData.date;
        } else {
          workoutToSave.date = new Date(workoutData.date);
        }
      } else {
        workoutToSave.date = new Date();
      }

      console.log('Saving workout with date:', workoutToSave.date);
      
      const docRef = await addDoc(collection(db, 'workouts'), workoutToSave);
      return docRef.id;
    } catch (error) {
      console.error('Error saving workout:', error);
      throw error;
    }
  }

async function updateWorkout(workoutId, workoutData) {
  if (!currentUser) return;

  try {
    await updateDoc(doc(db, 'workouts', workoutId), {
      ...workoutData,
      updatedAt: new Date()
    });
    console.log('Workout updated successfully');
  } catch (error) {
    console.error('Error updating workout:', error);
    throw error;
  }
}

async function deleteWorkout(workoutId) {
  if (!currentUser) return;

  try {
    await deleteDoc(doc(db, 'workouts', workoutId));
    console.log('Workout deleted successfully');
  } catch (error) {
    console.error('Error deleting workout:', error);
    throw error;
  }
}

async function saveScheduledWorkout(workoutData) {
  if (!currentUser) return;

  try {
    const docRef = await addDoc(collection(db, 'scheduledWorkouts'), {
      ...workoutData,
      userId: currentUser.uid,
      createdAt: new Date(),
      status: 'scheduled'
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving scheduled workout:', error);
    throw error;
  }
}

async function getScheduledWorkouts() {
  if (!currentUser) return [];

  try {
    const workoutsQuery = query(
      collection(db, 'scheduledWorkouts'),
      where('userId', '==', currentUser.uid),
      where('status', '==', 'scheduled'),
      orderBy('date', 'asc')
    );
    const workoutsSnapshot = await getDocs(workoutsQuery);
    
    return workoutsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error loading scheduled workouts:', error);
    return [];
  }
}

async function deleteScheduledWorkout(workoutId) {
  if (!currentUser) return;

  try {
    await deleteDoc(doc(db, 'scheduledWorkouts', workoutId));
    console.log('Scheduled workout deleted successfully');
  } catch (error) {
    console.error('Error deleting scheduled workout:', error);
    throw error;
  }
}

async function startScheduledWorkout(scheduledWorkout) {
  if (!currentUser) return;

  try {
    // Mark the scheduled workout as started
    await updateDoc(doc(db, 'scheduledWorkouts', scheduledWorkout.id), {
      status: 'started',
      startedAt: new Date()
    });
    
    // Return the workout data for the active workout
    return {
      ...scheduledWorkout,
      startTime: new Date(),
      status: 'active'
    };
  } catch (error) {
    console.error('Error starting scheduled workout:', error);
    throw error;
  }
}

async function deleteExercise(exerciseId) {
  if (!currentUser) return;

  try {
    await deleteDoc(doc(db, 'exercises', exerciseId));
    console.log('Exercise deleted successfully');
  } catch (error) {
    console.error('Error deleting exercise:', error);
    throw error;
  }
}

  // Calculate age from date of birth
  function calculateAge(dateOfBirth) {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  // Get latest measurement by type
  function getLatestMeasurement(type = 'weight') {
    const filtered = measurements.filter(m => m[type] != null);
    return filtered.length > 0 ? filtered[0] : null;
  }

// Calculate total weight lifted in a workout (excluding cardio)
function calculateTotalWeight(exercises) {
  return exercises.reduce((total, exercise) => {
    // Skip cardio exercises in weight calculation
    if (exercise.isCardio || exercise.category === 'cardio') {
      return total;
    }
    
    return total + exercise.sets.reduce((setTotal, set) => {
      // Use actual values first, then fall back to planned values
      const weight = parseFloat(set.actualWeight || set.weight) || 0;
      const reps = parseInt(set.actualReps || set.reps) || 0;
      return setTotal + (weight * reps);
    }, 0);
  }, 0);
}

// NEW EXERCISE HISTORY FUNCTIONS

// Get exercise history for a specific exercise name
function getExerciseHistory(exerciseName, limit = 4) {
  if (!exerciseName || !workouts.length) return [];
  
  // Filter workouts that contain the exercise and are completed
  const workoutsWithExercise = workouts
    .filter(workout => 
      workout.status === 'completed' && 
      workout.exercises && 
      workout.exercises.some(ex => ex.name === exerciseName)
    )
    .slice(0, limit); // Get most recent instances (workouts are already ordered by date desc)
  
  // Extract exercise data from each workout
  return workoutsWithExercise.map(workout => {
    const exercise = workout.exercises.find(ex => ex.name === exerciseName);
    return {
      workoutId: workout.id,
      date: workout.date || workout.createdAt,
      exercise: exercise,
      sets: exercise.sets || [],
      isCardio: exercise.isCardio,
      category: exercise.category
    };
  });
}

// Calculate exercise volume for comparison
function calculateExerciseVolume(exerciseData) {
  if (!exerciseData || !exerciseData.sets) return 0;
  
  const { sets, isCardio, category } = exerciseData;
  
  // For cardio exercises, don't calculate volume (return 0 for comparison purposes)
  if (isCardio || category === 'cardio') {
    return 0;
  }
  
  return sets.reduce((total, set) => {
    // Use actual values first, then fall back to planned values
    const weight = parseFloat(set.actualWeight || set.weight) || 0;
    const reps = parseInt(set.actualReps || set.reps) || 0;
    
    // For bodyweight exercises, don't multiply by weight if weight is 0 or "BW"
    if (weight === 0 || set.weight === 'BW' || set.actualWeight === 'BW') {
      return total + reps;
    }
    
    return total + (weight * reps);
  }, 0);
}

// Get progress indicator for an exercise based on history
function getExerciseProgressIndicator(exerciseName) {
  const history = getExerciseHistory(exerciseName, 2); // Get last 2 instances
  
  if (history.length < 2) {
    return { type: 'first-time', icon: '✨', text: 'First Time!' };
  }
  
  const currentVolume = calculateExerciseVolume(history[0]);
  const previousVolume = calculateExerciseVolume(history[1]);
  
  // For cardio exercises, show neutral since we don't calculate volume
  if (history[0].isCardio) {
    return { type: 'neutral', icon: '➡️', text: 'Track Progress', color: 'text-gray-600' };
  }
  
  // Calculate percentage change (with 5% tolerance for "maintaining")
  const percentChange = previousVolume > 0 ? ((currentVolume - previousVolume) / previousVolume) * 100 : 0;
  
  if (percentChange > 5) {
    return { 
      type: 'progress', 
      icon: '🟢 ↗️', 
      text: 'Progressing', 
      color: 'text-green-600',
      change: `+${Math.round(percentChange)}%`
    };
  } else if (percentChange < -5) {
    return { 
      type: 'decline', 
      icon: '🔴 ↘️', 
      text: 'Declining', 
      color: 'text-red-600',
      change: `${Math.round(percentChange)}%`
    };
  } else {
    return { 
      type: 'maintaining', 
      icon: '🟡 ➡️', 
      text: 'Maintaining', 
      color: 'text-yellow-600',
      change: percentChange > 0 ? `+${Math.round(percentChange)}%` : `${Math.round(percentChange)}%`
    };
  }
}

// Format sets for display in history
function formatSetsForDisplay(sets, isCardio = false) {
  if (!sets || !sets.length) return 'No sets recorded';
  
  if (isCardio) {
    return sets.map(set => {
      const distance = set.actualDistance || set.distance || '0';
      const duration = set.actualDuration || set.duration || '0';
      return `${duration}min × ${distance}mi`;
    }).join(', ');
  }
  
  return sets.map(set => {
    const weight = set.actualWeight || set.weight || '0';
    const reps = set.actualReps || set.reps || '0';
    return `${weight}×${reps}`;
  }).join(', ');
}

// Get formatted exercise history for display
function getFormattedExerciseHistory(exerciseName, limit = 4) {
  const history = getExerciseHistory(exerciseName, limit);
  
  return history.map(entry => ({
    date: entry.date,
    dateString: entry.date ? new Date(entry.date.seconds ? entry.date.seconds * 1000 : entry.date).toLocaleDateString() : 'Unknown date',
    sets: formatSetsForDisplay(entry.sets, entry.isCardio),
    volume: calculateExerciseVolume(entry),
    isCardio: entry.isCardio,
    rawSets: entry.sets
  }));
}

  const value = {
    userProfile,
    measurements,
    workouts,
    currentWorkout,
    loading,
    updateUserProfile,
    addMeasurement,
    updateMeasurement,
    deleteMeasurement,
    saveWorkout,
    updateWorkout,
    deleteWorkout,
    saveScheduledWorkout,
    getScheduledWorkouts,
    deleteScheduledWorkout,
    startScheduledWorkout,
    deleteExercise,
    setCurrentWorkout,
    calculateAge,
    getLatestMeasurement,
    calculateTotalWeight,
    // New exercise history functions
    getExerciseHistory,
    calculateExerciseVolume,
    getExerciseProgressIndicator,
    formatSetsForDisplay,
    getFormattedExerciseHistory
  };

  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  );
}
