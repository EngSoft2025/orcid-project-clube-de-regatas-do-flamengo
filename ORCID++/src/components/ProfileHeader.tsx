
import React from 'react';
import { Card } from '@/components/ui/card';
import { Researcher } from '../types';

interface ProfileHeaderProps {
  researcher: Researcher;
}

const ProfileHeader = ({ researcher }: ProfileHeaderProps) => {
  return (
    <Card className="p-6 flex flex-col md:flex-row items-start md:items-center gap-4 bg-white border-blue-100">
      <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
        {researcher.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
      </div>
      
      <div className="flex-1">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-blue-800">{researcher.name}</h1>
            <p className="text-blue-600">{researcher.institution}</p>
            {researcher.department && <p className="text-gray-600">{researcher.department}</p>}
          </div>
          <div className="flex items-center bg-blue-500 px-3 py-1 rounded text-white">
            <span className="mr-2">ORCID:</span>
            <a href={`https://orcid.org/${researcher.orcidId}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {researcher.orcidId}
            </a>
          </div>
        </div>
        
        <div className="mt-4">
          <p className="text-gray-700">{researcher.bio}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {researcher.researchAreas.map((area, index) => (
              <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm">
                {area}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ProfileHeader;
