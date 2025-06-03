
import React, { useState } from 'react';
import { Link as LinkIcon, Plus, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';

const PublicationItem = ({ publication, editable = false }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="publication-card">
      <div className="flex justify-between">
        <h4 className="font-medium text-orcid-dark">{publication.title}</h4>
        <button 
          onClick={() => setExpanded(!expanded)} 
          className="text-gray-500 hover:text-gray-700"
        >
          {expanded ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>
      
      <p className="text-sm text-gray-600 mt-1">
        {publication.authors.map((author, i) => (
          <span key={i}>
            <Link 
              to={`/researcher/${author.orcidId}`} 
              className="hover:underline text-blue-600"
            >
              {author.name}
            </Link>
            {i < publication.authors.length - 1 ? ', ' : ''}
          </span>
        ))}
      </p>
      
      <div className="text-sm text-gray-500 mt-1">
        {publication.source}, {publication.year}
      </div>
      
      <div className="flex items-center mt-2">
        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded mr-2">
          {publication.identifier.type}: {publication.identifier.value}
        </span>
        {publication.project && (
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
            Projeto: {publication.project}
          </span>
        )}
      </div>
      
      {expanded && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <p className="text-sm mb-3">{publication.abstract}</p>
          
          <div className="space-y-2">
            <h5 className="text-sm font-medium">Links:</h5>
            {publication.links.map((link, index) => (
              <div key={index} className="flex items-center text-sm text-blue-600">
                <LinkIcon className="w-3 h-3 mr-1" />
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {link.name}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicationItem;
