import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { School2, ChevronLeft } from 'lucide-react';

interface School {
  id: string;
  name: string;
}

interface SchoolPickerProps {
  schools: School[];
  email: string;
  password: string;
  onLogin: (schoolId: string) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export function SchoolPicker({ schools, email, password, onLogin, onBack, isLoading = false }: SchoolPickerProps) {
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');

  const handleLogin = () => {
    if (selectedSchoolId) {
      onLogin(selectedSchoolId);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <School2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Select Your School
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Your email is associated with multiple schools.
            <br />
            <span className="font-medium text-blue-600 dark:text-blue-400">{email}</span>
          </p>
        </div>

        <Card data-testid="school-picker-card">
          <CardHeader>
            <CardTitle className="text-center">Choose School</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label htmlFor="school-select" className="sr-only">
                Select school
              </label>
              <Select 
                value={selectedSchoolId} 
                onValueChange={setSelectedSchoolId}
                data-testid="select-school"
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select your school..." />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((school) => (
                    <SelectItem 
                      key={school.id} 
                      value={school.id}
                      data-testid={`school-option-${school.id}`}
                    >
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                className="flex-1"
                disabled={isLoading}
                data-testid="button-back"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                type="button"
                onClick={handleLogin}
                className="flex-1"
                disabled={!selectedSchoolId || isLoading}
                data-testid="button-continue-login"
              >
                {isLoading ? 'Signing in...' : 'Continue'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Can't find your school? Contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}