
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BarChart3, 
  Car, 
  Building2, 
  Factory, 
  Compass, 
  Leaf, 
  Droplets,
  User,
  Settings,
  Shield
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const modules = [
  { name: 'Energy', path: '/energy', icon: <BarChart3 size={20} className="text-energy" /> },
  { name: 'Transport', path: '/transport', icon: <Car size={20} className="text-transport" /> },
  { name: 'Buildings', path: '/buildings', icon: <Building2 size={20} className="text-buildings" /> },
  { name: 'Industry', path: '/industry', icon: <Factory size={20} className="text-industry" /> },
  { name: 'Overarching', path: '/overarching', icon: <Compass size={20} className="text-overarching" /> },
  { name: 'Land', path: '/land', icon: <Leaf size={20} className="text-land" /> },
  { name: 'Water', path: '/water', icon: <Droplets size={20} className="text-water" /> },
];

const Header = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  
  return (
    <header className="border-b">
      <div className="container mx-auto flex flex-col">
        <div className="flex justify-between items-center py-3">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold">CLEWs-EU</span>
          </Link>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Shield className="mr-2 h-4 w-4" />
                <span>Admin</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <nav className="pb-1">
          <ul className="flex space-x-1">
            {modules.map((module) => (
              <li key={module.path}>
                <Link 
                  to={module.path} 
                  className={`module-link flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-accent ${currentPath === module.path ? 'bg-primary text-primary-foreground' : ''}`}
                >
                  {module.icon} 
                  <span className="ml-2">{module.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
