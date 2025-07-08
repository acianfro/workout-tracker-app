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
      const docRef = await addDoc(collection(db, 'workouts'), {
        ...workoutData,
        userId: currentUser.uid,
        createdAt: new Date()
      });
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
    setCurrentWorkout,
    calculateAge,
    getLatestMeasurement,
    calculateTotalWeight
  };

  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  );
}
