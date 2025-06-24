import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home,
  User, 
  FileText, 
  Briefcase, 
  Search as SearchIcon, 
  Settings, 
  LogIn,
  LogOut,
  UserCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Researcher } from '../types';

interface NavigationProps {
  isAuthenticated?: boolean;
  onLogout?: () => void;
  researcher?: Researcher | null;
}

const Navigation: React.FC<NavigationProps> = ({ 
  isAuthenticated = false, 
  onLogout,
  researcher 
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/profile', label: 'Perfil', icon: User, requireAuth: true },
    { path: '/publications', label: 'Publicações', icon: FileText, requireAuth: true },
    { path: '/projects', label: 'Projetos', icon: Briefcase, requireAuth: true },
    { path: '/search', label: 'Buscar', icon: SearchIcon },
    { path: '/edit-profile', label: 'Editar Perfil', icon: Settings, requireAuth: true },
  ];

  const handleNavClick = (item: typeof navItems[0], e: React.MouseEvent) => {
    if (item.requireAuth && !isAuthenticated) {
      e.preventDefault();
      navigate('/login');
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <div className="bg-blue-600 text-white p-1 rounded">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-8a1 1 0 0 0 2 0V7a1 1 0 0 0-2 0v5zm1-8.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" fill="currentColor"/>
                </svg>
              </div>
              <span className="ml-2 text-xl font-bold text-blue-800">ORCID++</span>
            </Link>
          </div>
          
          <div className="hidden md:flex space-x-4">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link 
                  key={item.path} 
                  to={item.path}
                  onClick={(e) => handleNavClick(item, e)}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                    isActive 
                      ? 'text-blue-600 bg-blue-50' 
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <IconComponent className="h-4 w-4 mr-1" />
                  {item.label}
                </Link>
              );
            })}
          </div>
          
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <UserCircle className="h-5 w-5" />
                    <span className="hidden sm:inline-block">
                      {researcher?.name?.split(' ')[0] || 'Usuário'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {researcher?.name || 'Usuário'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {researcher?.orcidId || ''}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      <span>Meu Perfil</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/edit-profile" className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Configurações</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="flex items-center text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link 
                to="/login" 
                className="flex items-center text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                <LogIn className="h-4 w-4 mr-1" />
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile navigation */}
      <div className="md:hidden border-t border-gray-200">
        <div className={`grid gap-1 ${navItems.length <= 4 ? 'grid-cols-4' : 'grid-cols-6'}`}>
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={(e) => handleNavClick(item, e)}
                className={`flex flex-col items-center py-2 px-1 ${
                  isActive ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'
                }`}
              >
                <IconComponent className="h-5 w-5" />
                <span className="text-xs mt-1 text-center leading-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;