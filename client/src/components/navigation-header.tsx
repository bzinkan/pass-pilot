import { Bell, ChevronDown, IdCard } from "lucide-react";

interface NavigationHeaderProps {
  currentUser?: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  onRoleToggle: (role: 'teacher' | 'student') => void;
  activeRole: 'teacher' | 'student';
}

export default function NavigationHeader({ 
  currentUser = { 
    id: "1", 
    firstName: "John", 
    lastName: "Smith", 
    role: "teacher" 
  },
  onRoleToggle,
  activeRole 
}: NavigationHeaderProps) {
  const initials = `${currentUser.firstName[0]}${currentUser.lastName[0]}`;
  const fullName = `${currentUser.firstName} ${currentUser.lastName}`;

  return (
    <>
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <IdCard className="text-hall-primary text-2xl" size={28} />
              </div>
              <h1 className="text-xl font-semibold text-gray-900" data-testid="app-title">
                Hallway Pass Manager
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <button 
                  className="p-2 text-gray-400 hover:text-gray-600 relative" 
                  data-testid="button-notifications"
                >
                  <Bell className="text-lg" size={20} />
                  <span className="absolute -top-1 -right-1 bg-hall-danger text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    3
                  </span>
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-hall-primary rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm" data-testid="text-user-initials">
                    {initials}
                  </span>
                </div>
                <span className="hidden sm:block text-sm font-medium text-gray-700" data-testid="text-user-name">
                  {fullName}
                </span>
                <button className="text-gray-400 hover:text-gray-600" data-testid="button-user-menu">
                  <ChevronDown className="text-sm" size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Role Toggle for Demo */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-center space-x-4">
            <span className="text-sm font-medium text-gray-700">View as:</span>
            <button 
              onClick={() => onRoleToggle('teacher')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeRole === 'teacher' 
                  ? 'bg-hall-primary text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              data-testid="button-teacher-view"
            >
              Teacher
            </button>
            <button 
              onClick={() => onRoleToggle('student')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeRole === 'student' 
                  ? 'bg-hall-primary text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              data-testid="button-student-view"
            >
              Student
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
