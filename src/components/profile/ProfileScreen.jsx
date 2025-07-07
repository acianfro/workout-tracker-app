import React, { useState, useEffect } from 'react';
import { useUserData } from '../../contexts/UserDataContext';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { Plus, Calendar, LogOut, User } from 'lucide-react';
import { format } from 'date-fns';

export default function ProfileScreen() {
  const { currentUser, logout } = useAuth();
  const { 
    userProfile, 
    measurements, 
    updateUserProfile, 
    addMeasurement, 
    calculateAge,
    getLatestMeasurement 
  } = useUserData();
  
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showMeasurementForm, setShowMeasurementForm] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    dateOfBirth: '',
    height: '',
    targetWeight: '',
    targetBodyFat: ''
  });
  const [measurementData, setMeasurementData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    weight: '',
    bodyFat: '',
    muscleMass: '',
    boneDensity: '',
    source: 'Scale',
    notes: ''
  });

  useEffect(() => {
    if (userProfile) {
      setProfileData({
        name: userProfile.name || '',
        dateOfBirth: userProfile.dateOfBirth || '',
        height: userProfile.height || '',
        targetWeight: userProfile.targetWeight || '',
        targetBodyFat: userProfile.targetBodyFat || ''
      });
    } else {
      setShowProfileForm(true);
    }
  }, [userProfile]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateUserProfile(profileData);
      setShowProfileForm(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleMeasurementSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSave = {
        date: new Date(measurementData.date),
        ...Object.fromEntries(
          Object.entries(measurementData)
            .filter(([key, value]) => key !== 'date' && value !== '')
            .map(([key, value]) => [key, key === 'source' || key === 'notes' ? value : parseFloat(value)])
        )
      };
      
      await addMeasurement(dataToSave);
      setShowMeasurementForm(false);
      setMeasurementData({
        date: format(new Date(), 'yyyy-MM-dd'),
        weight: '',
        bodyFat: '',
        muscleMass: '',
        boneDensity: '',
        source: 'Scale',
        notes: ''
      });
    } catch (error) {
      console.error('Error adding measurement:', error);
    }
  };

  if (showProfileForm) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <Card className="p-6">
          <h2 className="text-xl font-bold text-secondary-900 mb-6 text-center">Profile Setup</h2>
          
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <Input
              placeholder="Name"
              value={profileData.name}
              onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="date"
                placeholder="Date of Birth"
                value={profileData.dateOfBirth}
                onChange={(e) => setProfileData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
              />
              <Input
                placeholder="Height (in)"
                value={profileData.height}
                onChange={(e) => setProfileData(prev => ({ ...prev, height: e.target.value }))}
              />
            </div>
            
            <Input
              placeholder="Target Weight (lbs)"
              value={profileData.targetWeight}
              onChange={(e) => setProfileData(prev => ({ ...prev, targetWeight: e.target.value }))}
            />
            
            <Input
              placeholder="Target Body Fat %"
              value={profileData.targetBodyFat}
              onChange={(e) => setProfileData(prev => ({ ...prev, targetBodyFat: e.target.value }))}
            />
            
            <Button type="submit" className="w-full">
              Save Profile
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  if (showMeasurementForm) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <Card className="p-6">
          <h2 className="text-xl font-bold text-secondary-900 mb-6 text-center">Add Measurement</h2>
          
          <form onSubmit={handleMeasurementSubmit} className="space-y-4">
            <Input
              type="date"
              value={measurementData.date}
              onChange={(e) => setMeasurementData(prev => ({ ...prev, date: e.target.value }))}
              required
            />
            
            <div className="text-sm text-secondary-600 mb-2">Body Measurements</div>
            <Input
              placeholder="Weight (lbs)"
              value={measurementData.weight}
              onChange={(e) => setMeasurementData(prev => ({ ...prev, weight: e.target.value }))}
            />
            
            <div className="text-sm text-secondary-600 mb-2">Body Composition (Optional)</div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Body Fat %"
                value={measurementData.bodyFat}
                onChange={(e) => setMeasurementData(prev => ({ ...prev, bodyFat: e.target.value }))}
              />
              <Input
                placeholder="Muscle Mass"
                value={measurementData.muscleMass}
                onChange={(e) => setMeasurementData(prev => ({ ...prev, muscleMass: e.target.value }))}
              />
            </div>
            
            <Input
              placeholder="Bone Density"
              value={measurementData.boneDensity}
              onChange={(e) => setMeasurementData(prev => ({ ...prev, boneDensity: e.target.value }))}
            />
            
            <div className="text-sm text-secondary-600 mb-2">Measurement Source</div>
            <select
              className="w-full px-4 py-3 border-2 border-primary-300 rounded-lg focus:border-primary-500 focus:outline-none"
              value={measurementData.source}
              onChange={(e) => setMeasurementData(prev => ({ ...prev, source: e.target.value }))}
            >
              <option value="Scale">Scale</option>
              <option value="DEXA">DEXA</option>
              <option value="InBody">InBody</option>
              <option value="Other">Other</option>
            </select>
            
            <Input
              placeholder="Notes (optional)"
              value={measurementData.notes}
              onChange={(e) => setMeasurementData(prev => ({ ...prev, notes: e.target.value }))}
            />
            
            <div className="flex gap-3">
              <Button type="submit" className="flex-1">
                Save Measurement
              </Button>
              <Button 
                type="button" 
                variant="secondary" 
                className="flex-1"
                onClick={() => setShowMeasurementForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  const latestWeight = getLatestMeasurement('weight');
  const latestBodyFat = getLatestMeasurement('bodyFat');
  const age = calculateAge(userProfile?.dateOfBirth);

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-secondary-900">Profile</h1>
        <Button variant="secondary" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>

      {/* Profile Dashboard */}
      <Card className="p-6 text-center">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="h-8 w-8 text-primary-600" />
        </div>
        
        <h2 className="text-lg font-bold text-secondary-900">
          {userProfile?.name}{age && `, ${age} years old`}
        </h2>
        
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-primary-50 border-2 border-primary-200 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-secondary-900">
              {latestWeight?.weight || '--'} lbs
            </div>
            <div className="text-sm text-secondary-600">Current Weight</div>
          </div>
          <div className="bg-primary-50 border-2 border-primary-200 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-secondary-900">
              {latestBodyFat?.bodyFat || '--'}%
            </div>
            <div className="text-sm text-secondary-600">Body Fat</div>
          </div>
        </div>
        
        {latestWeight && (
          <div className="text-sm text-secondary-600 mt-4">
            Latest: {format(latestWeight.date.toDate(), 'MMM d, yyyy')}
          </div>
        )}
        
        <div className="mt-6 space-y-3">
          <Button 
            onClick={() => setShowMeasurementForm(true)}
            className="w-full flex items-center justify-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Measurement
          </Button>
          
          <Button 
            variant="secondary" 
            onClick={() => setShowProfileForm(true)}
            className="w-full"
          >
            Edit Profile
          </Button>
        </div>
      </Card>

      {/* Recent Measurements */}
      {measurements.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-secondary-900 mb-4">Recent Measurements</h3>
          <div className="space-y-3">
            {measurements.slice(0, 3).map((measurement) => (
              <div key={measurement.id} className="flex justify-between items-center p-3 border-2 border-secondary-200 rounded-lg bg-white">
                <div className="font-bold text-secondary-900">
                  {measurement.weight} lbs
                </div>
                <div className="text-sm text-secondary-600">
                  {format(measurement.date.toDate(), 'MMM d')} • {measurement.source}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
